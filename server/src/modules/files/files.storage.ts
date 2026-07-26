
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UploadFileInput } from "./files.types";

// 所有文件都保存在 server/uploads 下，数据库只记录相对路径。
const UPLOAD_ROOT = path.resolve(__dirname, "../../../uploads");

// 原始扩展名只在格式安全时保留，真正的存储文件名由 UUID 生成，避免同名覆盖。
const getSafeExtension = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();

  if (!/^\.[a-z0-9]{1,10}$/.test(extension)) {
    return "";
  }

  return extension;
};

// 数据库存的是相对路径；每次读写磁盘前都要确认解析结果没有越出 uploads。
const resolveInsideUploadRoot = (storagePath: string): string => {
  const absolutePath = path.resolve(
    UPLOAD_ROOT,
    ...storagePath.split("/").filter(Boolean)
  );
  const rootWithSeparator = `${UPLOAD_ROOT}${path.sep}`;

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(rootWithSeparator)) {
    throw new Error("文件存储路径不安全");
  }

  return absolutePath;
};

// 项目公共文件和任务附件分目录保存，方便后续定位和按业务范围清理。
export const saveUploadedFile = async (input: {
  projectId: number;
  taskId: number | null;
  file: UploadFileInput;
}): Promise<{ storedName: string; storagePath: string }> => {
  const storedName = `${randomUUID()}${getSafeExtension(input.file.originalName)}`;
  const directory = input.taskId
    ? path.posix.join(
        "projects",
        String(input.projectId),
        "tasks",
        String(input.taskId)
      )
    : path.posix.join("projects", String(input.projectId), "project-files");
  const storagePath = path.posix.join(directory, storedName);
  const absolutePath = resolveInsideUploadRoot(storagePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.file.buffer, { flag: "wx" });

  return { storedName, storagePath };
};

// 下载接口只拿到数据库中的相对路径，通过这个函数转换成受保护的绝对路径。
export const resolveStoredFilePath = (storagePath: string): string => {
  return resolveInsideUploadRoot(storagePath);
};

// 删除磁盘文件时把“不存在”视为已清理完成，其他文件系统错误继续向上抛出。
export const removeStoredFile = async (storagePath: string): Promise<void> => {
  try {
    await unlink(resolveInsideUploadRoot(storagePath));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    throw error;
  }
};
