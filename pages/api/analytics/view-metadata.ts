import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

// Parse user agent to get browser, os, device
function parseUserAgent(userAgent: string | undefined) {
  if (!userAgent) {
    return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  }

  // Browser detection
  let browser = "Unknown";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    browser = "Chrome";
  } else if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    browser = "Safari";
  } else if (userAgent.includes("Edg")) {
    browser = "Edge";
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
    browser = "IE";
  }

  // OS detection
  let os = "Unknown";
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux") && !userAgent.includes("Android")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
  } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
  }

  // Device detection
  let device = "Desktop";
  if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
    device = "Mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const { viewId } = req.body;

    if (!viewId) {
      return res.status(400).json({ error: "Missing viewId" });
    }

    try {
      const userAgent = req.headers["user-agent"];
      const { browser, os, device } = parseUserAgent(userAgent);
      
      // Get IP and country from headers (if behind proxy)
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || 
                 req.socket.remoteAddress || 
                 "Unknown";
      
      // For country/city, you would need a GeoIP service
      // For now, we'll leave them as Unknown
      const country = "Unknown";
      const city = "Unknown";

      const metadata = await prisma.viewMetadata.upsert({
        where: { viewId },
        update: {
          browser,
          os,
          device,
          ip,
          country,
          city,
        },
        create: {
          viewId,
          browser,
          os,
          device,
          ip,
          country,
          city,
        },
      });

      return res.status(200).json({ success: true, metadata });
    } catch (error) {
      console.error("Error recording view metadata:", error);
      return res.status(500).json({ error: "Failed to record view metadata" });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
