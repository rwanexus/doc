import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import mime from "mime-types";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { path: pathSegments } = req.query;
    
    if (!pathSegments || !Array.isArray(pathSegments)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    const relativePath = pathSegments.join("/");
    const uploadDir = process.env.UPLOAD_DIR || "/home/reyerchu/doc/uploads";
    const filePath = path.join(uploadDir, relativePath);

    // 安全檢查：確保路徑在 upload 目錄內
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // 檢查檔案是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // 取得檔案資訊
    const stat = fs.statSync(filePath);
    const mimeType = mime.lookup(filePath) || "application/octet-stream";

    // 設定回應標頭
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    // 串流傳輸檔案
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
