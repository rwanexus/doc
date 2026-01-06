import { get } from "@vercel/edge-config";
import { ProcessingStatus } from "@prisma/client";
import { parsePageId } from "notion-utils";

import { DocumentData } from "@/lib/documents/create-document";
import { copyFileToBucketServer } from "@/lib/files/copy-file-to-bucket-server";
import notion from "@/lib/notion";
import { getNotionPageIdFromSlug } from "@/lib/notion/utils";
import prisma from "@/lib/prisma";
import { getExtension, log } from "@/lib/utils";
import { sendDocumentCreatedWebhook } from "@/lib/webhook/triggers/document-created";
import { sendLinkCreatedWebhook } from "@/lib/webhook/triggers/link-created";

// Check if Trigger.dev is configured
const TRIGGER_ENABLED = !!process.env.TRIGGER_SECRET_KEY;

// Dynamically import Trigger.dev tasks only if enabled
let convertFilesToPdfTask: any;
let convertPdfToImageRoute: any;
let processVideo: any;
let convertKeynoteToPdfTask: any;
let convertCadToPdfTask: any;
let conversionQueue: any;

if (TRIGGER_ENABLED) {
  Promise.all([
    import("@/lib/trigger/convert-files").then(m => {
      convertFilesToPdfTask = m.convertFilesToPdfTask;
      convertKeynoteToPdfTask = m.convertKeynoteToPdfTask;
      convertCadToPdfTask = m.convertCadToPdfTask;
    }),
    import("@/lib/trigger/pdf-to-image-route").then(m => {
      convertPdfToImageRoute = m.convertPdfToImageRoute;
    }),
    import("@/lib/trigger/optimize-video-files").then(m => {
      processVideo = m.processVideo;
    }),
    import("@/lib/utils/trigger-utils").then(m => {
      conversionQueue = m.conversionQueue;
    }),
  ]).catch(err => {
    console.warn("Failed to load Trigger.dev tasks:", err);
  });
}

// Local PDF processing function (self-hosted mode)
async function processLocalPdf(documentVersionId: string, teamId: string) {
  try {
    console.log(`[Local Processing] Starting PDF processing for version: ${documentVersionId}`);
    
    // Update status to processing
    await prisma.documentProcessingStatus.update({
      where: { documentVersionId },
      data: {
        status: ProcessingStatus.PROCESSING,
        progress: 10,
        message: "正在處理文件...",
      },
    });

    // Call the local processing API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/local/process-document`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Use internal API key if available
          ...(process.env.INTERNAL_API_KEY && {
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          }),
        },
        body: JSON.stringify({ documentVersionId, teamId }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Processing failed");
    }

    const result = await response.json();
    console.log(`[Local Processing] Complete: ${result.numPages} pages processed`);

    // Update status to completed
    await prisma.documentProcessingStatus.update({
      where: { documentVersionId },
      data: {
        status: ProcessingStatus.COMPLETED,
        progress: 100,
        message: `已處理 ${result.numPages} 頁`,
      },
    });
  } catch (error) {
    console.error("[Local Processing] Error:", error);
    
    // Update status to failed
    await prisma.documentProcessingStatus.update({
      where: { documentVersionId },
      data: {
        status: ProcessingStatus.FAILED,
        progress: 0,
        message: (error as Error).message,
      },
    });
  }
}

type ProcessDocumentParams = {
  documentData: DocumentData;
  teamId: string;
  teamPlan: string;
  userId?: string;
  folderPathName?: string;
  createLink?: boolean;
  isExternalUpload?: boolean;
};

export const processDocument = async ({
  documentData,
  teamId,
  teamPlan,
  userId,
  folderPathName,
  createLink = false,
  isExternalUpload = false,
}: ProcessDocumentParams) => {
  const {
    name,
    key,
    storageType,
    contentType,
    supportedFileType,
    fileSize,
    numPages,
    enableExcelAdvancedMode,
  } = documentData;

  const type = supportedFileType || getExtension(name);

  // Check whether the Notion page is publically accessible or not
  if (type === "notion") {
    try {
      let pageId = parsePageId(key, { uuid: false });

      if (!pageId) {
        try {
          const pageIdFromSlug = await getNotionPageIdFromSlug(key);
          pageId = pageIdFromSlug || undefined;
        } catch (slugError) {
          throw new Error("Unable to extract page ID from Notion URL");
        }
      }

      if (!pageId) {
        throw new Error("Notion page not found");
      }
      await notion.getPage(pageId);
    } catch (error) {
      throw new Error("This Notion page isn't publically available.");
    }
  }

  // For link type, validate URL format
  if (type === "link") {
    try {
      new URL(key);

      const keywords = await get("keywords");
      if (Array.isArray(keywords) && keywords.length > 0) {
        const matchedKeyword = keywords.find(
          (keyword) => typeof keyword === "string" && key.includes(keyword),
        );

        if (matchedKeyword) {
          log({
            message: `Link document creation blocked: ${matchedKeyword} \n\n \`Metadata: {teamId: ${teamId}, url: ${key}}\``,
            type: "error",
            mention: true,
          });
          throw new Error("This URL is not allowed");
        }
      }
    } catch (error) {
      throw new Error("Invalid URL format for link document.");
    }
  }

  const folder = await prisma.folder.findUnique({
    where: {
      teamId_path: {
        teamId,
        path: "/" + folderPathName,
      },
    },
    select: {
      id: true,
    },
  });

  const isDownloadOnly =
    type === "zip" ||
    type === "map" ||
    type === "email" ||
    contentType === "text/tab-separated-values";

  // Save data to the database
  const document = await prisma.document.create({
    data: {
      name: name,
      numPages: numPages,
      file: key,
      originalFile: key,
      contentType: contentType,
      type: type,
      storageType,
      ownerId: userId,
      teamId: teamId,
      advancedExcelEnabled: enableExcelAdvancedMode,
      downloadOnly: isDownloadOnly,
      ...(createLink && {
        links: {
          create: {
            teamId,
          },
        },
      }),
      versions: {
        create: {
          file: key,
          originalFile: key,
          contentType: contentType,
          type: type,
          storageType,
          numPages: numPages,
          isPrimary: true,
          versionNumber: 1,
          fileSize: fileSize,
        },
      },
      folderId: folder?.id ?? null,
      isExternalUpload,
    },
    include: {
      links: true,
      versions: true,
    },
  });

  // Processing based on mode
  if (!TRIGGER_ENABLED) {
    // Self-hosted mode - local processing
    
    // Create initial processing status
    await prisma.documentProcessingStatus.upsert({
      where: { documentVersionId: document.versions[0].id },
      update: {
        status: ProcessingStatus.QUEUED,
        progress: 0,
        message: "等待處理...",
      },
      create: {
        documentVersionId: document.versions[0].id,
        status: ProcessingStatus.QUEUED,
        progress: 0,
        message: "等待處理...",
      },
    });

    // For PDF documents, process locally in background
    if (type === "pdf") {
      // Fire and forget - process in background
      processLocalPdf(document.versions[0].id, teamId).catch(err => {
        console.error("Background PDF processing failed:", err);
      });
    } else {
      // For non-PDF documents, mark as completed immediately
      await prisma.documentProcessingStatus.update({
        where: { documentVersionId: document.versions[0].id },
        data: {
          status: ProcessingStatus.COMPLETED,
          progress: 100,
          message: "文件已就緒",
        },
      });
    }
  } else {
    // Trigger.dev is enabled - use background processing
    
    await prisma.documentProcessingStatus.create({
      data: {
        documentVersionId: document.versions[0].id,
        status: ProcessingStatus.QUEUED,
        progress: 0,
        message: "Waiting to process...",
      },
    });

    if (
      type === "slides" &&
      (contentType === "application/vnd.apple.keynote" ||
        contentType === "application/x-iwork-keynote-sffkey") &&
      convertKeynoteToPdfTask
    ) {
      await convertKeynoteToPdfTask.trigger(
        {
          documentId: document.id,
          documentVersionId: document.versions[0].id,
          teamId,
        },
        {
          idempotencyKey: `${teamId}-${document.versions[0].id}-keynote`,
          tags: [
            `team_${teamId}`,
            `document_${document.id}`,
            `version:${document.versions[0].id}`,
          ],
          queue: conversionQueue?.(teamPlan),
          concurrencyKey: teamId,
        },
      );
    } else if ((type === "docs" || type === "slides") && convertFilesToPdfTask) {
      await convertFilesToPdfTask.trigger(
        {
          documentId: document.id,
          documentVersionId: document.versions[0].id,
          teamId,
        },
        {
          idempotencyKey: `${teamId}-${document.versions[0].id}-docs`,
          tags: [
            `team_${teamId}`,
            `document_${document.id}`,
            `version:${document.versions[0].id}`,
          ],
          queue: conversionQueue?.(teamPlan),
          concurrencyKey: teamId,
        },
      );
    }

    if (type === "cad" && convertCadToPdfTask) {
      await convertCadToPdfTask.trigger(
        {
          documentId: document.id,
          documentVersionId: document.versions[0].id,
          teamId,
        },
        {
          idempotencyKey: `${teamId}-${document.versions[0].id}-cad`,
          tags: [
            `team_${teamId}`,
            `document_${document.id}`,
            `version:${document.versions[0].id}`,
          ],
          queue: conversionQueue?.(teamPlan),
          concurrencyKey: teamId,
        },
      );
    }

    if (
      type === "video" &&
      contentType !== "video/mp4" &&
      contentType?.startsWith("video/") &&
      processVideo
    ) {
      await processVideo.trigger(
        {
          videoUrl: key,
          teamId,
          docId: key.split("/")[1],
          documentVersionId: document.versions[0].id,
          fileSize: fileSize || 0,
        },
        {
          idempotencyKey: `${teamId}-${document.versions[0].id}`,
          tags: [
            `team_${teamId}`,
            `document_${document.id}`,
            `version:${document.versions[0].id}`,
          ],
          queue: conversionQueue?.(teamPlan),
          concurrencyKey: teamId,
        },
      );
    }

    if (type === "pdf" && convertPdfToImageRoute) {
      await convertPdfToImageRoute.trigger(
        {
          documentId: document.id,
          documentVersionId: document.versions[0].id,
          teamId,
        },
        {
          idempotencyKey: `${teamId}-${document.versions[0].id}`,
          tags: [
            `team_${teamId}`,
            `document_${document.id}`,
            `version:${document.versions[0].id}`,
          ],
          queue: conversionQueue?.(teamPlan),
          concurrencyKey: teamId,
        },
      );
    }

    if (type === "sheet" && enableExcelAdvancedMode) {
      await copyFileToBucketServer({
        filePath: document.versions[0].file,
        storageType: document.versions[0].storageType,
        teamId,
      });

      await prisma.documentVersion.update({
        where: { id: document.versions[0].id },
        data: { numPages: 1 },
      });

      try {
        await fetch(
          `${process.env.NEXTAUTH_URL}/api/revalidate?secret=${process.env.REVALIDATE_TOKEN}&documentId=${document.id}`,
        );
      } catch (error) {
        console.error("Failed to revalidate document:", error);
      }
    }
  }

  // Send webhooks
  await Promise.all([
    !isExternalUpload &&
      sendDocumentCreatedWebhook({
        teamId,
        data: {
          document_id: document.id,
        },
      }),
    createLink &&
      sendLinkCreatedWebhook({
        teamId,
        data: {
          document_id: document.id,
          link_id: document.links[0].id,
        },
      }),
  ]);

  return document;
};
