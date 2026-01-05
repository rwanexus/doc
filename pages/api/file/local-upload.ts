import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";
import { DocumentStorageType } from "@prisma/client";
import { newId } from "@/lib/id-helper";
import slugify from "@sindresorhus/slugify";

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
    
    // 生成符合驗證格式的路徑: teamId/doc_xxx/filename.ext
    const docId = newId("doc");
    const docDir = path.join(uploadDir, teamId, docId);
    
    // 確保目錄存在
    await fs.mkdir(docDir, { recursive: true });
    
    // 生成檔案名稱
    const ext = path.extname(file.originalFilename || ".pdf");
    const baseName = slugify(path.basename(file.originalFilename || "file", ext)) || "file";
    const fileName = `${baseName}${ext}`;
    const filePath = path.join(docDir, fileName);
    
    // 移動檔案
    const fileBuffer = await fs.readFile(file.filepath);
    await fs.writeFile(filePath, fileBuffer);
    await fs.unlink(file.filepath); // 刪除臨時檔案
    
    // 返回符合驗證格式的相對路徑: teamId/doc_xxx/filename.ext
    const relativePath = `${teamId}/${docId}/${fileName}`;
    
    console.log("Local upload success:", relativePath);
    
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
