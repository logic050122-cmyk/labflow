import { randomBytes } from "crypto";

import { AppError } from "../../common/http";
import { db } from "../../config/db";

import {
  findProjectByIdForUser,
  findProjectsByUser,
  insertProject,
  insertProjectOwner
} from "./projects.repository";
import type {
  CreateProjectInput,
  CreateProjectResult,
  GetProjectResult,
  ListProjectsInput,
  ListProjectsResult
} from "./projects.types";

const createInviteCode = (): string => {
  // projects.invite_code 是 32 位字符串，这里生成 16 字节的十六进制邀请码。
  return randomBytes(16).toString("hex").toUpperCase(); //随机生成一个16字节的随机数，并将其转换为大写的十六进制字符串
};

const isDuplicateEntryError = (error: unknown): boolean => {
  // MySQL 唯一索引冲突时返回 ER_DUP_ENTRY，转换成明确的业务错误。
  return ( //返回 true 如果 error 是一个对象且不为 null，并且具有 code 属性且其值为 "ER_DUP_ENTRY"，否则返回 false
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
      ...input, //...是展开运算符，表示把 input 对象的所有属性展开成单独的键值对
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

export const listProjects = async (
  input: ListProjectsInput,
  currentUserId: number
): Promise<ListProjectsResult> => {
  // service 不接受前端传来的 userId，而是接收认证中间件确认过的 currentUserId。
  // repository 必须收到当前登录用户 ID，查询条件不能由前端指定其他用户。
  const result = await findProjectsByUser({
    ...input, // 展开 input 对象的所有属性
    userId: currentUserId
  });

  // 这里补齐分页字段，让 controller 返回的 data 符合 API.md 的统一分页格式。
  return {
    list: result.list,
    total: result.total,
    page: input.page,
    pageSize: input.pageSize
  };
};

export const getProject = async (
  projectId: number,
  currentUserId: number
): Promise<GetProjectResult> => {
  const project = await findProjectByIdForUser({
    projectId,
    userId: currentUserId
  });

  // 不区分“项目不存在”和“不是成员”，避免把其他项目是否存在暴露出去。
  if (!project) {
    throw new AppError("项目不存在或你不是项目成员", 404, 40401);
  }

  return { project };
};
