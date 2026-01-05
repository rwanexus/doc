import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    // Record page view duration
    const { viewId, documentId, pageNumber, versionNumber, duration } = req.body;

    if (!viewId || !documentId || pageNumber === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Upsert page view - update duration if exists, create if not
      const pageView = await prisma.pageView.upsert({
        where: {
          viewId_documentId_pageNumber: {
            viewId,
            documentId,
            pageNumber,
          },
        },
        update: {
          duration: {
            increment: duration || 0,
          },
          updatedAt: new Date(),
        },
        create: {
          viewId,
          documentId,
          pageNumber,
          versionNumber: versionNumber || 1,
          duration: duration || 0,
        },
      });

      return res.status(200).json({ success: true, pageView });
    } catch (error) {
      console.error("Error recording page view:", error);
      return res.status(500).json({ error: "Failed to record page view" });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
