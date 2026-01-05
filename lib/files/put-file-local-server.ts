import { DocumentStorageType } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import slugify from "@sindresorhus/slugify";
import { newId } from "@/lib/id-helper";

type File = {
  name: string;
  type: string;
  buffer: Buffer;
};

export const putFileLocalServer = async ({
  file,
  teamId,
  docId,
}: {
  file: File;
  teamId: string;
  docId?: string;
}): Promise<{
  type: DocumentStorageType;
  data: string;
}> => {
  if (!docId) {
    docId = newId("doc");
  }

  const uploadDir = process.env.UPLOAD_DIR || "/home/reyerchu/doc/uploads";
  const teamDir = path.join(uploadDir, teamId);
  
  // 確保目錄存在
  await fs.mkdir(teamDir, { recursive: true });
  
  // 生成唯一的檔案名稱
  const ext = path.extname(file.name);
  const baseName = slugify(path.basename(file.name, ext));
  const fileName = `${docId}-${baseName}${ext}`;
  const filePath = path.join(teamDir, fileName);
  
  // 寫入檔案
  await fs.writeFile(filePath, file.buffer);
  
  // 返回相對路徑
  const relativePath = `${teamId}/${fileName}`;
  
  return {
    type: DocumentStorageType.S3_PATH,
    data: relativePath,
  };
};
