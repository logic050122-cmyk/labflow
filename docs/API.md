# API 设计说明

## 1. 文档目标

本文档定义第一版 REST API 的公共契约、模块接口、权限和状态流转。后续新增或修改接口必须同步更新本文档。

当前阶段只做接口设计，不编写 controller、service 或其他业务代码。

## 2. 公共约定

### 2.1 基础规则

- 基础前缀：`/api`
- 数据格式：请求和响应默认使用 JSON，文件上传使用 `multipart/form-data`
- 认证方式：`Authorization: Bearer <token>`
- 时间格式：ISO 8601 字符串
- 路径参数中的 `id` 均为正整数
- 除注册和登录外，接口默认要求登录

### 2.2 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 2.3 失败响应

```json
{
  "code": 40301,
  "message": "仅项目负责人可执行此操作",
  "data": null
}
```

错误信息必须明确。建议错误码分类：`400xx` 参数错误、`401xx` 认证错误、`403xx` 权限错误、`404xx` 资源不存在、`409xx` 状态或数据冲突、`500xx` 服务端错误。

### 2.4 分页响应

分页请求统一使用 `page` 和 `pageSize`，响应统一为：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

### 2.5 角色与状态值

- 接口请求和响应中的项目角色字段统一为小写 `owner`、`member`。
- `owner` 表示项目负责人，`member` 表示项目成员；`Owner`、`Member` 只可作为界面展示文字，不作为接口值。
- 项目负责人以 `projects.owner_user_id` 为判断依据，不能只依赖客户端提交的角色或 `project_members.role`。
- 创建项目和邀请码加入项目时，客户端不提交 `role`；服务端分别确定为 `owner`、`member`。
- 项目状态只使用 `active`、`finished`、`archived`。
- 任务状态只使用 `todo`、`doing`、`submitted`、`done`、`overdue`。

成员数据中的角色示例：

```json
{
  "userId": 12,
  "role": "member"
}
```

## 3. 权限标记

- `Public`：未登录可访问。
- `User`：任意已登录用户可访问自己的资源。
- `ProjectMember`：必须是目标项目的负责人或成员。
- `ProjectOwner`：当前用户 ID 必须等于目标项目的 `ownerUserId`。
- `Assignee`：必须是该任务的负责人，同时也是项目成员。

以上名称是本文档的权限标记，不是接口返回的角色值。资源权限根据服务端查询结果判断，不能信任客户端提交的 `projectId`、角色或用户 ID。

### 3.1 无 projectId 接口的资源归属校验

当接口路径没有 `projectId`、只有资源 ID 时，服务端必须先查询资源所属项目，再执行项目成员、项目负责人或资源所有者校验。不能因为客户端知道资源 ID 就允许访问。

- 任务接口：通过 `taskId` 查询 `tasks.project_id`，再校验当前用户是否属于该项目；编辑、审核和驳回还要根据 `projects.owner_user_id` 校验项目负责人。
- 评论删除：通过 `commentId` 查询评论，再经 `task_comments.task_id -> tasks.project_id` 得到所属项目，最后校验评论人或项目负责人权限。
- 文件下载和删除：通过 `fileId` 查询 `files.project_id`，再校验项目成员；删除还要校验上传人或项目负责人。
- 通知已读接口：通过 `notificationId` 查询 `receiver_user_id`，只允许通知接收人操作。

上述规则适用于 `GET /api/tasks/:taskId`、`PUT /api/tasks/:taskId`、任务状态接口、任务评论接口、`DELETE /api/comments/:commentId`、`GET /api/files/:fileId/download` 和 `DELETE /api/files/:fileId`。

## 4. 接口清单

### 4.1 认证 auth

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | 用户注册 |
| POST | `/api/auth/login` | Public | 登录并获取 JWT |
| GET | `/api/auth/me` | User | 获取当前用户 |
| POST | `/api/auth/logout` | User | 前端清除登录态；第一版不维护服务端会话 |

注册请求字段：`username`、`password`、`nickname`，可选 `email`、`phone`、`direction`。登录请求字段：`username`、`password`。

### 4.2 用户 users

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/users/me` | User | 获取个人资料 |
| PUT | `/api/users/me` | User | 修改昵称、头像、邮箱、手机号、方向 |
| PUT | `/api/users/me/password` | User | 修改密码 |
| GET | `/api/users/me/task-stats` | User | 获取个人任务统计 |

第一版不提供用户管理、第三方登录或手机验证码接口。

### 4.3 项目 projects

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects` | User | 获取我创建或加入的项目，支持分页和状态筛选 |
| POST | `/api/projects` | User | 创建项目并自动获得 `owner` 角色 |
| GET | `/api/projects/:projectId` | ProjectMember | 获取项目详情 |
| PUT | `/api/projects/:projectId` | ProjectOwner | 编辑项目基本信息 |
| POST | `/api/projects/:projectId/invite-code` | ProjectOwner | 生成或刷新邀请码 |
| POST | `/api/projects/join` | User | 使用邀请码加入项目并获得 `member` 角色 |
| POST | `/api/projects/:projectId/finish` | ProjectOwner | 完成项目，`active -> finished` |
| POST | `/api/projects/:projectId/archive` | ProjectOwner | 归档项目，`finished -> archived` |

创建/编辑字段：`name`、`description`、`startDate`、`endDate`；创建时项目状态默认为 `active`，不能通过编辑接口直接修改状态。加入项目请求字段为 `inviteCode`。

数据库和计划书均定义了 `active`、`finished`、`archived` 三种项目状态，因此第一版保留“完成项目”接口，不采用只有归档而无法进入 `finished` 的设计。只有 `finished` 项目可以归档；重复完成、完成已归档项目或归档非 `finished` 项目返回 `409xx` 状态冲突。

### 4.4 项目成员 members

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/members` | ProjectMember | 获取成员列表及任务完成概况 |
| DELETE | `/api/projects/:projectId/members/:userId` | ProjectOwner | 移除项目成员 |

成员列表和项目详情中的角色字段只返回 `owner` 或 `member`。不能移除 `projects.owner_user_id` 指向的项目负责人；成员存在未完成任务时第一版拒绝移除，并返回 `409xx` 冲突错误。

### 4.5 任务 tasks

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/tasks` | User | 获取“我的任务”，支持分页与筛选 |
| GET | `/api/projects/:projectId/tasks` | ProjectMember | 获取项目任务列表 |
| POST | `/api/projects/:projectId/tasks` | ProjectOwner | 创建并分配任务 |
| GET | `/api/tasks/:taskId` | ProjectMember | 获取任务详情 |
| PUT | `/api/tasks/:taskId` | ProjectOwner | 编辑任务信息或重新分配 |
| POST | `/api/tasks/:taskId/start` | Assignee | `todo/overdue -> doing` |
| POST | `/api/tasks/:taskId/submit` | Assignee | `doing -> submitted` |
| POST | `/api/tasks/:taskId/approve` | ProjectOwner | `submitted -> done` |
| POST | `/api/tasks/:taskId/reject` | ProjectOwner | `submitted -> doing` |

创建/编辑字段：`title`、`description`、`assigneeUserId`、`priority`、`tag`、`dueAt`。

提交任务请求字段：`submitContent`，可选，对应数据库 `tasks.submit_content`；提交成功时服务端同时更新 `status=submitted` 和 `submitted_at`。

```json
{
  "submitContent": "已完成登录接口，并补充了参数校验和测试说明。"
}
```

审核人由当前登录用户确定，客户端不提交 `reviewerUserId`。审核通过或驳回时，服务端写入 `reviewer_user_id` 和 `reviewed_at`。驳回请求必须包含 `reason`。

列表筛选参数：`status`、`assigneeUserId`、`priority`、`tag`、`keyword`、`page`、`pageSize`。`GET /api/tasks` 只能返回当前用户被分配的任务。

### 4.6 评论 comments

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/tasks/:taskId/comments` | ProjectMember | 获取任务评论列表 |
| POST | `/api/tasks/:taskId/comments` | ProjectMember | 添加任务评论 |
| DELETE | `/api/comments/:commentId` | User | 删除自己的评论；项目负责人可删除项目内评论 |

新增评论请求字段：`content`。评论不支持回复树和聊天室功能。

### 4.7 文件 files

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/files` | ProjectMember | 获取项目文件列表 |
| POST | `/api/projects/:projectId/files` | ProjectOwner | 上传项目文件 |
| GET | `/api/tasks/:taskId/files` | ProjectMember | 获取任务附件列表 |
| POST | `/api/tasks/:taskId/files` | ProjectMember | 上传任务附件 |
| GET | `/api/files/:fileId/download` | ProjectMember | 下载文件 |
| DELETE | `/api/files/:fileId` | User | 上传人可删除；项目负责人可删除项目内文件 |

上传字段名统一为 `file`。第一版不做文件版本控制，同名文件由服务端生成不同的存储名。

### 4.8 通知 notifications

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/notifications` | User | 获取自己的通知，支持分页和已读筛选 |
| GET | `/api/notifications/unread-count` | User | 获取未读数量 |
| PATCH | `/api/notifications/:notificationId/read` | User | 标记自己的通知已读 |
| PATCH | `/api/notifications/read-all` | User | 将自己的通知全部标记已读 |

前端通过普通 HTTP 查询或按需轮询，不使用 WebSocket。

### 4.9 统计 stats

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/stats/overview` | ProjectMember | 项目进度和任务状态分布 |
| GET | `/api/projects/:projectId/stats/members` | ProjectOwner | 成员任务完成率 |
| GET | `/api/users/me/task-stats` | User | 个人任务统计，与用户模块共用入口 |

项目进度公式：`done 任务数 / 全部任务数 * 100%`；无任务时进度返回 `0`。

### 4.10 操作日志 logs

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/logs` | ProjectMember | 获取项目关键操作日志，支持分页 |

第一版不提供全平台日志查询，也不提供日志新增、修改或删除接口。

## 5. 状态与副作用

| 动作 | 状态变化 | 通知 | 操作日志 |
| --- | --- | --- | --- |
| 创建任务 | 初始为 `todo` | 通知 Assignee | 记录 |
| 开始任务 | `todo/overdue -> doing` | 无 | 记录 |
| 提交任务 | `doing -> submitted` | 通知项目负责人 | 记录 |
| 审核通过 | `submitted -> done` | 通知 Assignee | 记录 |
| 审核驳回 | `submitted -> doing` | 通知 Assignee | 记录原因 |
| 定时逾期 | `todo/doing -> overdue` | 通知 Assignee 和项目负责人 | 记录 |
| 完成项目 | `active -> finished` | 无 | 记录 |
| 归档项目 | `finished -> archived` | 通知项目成员 | 记录 |

状态变化、通知和日志必须由 service 协调；controller 不直接修改数据库。

## 6. 第一版不提供

- WebSocket 或消息队列相关接口
- 管理员、组织、部门和角色配置接口
- 第三方登录和手机验证码接口
- 文件版本、聊天、邮件通知接口
