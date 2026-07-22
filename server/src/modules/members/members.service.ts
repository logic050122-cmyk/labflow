import { AppError } from "../../common/http";
import { db } from "../../config/db";

import {
  deleteProjectMember,
  findJoinedProjectByIdForUser,
  findProjectForMemberRemovalForUpdate,
  findProjectMembersForUser,
  findProjectByInviteCodeForUpdate,
  findTargetProjectMemberForUpdate,
  hasUnfinishedTasksForMember,
  hasProjectMembership,
  insertProjectMember
} from "./members.repository";
import type {
  JoinProjectInput,
  JoinProjectResult,
  ListProjectMembersResult,
  RemoveProjectMemberInput,
  RemoveProjectMemberResult
} from "./members.types";

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

export const listMembersByProject = async (
  projectId: number,
  currentUserId: number
): Promise<ListProjectMembersResult> => {
  // repository 在查询成员列表时同时限制当前用户必须属于该项目，避免泄露其他项目数据。
  const members = await findProjectMembersForUser({
    projectId,
    currentUserId
  });

  // 正常项目至少包含 Owner；空数组表示项目不存在或当前用户没有成员关系。
  if (members.length === 0) {
    throw new AppError("项目不存在或你不是项目成员", 404, 40401);
  }

  return { members };
};

export const removeProjectMember = async (
  input: RemoveProjectMemberInput,
  currentUserId: number
): Promise<RemoveProjectMemberResult> => {
  // 权限、任务检查和删除必须在同一事务中完成，避免只执行其中一部分。
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 先检查当前用户是否有权限移除成员，并获取项目负责人和项目状态。
    const project = await findProjectForMemberRemovalForUpdate(connection, {
      projectId: input.projectId,
      currentUserId
    });
    if (!project) {
      throw new AppError("项目不存在或你不是项目成员", 404, 40401);
    }

    // Owner 权限始终以 projects.owner_user_id 为准，不信任客户端或成员表角色。
    if (project.ownerUserId !== currentUserId) {
      throw new AppError("仅项目负责人可以移除成员", 403, 40301);
    }

    if (project.status !== "active") {
      throw new AppError("项目当前状态不允许移除成员", 409, 40904);
    }

    // 检查目标成员是否存在、是否是负责人、是否有未完成任务。
    const targetMemberExists = await findTargetProjectMemberForUpdate(
      connection,
      input
    );
    if (!targetMemberExists) {
      throw new AppError("目标项目成员不存在", 404, 40403);
    }

    if (project.ownerUserId === input.userId) {
      throw new AppError("不能移除项目负责人", 409, 40905);
    }

    // 检查目标成员是否有未完成任务，避免删除后任务无人处理。
    const hasUnfinishedTasks = await hasUnfinishedTasksForMember(
      connection,
      input
    );
    if (hasUnfinishedTasks) {
      throw new AppError("该成员存在未完成任务，暂时不能移除", 409, 40906);
    }

    // 删除成员关系，返回受影响的行数，确保删除成功。
    const memberRemoved = await deleteProjectMember(connection, input);
    if (!memberRemoved) {
      throw new AppError("移除项目成员失败，请重试", 500, 50001);
    }

    await connection.commit();
    return { removedUserId: input.userId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
