import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import { DocumentStorageType } from "@prisma/client";
import { newId } from "@/lib/id-helper";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const teamId = Array.isArray(fields.teamId) ? fields.teamId[0] : fields.teamId;
    
    if (!file || !teamId) {
      return res.status(400).json({ error: "Missing file or teamId" });
    }

    const uploadDir = process.env.UPLOAD_DIR || "/home/reyerchu/doc/uploads";
    const teamDir = path.join(uploadDir, teamId);
    
    // 確保目錄存在
    await fs.mkdir(teamDir, { recursive: true });
    
    // 生成唯一的檔案名稱
    const docId = newId("doc");
    const ext = path.extname(file.originalFilename || ".pdf");
    const fileName = `${docId}${ext}`;
    const filePath = path.join(teamDir, fileName);
    
    // 移動檔案
    const fileBuffer = await fs.readFile(file.filepath);
    await fs.writeFile(filePath, fileBuffer);
    await fs.unlink(file.filepath); // 刪除臨時檔案
    
    // 返回相對路徑
    const relativePath = `${teamId}/${fileName}`;
    
    res.status(200).json({
      type: DocumentStorageType.S3_PATH,
      data: relativePath,
      url: `/api/file/local/${relativePath}`,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Local upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
}
