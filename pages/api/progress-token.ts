import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { documentVersionId } = req.query;

  if (!documentVersionId || typeof documentVersionId !== "string") {
    return res.status(400).json({ error: "Document version ID is required" });
  }

  try {
    // Check local processing status
    const status = await prisma.documentProcessingStatus.findUnique({
      where: { documentVersionId },
    });

    // Return local mode flag so frontend knows to poll local API
    return res.status(200).json({
      localMode: true,
      status: status?.status || "COMPLETED",
      progress: status?.progress || 100,
      message: status?.message || null,
      error: status?.error || null,
    });
  } catch (error) {
    console.error("Error getting processing status:", error);
    return res.status(500).json({ error: "Failed to get processing status" });
  }
}
