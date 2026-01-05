import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { documentVersionId } = req.query;

  if (!documentVersionId || typeof documentVersionId !== "string") {
    return res.status(400).json({ error: "Missing documentVersionId" });
  }

  if (req.method === "GET") {
    // Get processing status
    try {
      const status = await prisma.documentProcessingStatus.findUnique({
        where: { documentVersionId },
      });

      if (!status) {
        // If no status found, assume completed (for existing documents)
        return res.status(200).json({
          status: "COMPLETED",
          progress: 100,
          message: null,
          error: null,
        });
      }

      return res.status(200).json({
        status: status.status,
        progress: status.progress,
        message: status.message,
        error: status.error,
      });
    } catch (error) {
      console.error("Error getting processing status:", error);
      return res.status(500).json({ error: "Failed to get processing status" });
    }
  }

  if (req.method === "POST") {
    // Update processing status
    const { status, progress, message, error } = req.body;

    try {
      const processingStatus = await prisma.documentProcessingStatus.upsert({
        where: { documentVersionId },
        update: {
          status: status || undefined,
          progress: progress !== undefined ? progress : undefined,
          message: message !== undefined ? message : undefined,
          error: error !== undefined ? error : undefined,
          updatedAt: new Date(),
        },
        create: {
          documentVersionId,
          status: status || "QUEUED",
          progress: progress || 0,
          message: message || null,
          error: error || null,
        },
      });

      return res.status(200).json({ success: true, processingStatus });
    } catch (error) {
      console.error("Error updating processing status:", error);
      return res.status(500).json({ error: "Failed to update processing status" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
