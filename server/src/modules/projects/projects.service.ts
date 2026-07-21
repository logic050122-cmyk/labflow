import { randomBytes } from "crypto";

import { AppError } from "../../common/http";
import { db } from "../../config/db";

import {
  insertProject,
  insertProjectOwner
} from "./projects.repository";
import type {
  CreateProjectInput,
  CreateProjectResult
} from "./projects.types";

const createInviteCode = (): string => {
  // projects.invite_code 是 32 位字符串，这里生成 16 字节的十六进制邀请码。
  return randomBytes(16).toString("hex").toUpperCase();
};

const isDuplicateEntryError = (error: unknown): boolean => {
  // MySQL 唯一索引冲突时返回 ER_DUP_ENTRY，转换成明确的业务错误。
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
};

export const createProject = async (
  input: CreateProjectInput,
  ownerUserId: number
): Promise<CreateProjectResult> => {
  // 一个 connection 必须贯穿两个 INSERT，才能保证它们属于同一个事务。
  const connection = await db.getConnection();

  try {
    // 项目记录和 Owner 关系要么一起成功，要么一起回滚。
    await connection.beginTransaction();

    // status、ownerUserId 和 inviteCode 都由后端决定，不信任客户端传入。
    const project = await insertProject(connection, {
      ...input,
      ownerUserId,
      status: "active",
      inviteCode: createInviteCode()
    });

    // 创建者同时写入项目成员表，角色固定为 owner。
    await insertProjectOwner(connection, project.id, ownerUserId);
    await connection.commit();

    return { project };
  } catch (error) {
    // 任意一步失败都撤销前面已经执行的数据库操作。
    await connection.rollback();

    if (isDuplicateEntryError(error)) {
      throw new AppError("项目邀请码生成失败，请重试", 409, 40902);
    }

    throw error;
  } finally {
    // 无论成功还是失败，都要把连接还回连接池。
    connection.release();
  }
};
