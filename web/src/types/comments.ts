// 评论接口返回数据库字段的 camelCase 形式，并带出评论人展示信息。
export interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  username: string;
  nickname: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// taskId 从请求路径获取，当前用户由 JWT 确定，页面只提交评论内容。
export interface CreateCommentRequest {
  content: string;
}

export interface CreateCommentResult {
  comment: TaskComment;
}

export interface ListCommentsResult {
  comments: TaskComment[];
}

export interface DeleteCommentResult {
  deletedCommentId: number;
}
