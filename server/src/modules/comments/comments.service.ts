import { AppError } from "../../common/http";
import { db } from "../../config/db";

import {
  deleteCommentById,
  findCommentForDelete,
  findCommentsByTaskId,
  findTaskForCommentRead,
  findTaskForCommentWrite,
  insertComment
} from "./comments.repository";
import type {
  CreateCommentInput,
  CreateCommentResult,
  DeleteCommentResult,
  ListCommentsResult
} from "./comments.types";

// ============================================================
// 1. 获取任务评论列表（只读，不需要事务）
// ============================================================
export const listComments = async (
  taskId: number,
  currentUserId: number
): Promise<ListCommentsResult> => {
  // 先校验当前用户是任务所属项目的成员，非成员看不到评论。
  const target = await findTaskForCommentRead(taskId, currentUserId);
  if (!target) {
    throw new AppError("任务不存在或你不是所属项目成员", 404, 40401);
  }

  // 成员校验通过后查询评论列表。
  const comments = await findCommentsByTaskId(taskId);
  return { comments };
};

// ============================================================
// 2. 新增评论（写操作，需要事务）
// ============================================================
export const createComment = async (
  taskId: number,
  input: CreateCommentInput,
  currentUserId: number
): Promise<CreateCommentResult> => {
  const connection = await db.getConnection();

  try {
    // 成员校验和插入必须在同一事务中，防止校验后成员关系被改变。
    await connection.beginTransaction();

    // 查任务所属项目并校验当前用户是否为项目成员（带锁）。
    const target = await findTaskForCommentWrite(connection, {
      taskId,
      currentUserId
    });
    if (!target) {
      throw new AppError("任务不存在或你不是所属项目成员", 404, 40401);
    }

    // 归档项目不允许新增评论，finished 项目保留历史但成员仍可评论。
    if (target.projectStatus === "archived") {
      throw new AppError("项目已归档，不允许新增评论", 409, 40904);
    }

    // 校验通过后插入评论，userId 由 JWT 确定不接受客户端传入。
    const comment = await insertComment(connection, {
      taskId,
      userId: currentUserId,
      content: input.content
    });

    await connection.commit();
    return { comment };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ============================================================
// 3. 删除评论（写操作，需要事务）
// ============================================================
export const deleteComment = async (
  commentId: number,
  currentUserId: number
): Promise<DeleteCommentResult> => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 查评论的同时拿到评论人、项目 Owner 和项目状态，全部权限判断需要的数据一次查齐。
    const target = await findCommentForDelete(connection, commentId);
    if (!target) {
      throw new AppError("评论不存在", 404, 40401);
    }

    // 权限规则：评论人本人可以删自己的评论，项目 Owner 可以删项目内任何评论。
    // 两个条件满足一个即可，都不是就拒绝。
    const isCommentAuthor = target.userId === currentUserId;
    const isProjectOwner = target.ownerUserId === currentUserId;
    if (!isCommentAuthor && !isProjectOwner) {
      throw new AppError("只能删除自己的评论，或由项目负责人删除", 403, 40301);
    }

    // 权限校验通过后删除评论。
    await deleteCommentById(connection, commentId);

    await connection.commit();
    return { deletedCommentId: commentId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};