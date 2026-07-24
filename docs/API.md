# API 设计说明

## 1. 文档目标

本文档定义第一版 REST API 的公共契约、模块接口、权限和状态流转。后续新增或修改接口必须同步更新本文档。

本文档记录第一版接口契约。后续编写 controller、service 或其他业务代码时，接口字段和响应结构必须与本文档保持一致。

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

注册请求字段：`username`、`password`、`nickname`，可选 `email`、`phone`、`direction`。登录请求字段：`username`、`password`。

注册成功响应：

```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 1,
      "username": "alice",
      "nickname": "小林",
      "email": "alice@example.com",
      "createdAt": "2026-07-09T10:00:00.000Z",
      "updatedAt": "2026-07-09T10:00:00.000Z"
    }
  }
}
```

注册接口不返回 `password` 或 `passwordHash`。用户名重复返回 `40901`；必填字段为空、字段类型错误或超过数据库字段长度返回 `40001`。

登录成功响应：

```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

登录接口不返回密码或密码哈希。用户名或密码错误统一返回 `40101`；必填字段为空、字段类型错误或用户名超过数据库字段长度返回 `40001`。

受保护接口必须携带 `Authorization: Bearer <token>`。未携带认证信息或格式错误返回 `40102`；token 无效、被篡改或已过期返回 `40103`。

获取当前用户成功响应：

```json
{
  "code": 0,
  "message": "获取当前用户成功",
  "data": {
    "user": {
      "id": 1,
      "username": "alice",
      "nickname": "小林",
      "email": "alice@example.com",
      "createdAt": "2026-07-12T10:00:00.000Z",
      "updatedAt": "2026-07-12T10:00:00.000Z"
    }
  }
}
```

`GET /api/auth/me` 不返回密码或密码哈希。token 对应用户不存在时返回 `40401`。

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

创建/编辑字段：`name`、`description`、`startDate`、`endDate`。创建项目请求中，`name`、`startDate`、`endDate` 必填，`description` 选填；项目日期统一使用 `YYYY-MM-DD`（ISO 8601 date-only）格式，截止日期不能早于开始日期。创建时项目状态默认为 `active`，不能通过编辑接口直接修改状态；`ownerId`、`userId` 和 `status` 不由客户端提交。

加入项目请求只接收 `inviteCode`：必须是 1 至 32 位英文字母或数字；服务端去除首尾空格并统一转换为大写。客户端提交的 `projectId`、`userId` 或 `role` 不参与业务判断，加入后的角色由服务端固定为 `member`。

刷新邀请码成功响应：

```json
{
  "code": 0,
  "message": "邀请码刷新成功",
  "data": {
    "inviteCode": "LABFLOWV1"
  }
}
```

加入项目成功响应：

```json
{
  "code": 0,
  "message": "加入项目成功",
  "data": {
    "project": {
      "id": 1,
      "name": "实验室官网重构",
      "description": "完成实验室官网升级",
      "ownerUserId": 2,
      "status": "active",
      "role": "member",
      "startDate": "2026-07-21",
      "endDate": "2026-08-31",
      "createdAt": "2026-07-21T08:00:00.000Z",
      "updatedAt": "2026-07-21T08:00:00.000Z"
    }
  }
}
```

邀请码为空、超过 32 位或包含字母和数字以外的字符返回 `40001`；非 Owner 刷新邀请码返回 `40301`；刷新接口中的项目不存在或当前用户不是项目成员返回 `40401`；邀请码无效或旧邀请码已经失效返回 `40402`；邀请码生成发生唯一键冲突返回 `40902`；用户已经加入目标项目返回 `40903`。只有 `active` 项目允许刷新邀请码和加入成员，`finished` 或 `archived` 项目执行上述操作返回 `40904`。

编辑项目请求示例：

```json
{
  "name": "实验室官网重构",
  "description": "补充项目说明",
  "startDate": "2026-07-21",
  "endDate": "2026-08-31"
}
```

编辑成功返回 `data.project` 的最新项目字段。只有项目 Owner 可以编辑；Member 返回 `40301`，非成员或项目不存在统一返回 `40401`。

项目列表请求支持 `page`、`pageSize` 和可选的 `status`；`pageSize` 最大为 100。列表项返回 `id`、`name`、`description`、`ownerUserId`、`status`、当前用户的 `role`、`startDate`、`endDate`、`createdAt`、`updatedAt`，不返回邀请码。查询条件必须使用当前登录用户 ID，不能由客户端指定其他用户。

项目详情只返回当前用户作为项目成员可以查看的项目，字段与项目列表项一致，并包含当前用户的 `role`；不返回邀请码。项目不存在或当前用户不是项目成员时，统一返回 `40401`。

数据库和计划书均定义了 `active`、`finished`、`archived` 三种项目状态，因此第一版保留“完成项目”接口，不采用只有归档而无法进入 `finished` 的设计。只有 `finished` 项目可以归档；重复完成、完成已归档项目或归档非 `finished` 项目返回 `409xx` 状态冲突。

### 4.4 项目成员 members

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/projects/:projectId/members` | ProjectMember | 获取成员列表及任务完成概况 |
| DELETE | `/api/projects/:projectId/members/:userId` | ProjectOwner | 移除项目成员 |

#### 4.4.1 获取项目成员列表

`GET /api/projects/:projectId/members` 不分页，也不提供搜索和自定义排序。Owner 和 Member 都可以查看所在项目成员；`active`、`finished`、`archived` 项目均允许查看，以便保留历史成员信息。

路径参数 `projectId` 必须是正整数。成员列表先返回 Owner，其他 Member 按 `joinedAt` 升序排列。即使项目当前没有普通 Member，`members` 也必须返回包含 Owner 的数组，不能返回 `null`。

成功响应：

```json
{
  "code": 0,
  "message": "获取项目成员成功",
  "data": {
    "members": [
      {
        "userId": 1,
        "username": "alice",
        "nickname": "小林",
        "role": "owner",
        "joinedAt": "2026-07-22T10:00:00.000Z",
        "totalTaskCount": 5,
        "completedTaskCount": 3
      }
    ]
  }
}
```

字段规则：

- `userId`：成员对应的用户 ID，也是移除成员接口使用的目标用户 ID。
- `username`：用户的唯一账号；`nickname`：页面主要展示的昵称。两个字段同时返回，用于区分昵称相同的成员。
- `role`：只返回 `owner` 或 `member`。
- `joinedAt`：成员加入项目的时间，使用 ISO 8601 字符串。
- `totalTaskCount`：该成员在当前项目中负责的全部任务数。
- `completedTaskCount`：该成员在当前项目中状态为 `done` 的任务数。
- 成员没有任务时，`totalTaskCount` 和 `completedTaskCount` 都返回 `0`。

失败规则：`projectId` 不是正整数时返回 `40001`；项目不存在或当前用户不是项目成员时统一返回 `40401`，不向非成员暴露项目是否存在。认证失败继续使用公共约定中的 `40102`、`40103`。

#### 4.4.2 移除项目成员

`DELETE /api/projects/:projectId/members/:userId` 只允许项目 Owner 调用。`projectId` 表示目标项目，`userId` 表示被移除用户；当前操作者必须从 JWT 获取，不能由客户端提交。

成功响应：

```json
{
  "code": 0,
  "message": "移除项目成员成功",
  "data": {
    "removedUserId": 2
  }
}
```

服务端必须按以下顺序校验：

1. `projectId` 和 `userId` 都是正整数。
2. 当前登录用户属于目标项目。
3. 当前登录用户 ID 等于 `projects.owner_user_id`。
4. 目标用户属于目标项目。
5. 目标用户不是 `projects.owner_user_id` 指向的项目负责人。
6. 目标成员在当前项目中不存在未完成任务。
7. 删除对应的 `project_members` 关系。

只有 `active` 项目允许移除成员；`finished` 和 `archived` 项目保留成员关系和历史数据。任务状态为 `todo`、`doing`、`submitted`、`overdue` 时均视为未完成，只有 `done` 视为已完成。

失败规则：

| 场景 | HTTP 状态码 | 业务错误码 | 错误信息 |
| --- | ---: | ---: | --- |
| `projectId` 或 `userId` 不是正整数 | 400 | `40001` | 项目 ID 和用户 ID 必须是正整数 |
| 项目不存在或当前用户不是项目成员 | 404 | `40401` | 项目不存在或你不是项目成员 |
| 当前用户不是项目 Owner | 403 | `40301` | 仅项目负责人可以移除成员 |
| 目标用户不是当前项目成员 | 404 | `40403` | 目标项目成员不存在 |
| 项目不是 `active` 状态 | 409 | `40904` | 项目当前状态不允许移除成员 |
| 尝试移除项目 Owner | 409 | `40905` | 不能移除项目负责人 |
| 目标成员存在未完成任务 | 409 | `40906` | 该成员存在未完成任务，暂时不能移除 |

认证失败继续使用公共约定中的 `40102`、`40103`。

### 4.5 任务 tasks

| 方法 | 路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/tasks` | User | 获取“我的任务”，支持分页与筛选（模块 5） |
| GET | `/api/projects/:projectId/tasks` | ProjectMember | 获取项目任务列表（模块 5） |
| POST | `/api/projects/:projectId/tasks` | ProjectOwner | 创建并分配任务（模块 5） |
| GET | `/api/tasks/:taskId` | ProjectMember | 获取任务详情（模块 5） |
| PUT | `/api/tasks/:taskId` | ProjectOwner | 编辑或重新分配 `todo` 任务（模块 5） |
| POST | `/api/tasks/:taskId/start` | Assignee | `todo/overdue -> doing`（模块 6） |
| POST | `/api/tasks/:taskId/submit` | Assignee | `doing -> submitted`（模块 7） |
| POST | `/api/tasks/:taskId/approve` | ProjectOwner | `submitted -> done`（模块 7） |
| POST | `/api/tasks/:taskId/reject` | ProjectOwner | `submitted -> doing`（模块 7） |

#### 4.5.1 创建和编辑任务

`POST /api/projects/:projectId/tasks` 和 `PUT /api/tasks/:taskId` 的请求体都完整提交以下字段：

```json
{
  "title": "完成登录接口参数校验",
  "description": "补齐空值和非法格式的校验提示。",
  "assigneeUserId": 12,
  "priority": "high",
  "tag": "功能",
  "dueAt": "2026-07-30T10:00:00.000Z"
}
```

- `title` 必填，去除首尾空格后为 1 至 150 个字符。
- `description` 选填，最多 2000 个字符。
- `assigneeUserId` 必填，必须是当前项目成员；Owner 可以把任务分配给自己。
- `priority` 必填，只允许 `low`、`medium`、`high`、`urgent`。
- `tag` 选填，只允许单个 `功能`、`Bug`、`优化`、`文档`、`测试` 或 `UI`。
- `dueAt` 选填，使用 ISO 8601 时间字符串；填写时必须晚于当前时间。
- 客户端提交的 `projectId`、`creatorUserId`、`status` 不参与业务判断。创建人由 JWT 当前用户确定，新任务状态固定为 `todo`。

创建和编辑都只允许项目状态为 `active` 的 Owner 执行。模块五只允许编辑或重新分配状态为 `todo` 的任务；`doing`、`submitted`、`done`、`overdue` 不允许通过编辑接口直接修改或改派。

成功后返回 `data.task`。字段包括：`id`、`projectId`、`projectName`、`projectStatus`、`title`、`description`、负责人和创建人的 ID/用户名/昵称、`priority`、`status`、`tag`、`dueAt`、`submitContent`、`rejectionReason`、`submittedAt`、`reviewerUserId`、`reviewedAt`、`completedAt`、`createdAt`、`updatedAt`。未设置的可选字段返回 `null`。

#### 4.5.2 任务列表和详情

`GET /api/projects/:projectId/tasks` 对 Owner 和 Member 开放：两者都可以查看当前项目全部任务，只有 Owner 会在页面获得创建、编辑和改派入口。该列表支持以下查询参数：

- `page`：页码，默认 `1`；`pageSize`：每页数量，默认 `10`，最大 `100`。
- `status`：`todo`、`doing`、`submitted`、`done`、`overdue`。
- `assigneeUserId`：当前项目成员的用户 ID。
- `priority`：`low`、`medium`、`high`、`urgent`。
- `tag`：单个任务标签。
- `keyword`：搜索任务标题或描述，最多 100 个字符。

筛选条件按“同时满足”组合，默认按创建时间倒序。列表统一返回：

```json
{
  "code": 0,
  "message": "项目任务获取成功",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 10
  }
}
```

`GET /api/tasks` 只返回当前 JWT 用户作为负责人的任务，并且只显示该用户当前仍是成员的项目；服务端不采用客户端传来的 `assigneeUserId`，防止借此查询其他成员任务。它支持其余分页和筛选参数。

`GET /api/tasks/:taskId` 先反查任务所属项目，再校验当前用户是否是该项目成员；项目不存在、任务不存在或当前用户不是成员时统一返回 `40401`。

#### 4.5.3 模块五错误规则

| 场景 | HTTP 状态码 | 业务错误码 | 错误信息 |
| --- | ---: | ---: | --- |
| 路径 ID、分页或请求字段格式不正确 | 400 | `40001` | 对应的明确参数错误信息 |
| 当前用户不是项目 Owner | 403 | `40301` | 仅项目负责人可以创建、编辑或分配任务 |
| 项目/任务不存在，或当前用户不是项目成员 | 404 | `40401` | 项目不存在或你不是项目成员；或任务不存在或你不是所属项目成员 |
| 指定负责人不是当前项目成员 | 404 | `40403` | 任务负责人必须是当前项目成员 |
| 项目不是 `active` | 409 | `40904` | 项目当前状态不允许创建或编辑任务 |
| 尝试编辑非 `todo` 任务 | 409 | `40907` | 当前任务状态不允许编辑或重新分配 |

认证失败继续使用公共约定中的 `40102`、`40103`。

#### 4.5.4 模块六：开始任务

`POST /api/tasks/:taskId/start` 不接收请求体。当前登录用户必须仍是任务所属项目成员，并且其用户 ID 必须等于 `tasks.assignee_user_id`。

只有 `active` 项目允许开始任务；只允许 `todo` 或 `overdue` 状态流转为 `doing`。成功后返回更新后的 `data.task`。

失败规则：

| 场景 | HTTP 状态码 | 业务错误码 | 错误信息 |
| --- | ---: | ---: | --- |
| `taskId` 不是正整数 | 400 | `40001` | 任务 ID 必须是正整数 |
| 任务不存在或当前用户不是所属项目成员 | 404 | `40401` | 任务不存在或你不是所属项目成员 |
| 当前用户不是任务负责人 | 403 | `40302` | 仅任务负责人可以开始任务 |
| 项目不是 `active` | 409 | `40904` | 项目当前状态不允许开始任务 |
| 任务不是 `todo/overdue` | 409 | `40908` | 当前任务状态不允许开始 |

模块六当前已经完成“开始任务”的前后端闭环；node-cron 定时逾期处理尚未实现，因此模块六整体仍未完成。

#### 4.5.5 模块七：提交与审核

提交任务请求字段为可选的 `submitContent`，去除首尾空格后最多 10000 个字符。提交成功时服务端同时写入 `status=submitted` 和 `submitted_at`，并清空上一轮驳回和审核结果。

```json
{
  "submitContent": "已完成登录接口，并补充了参数校验和测试说明。"
}
```

驳回请求必须提交 `reason`，去除首尾空格后不能为空，最多 500 个字符。

```json
{
  "reason": "参数边界测试尚未补齐，请完善后重新提交。"
}
```

审核人由当前登录用户确定，客户端不提交 `reviewerUserId`。审核通过或驳回时，服务端写入 `reviewer_user_id` 和 `reviewed_at`；审核通过时同时写入 `completed_at`。

权限和状态规则：

- `POST /api/tasks/:taskId/submit`：只允许 Assignee 执行 `doing -> submitted`。
- `POST /api/tasks/:taskId/approve`：只允许项目 Owner 执行 `submitted -> done`。
- `POST /api/tasks/:taskId/reject`：只允许项目 Owner 执行 `submitted -> doing`。
- 三个接口只允许在 `active` 项目中执行。
- 状态校验和更新在同一事务中完成，并使用 `FOR UPDATE` 与带旧状态条件的 `UPDATE` 防止并发覆盖。

失败规则：

| 场景 | HTTP 状态码 | 业务错误码 | 错误信息 |
| --- | ---: | ---: | --- |
| 路径 ID、提交说明或驳回原因格式不正确 | 400 | `40001` | 对应的明确参数错误信息 |
| 任务不存在或当前用户不是所属项目成员 | 404 | `40401` | 任务不存在或你不是所属项目成员 |
| 非 Assignee 提交任务 | 403 | `40302` | 仅任务负责人可以提交任务 |
| 非 Owner 审核任务 | 403 | `40301` | 仅项目负责人可以审核任务 |
| 项目不是 `active` | 409 | `40904` | 项目当前状态不允许提交或审核任务 |
| 提交非 `doing` 任务 | 409 | `40909` | 当前任务状态不允许提交 |
| 审核非 `submitted` 任务 | 409 | `40910` | 当前任务状态不允许审核 |

模块七后端接口已经实现；前端提交、通过和驳回交互尚未接入，因此模块七整体仍未完成。

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

下表描述第一版最终业务闭环。模块五已经实现任务创建；模块六已实现开始任务但定时逾期尚未实现；模块七后端提交审核接口已实现。通知和操作日志会分别在模块 10、模块 12 接入。

| 动作 | 状态变化 | 通知 | 操作日志 |
| --- | --- | --- | --- |
| 创建任务 | 初始为 `todo` | 模块 10 接入 | 模块 12 接入 |
| 开始任务 | `todo/overdue -> doing` | 无 | 模块 12 接入 |
| 提交任务 | `doing -> submitted` | 模块 10 接入 | 模块 12 接入 |
| 审核通过 | `submitted -> done` | 模块 10 接入 | 模块 12 接入 |
| 审核驳回 | `submitted -> doing` | 模块 10 接入 | 模块 12 接入 |
| 定时逾期 | `todo/doing -> overdue` | 模块 10 接入 | 模块 12 接入 |
| 完成项目 | `active -> finished` | 无 | 模块 12 接入 |
| 归档项目 | `finished -> archived` | 模块 10 接入 | 模块 12 接入 |

状态变化、通知和日志必须由 service 协调；controller 不直接修改数据库。

## 6. 第一版不提供

- WebSocket 或消息队列相关接口
- 管理员、组织、部门和角色配置接口
- 第三方登录和手机验证码接口
- 文件版本、聊天、邮件通知接口
