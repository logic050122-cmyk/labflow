import type { ProjectStatus } from "../projects/projects.types";

// ============================================================
// 1. 返回给前端的评论对象
// ============================================================
// 数据库用 snake_case，接口返回统一用 camelCase。
// username 和 nickname 从 users 表 JOIN 出来，前端展示评论人时不用再查一次。
export interface Comment {
  id: number;
  taskId: number;
  userId: number;
  username: string;
  nickname: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 2. 输入接口
// ============================================================
// 新增评论时客户端只传 content，taskId 从路径参数取，userId 从 JWT 取。
export interface CreateCommentInput {
  content: string;
}

// ============================================================
// 3. 操作结果接口
// ============================================================
// 每个 service 函数都返回一个明确的结果类型，controller 直接传给 sendSuccess。
export interface CreateCommentResult {
  comment: Comment;
}

export interface ListCommentsResult {
  comments: Comment[];
}

export interface DeleteCommentResult {
  deletedCommentId: number;
}

// ============================================================
// 4. service 中间数据
// ============================================================
// 新增评论前，service 需要确认当前用户是项目成员，并拿到项目状态判断是否归档。
// 类似 tasks 模块的 TaskStartTarget。
export interface CommentCreateTarget {
  taskId: number;
  projectId: number;
  projectStatus: ProjectStatus;
}

// 删除评论前，service 需要拿到评论人、项目 Owner 和项目状态做权限判断。
// 类似 tasks 模块的 TaskReviewTarget。
export interface CommentDeleteTarget {
  commentId: number;
  taskId: number;
  projectId: number;
  userId: number;       // 评论人 ID，判断是不是本人
  ownerUserId: number;  // 项目 Owner ID，判断是不是负责人
  projectStatus: ProjectStatus;
}