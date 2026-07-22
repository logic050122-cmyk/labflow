import { AppError } from "../../common/http";
import { db } from "../../config/db";

import {
  findJoinedProjectByIdForUser,
  findProjectByInviteCodeForUpdate,
  hasProjectMembership,
  insertProjectMember
} from "./members.repository";
import type { JoinProjectInput, JoinProjectResult } from "./members.types";

const isDuplicateEntryError = (error: unknown): boolean => {
  // MySQL 唯一索引冲突时返回 ER_DUP_ENTRY，用于兜底两个并发加入请求。
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  );
};

export const joinProject = async (
  input: JoinProjectInput,
  currentUserId: number
): Promise<JoinProjectResult> => {
  // 邀请码校验、成员写入和结果读取必须使用同一个连接，保证事务边界完整。
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const targetProject = await findProjectByInviteCodeForUpdate(
      connection,
      input.inviteCode
    );
    if (!targetProject) {
      throw new AppError("邀请码无效", 404, 40402);
    }

    // 已完成或已归档的项目不再新增协作成员，只有进行中的项目允许加入。
    if (targetProject.status !== "active") {
      throw new AppError("项目当前状态不允许加入", 409, 40904);
    }

    // Owner 同样存在于 project_members 中，因此也会被判定为已经加入。
    const alreadyJoined = await hasProjectMembership(connection, {
      projectId: targetProject.id,
      userId: currentUserId
    });
    if (alreadyJoined) {
      throw new AppError("你已经加入该项目", 409, 40903);
    }

    await insertProjectMember(connection, {
      projectId: targetProject.id,
      userId: currentUserId
    });

    const project = await findJoinedProjectByIdForUser(connection, {
      projectId: targetProject.id,
      userId: currentUserId
    });
    if (!project) {
      throw new AppError("加入项目后无法读取项目数据", 500, 50001);
    }

    await connection.commit();
    return { project };
  } catch (error) {
    await connection.rollback();

    // 显式检查之后仍可能发生并发重复，最终由数据库唯一索引阻止重复成员关系。
    if (isDuplicateEntryError(error)) {
      throw new AppError("你已经加入该项目", 409, 40903);
    }

    throw error;
  } finally {
    // 无论成功还是失败都归还连接，避免请求积累连接池资源。
    connection.release();
  }
};
