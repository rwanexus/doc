import { NextApiRequest, NextApiResponse } from "next";

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

  // Skip Trigger.dev in self-hosted mode - return empty token
  // This disables real-time progress tracking but allows links to work
  if (!process.env.TRIGGER_SECRET_KEY) {
    return res.status(200).json({ publicAccessToken: null, selfHosted: true });
  }

  try {
    const { generateTriggerPublicAccessToken } = await import("@/lib/utils/generate-trigger-auth-token");
    const publicAccessToken = await generateTriggerPublicAccessToken(
      `version:${documentVersionId}`,
    );
    return res.status(200).json({ publicAccessToken });
  } catch (error) {
    console.error("Error generating token:", error);
    // Return null token instead of error - allows app to continue
    return res.status(200).json({ publicAccessToken: null, error: "Token generation skipped" });
  }
}
