
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { UploadFileInput } from "./files.types";

const UPLOAD_ROOT = path.resolve(__dirname, "../../../uploads");

const getSafeExtension = (originalName: string): string => {
  const extension = path.extname(originalName).toLowerCase();

  if (!/^\.[a-z0-9]{1,10}$/.test(extension)) {
    return "";
  }

  return extension;
};

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

export const resolveStoredFilePath = (storagePath: string): string => {
  return resolveInsideUploadRoot(storagePath);
};

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
