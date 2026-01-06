import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import * as mupdf from "mupdf";
import fs from "fs/promises";
import path from "path";

import { putFileServer } from "@/lib/files/put-file-server";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export const config = {
  maxDuration: 300,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check for internal API key or session
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  
  if (token !== process.env.INTERNAL_API_KEY) {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { documentVersionId, teamId } = req.body;

  if (!documentVersionId || !teamId) {
    return res.status(400).json({ error: "Missing documentVersionId or teamId" });
  }

  try {
    const documentVersion = await prisma.documentVersion.findUnique({
      where: { id: documentVersionId },
      select: {
        id: true,
        file: true,
        storageType: true,
        numPages: true,
        documentId: true,
      },
    });

    if (!documentVersion) {
      return res.status(404).json({ error: "Document version not found" });
    }

    let pdfData: ArrayBuffer;
    
    // 讀取本地檔案
    const uploadDir = process.env.UPLOAD_DIR || "/home/reyerchu/doc/uploads";
    const filePath = path.join(uploadDir, documentVersion.file);
    
    console.log(`[Local Processing] Reading file: ${filePath}`);
    
    try {
      const buffer = await fs.readFile(filePath);
      pdfData = new Uint8Array(buffer).buffer as ArrayBuffer;
    } catch (err) {
      console.error(`[Local Processing] Failed to read file: ${err}`);
      return res.status(404).json({ error: "File not found" });
    }

    const doc = new mupdf.PDFDocument(pdfData);
    const numPages = doc.countPages();

    console.log(`[Local Processing] Document: ${documentVersionId}, pages: ${numPages}`);

    for (let i = 0; i < numPages; i++) {
      const pageNumber = i + 1;
      
      // 更新進度
      await prisma.documentProcessingStatus.update({
        where: { documentVersionId },
        data: {
          progress: Math.round((i / numPages) * 90) + 10,
          message: `處理中... ${pageNumber}/${numPages}`,
        },
      });

      const existingPage = await prisma.documentPage.findUnique({
        where: {
          pageNumber_versionId: {
            pageNumber: pageNumber,
            versionId: documentVersionId,
          },
        },
      });

      if (existingPage) {
        console.log(`[Local Processing] Page ${pageNumber} exists, skipping`);
        continue;
      }

      console.log(`[Local Processing] Processing page ${pageNumber}/${numPages}`);

      const page = doc.loadPage(i);
      const bounds = page.getBounds();
      const [ulx, uly, lrx, lry] = bounds;
      const widthInPoints = Math.abs(lrx - ulx);
      const heightInPoints = Math.abs(lry - uly);

      let scaleFactor = widthInPoints >= 1600 ? 2 : 2.95;
      const maxDimension = 8000;
      const scaledWidth = widthInPoints * scaleFactor;
      const scaledHeight = heightInPoints * scaleFactor;
      
      if (scaledWidth > maxDimension || scaledHeight > maxDimension) {
        scaleFactor = Math.min(maxDimension / widthInPoints, maxDimension / heightInPoints);
      }

      if (pageNumber === 1) {
        const isVertical = heightInPoints > widthInPoints;
        await prisma.documentVersion.update({
          where: { id: documentVersionId },
          data: { isVertical },
        });
      }

      const doc_to_screen = mupdf.Matrix.scale(scaleFactor, scaleFactor);
      const pixmap = page.toPixmap(doc_to_screen, mupdf.ColorSpace.DeviceRGB, false, true);
      
      const pngBuffer = pixmap.asPNG();
      const jpegBuffer = pixmap.asJPEG(80, false);
      
      const usePng = pngBuffer.byteLength < jpegBuffer.byteLength;
      const buffer = Buffer.from(usePng ? pngBuffer : jpegBuffer);
      const format = usePng ? "png" : "jpeg";

      const links = page.getLinks();
      const embeddedLinks = links.map((link) => ({
        href: link.getURI(),
        coords: link.getBounds().join(","),
      }));

      const match = documentVersion.file.match(/(doc_[^\/]+)\//);
      const docId = match ? match[1] : undefined;

      const { type, data } = await putFileServer({
        file: {
          name: `page-${pageNumber}.${format}`,
          type: `image/${format}`,
          buffer: buffer,
        },
        teamId: teamId,
        docId: docId,
      });

      if (!data || !type) {
        throw new Error(`Failed to upload page ${pageNumber}`);
      }

      await prisma.documentPage.create({
        data: {
          versionId: documentVersionId,
          pageNumber: pageNumber,
          file: data,
          storageType: type,
          pageLinks: embeddedLinks,
          metadata: {
            originalWidth: widthInPoints,
            originalHeight: heightInPoints,
            width: widthInPoints * scaleFactor,
            height: heightInPoints * scaleFactor,
            scaleFactor: scaleFactor,
          },
        },
      });

      pixmap.destroy();
      page.destroy();
    }

    await prisma.documentVersion.update({
      where: { id: documentVersionId },
      data: {
        numPages: numPages,
        hasPages: true,
        isPrimary: true,
      },
    });

    doc.destroy();

    console.log(`[Local Processing] Complete: ${documentVersionId}`);
    return res.status(200).json({ success: true, numPages });

  } catch (error) {
    console.error("[Local Processing] Error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
