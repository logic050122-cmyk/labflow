# 第一版开发顺序

## 1. 文档目标

本文档根据 `PROJECT_PLAN.md` 固定第一版开发顺序和模块边界。后续一次只开发一个模块，当前模块达到完成标准后，才能进入下一个模块。

第一版核心闭环固定为：

> 用户注册登录 -> 创建项目 -> 邀请码加入项目 -> 项目成员管理 -> 任务创建与分配 -> 任务状态流转 -> 任务提交审核 -> 评论 -> 文件上传 -> 站内通知 -> 统计 -> 操作日志

## 2. 已完成的初始化工作

- [x] 整理项目计划书和初始化文档
- [x] 初始化 Node.js + Express + TypeScript 后端骨架
- [x] 配置后端环境变量、MySQL 连接、统一响应和错误处理
- [x] 初始化 Vue 3 + Vite + TypeScript 前端骨架
- [x] 配置 Vue Router、Pinia 和 Axios 通用封装
- [x] 创建基础 Layout 和页面占位结构

说明：以上仅为工程骨架，不代表任何业务模块已经完成。

## 3. 开发前置条件

开始第一个业务模块前，应先完成以下基础事项：

- [x] 安装并锁定前端依赖，完成类型检查和构建验证
- [x] 建立后端按业务模块组织的目录约定
- [x] 根据 `DATABASE.md` 建立第一版数据库迁移
- [x] 配置 JWT 认证中间件入口
- [ ] 配置项目成员关系和 Owner 权限校验入口
- [ ] 统一前端状态枚举、文本和颜色映射

前置条件只建立公共能力，不实现用户、项目、任务等业务。

## 4. 固定开发顺序

| 顺序 | 模块 | 核心产出 | 是否直接依赖前一模块 |
| --- | --- | --- | --- |
| 1 | 用户注册登录 | 用户身份和登录态 | 否，依赖开发前置条件 |
| 2 | 创建项目 | 项目及 Owner 成员关系 | 是 |
| 3 | 邀请码加入项目 | Member 加入项目 | 是 |
| 4 | 项目成员管理 | 成员列表、权限和移除 | 是 |
| 5 | 任务创建与分配 | Owner 创建并指派任务 | 是 |
| 6 | 任务状态流转 | `todo/overdue -> doing` 和逾期处理 | 是 |
| 7 | 任务提交审核 | `doing -> submitted -> done/doing` | 是 |
| 8 | 评论 | 任务内沟通记录 | 是 |
| 9 | 文件上传 | 项目文件和任务附件 | 否直接依赖，固定在评论之后开发 |
| 10 | 站内通知 | 业务事件通知和已读状态 | 否直接依赖文件，依赖模块 2 至 7 的事件 |
| 11 | 统计 | 项目、成员和个人任务统计 | 否直接依赖通知，依赖项目与任务数据 |
| 12 | 操作日志 | 关键业务动作追踪 | 否直接依赖统计，依赖全部前序业务动作 |

## 5. 模块详细边界

### 模块 1：用户注册登录

- [x] 模块完成
- [x] 注册接口：完成 `POST /api/auth/register` 的参数校验、用户名重复检查、密码哈希和用户写入
- [x] 登录接口：校验账号密码并返回 JWT
- [x] JWT 配置
- [x] 认证中间件
- [x] 当前用户接口 `/api/auth/me`
- [x] 前端登录成功跳转和登录态恢复
- 开发目标：完成账号注册、账号密码登录、JWT 登录态、获取当前用户和退出登录；不做第三方登录和手机验证码。
- 涉及后端目录：`server/src/modules/auth`、`server/src/modules/users`、`server/src/middlewares`。
- 涉及前端目录：`web/src/views/LoginView.vue`、`web/src/views/RegisterView.vue`、`web/src/api`、`web/src/stores`、`web/src/router`、`web/src/types`。
- 涉及数据库表：`users`。
- 完成标准：用户可注册并登录；密码只保存哈希；受保护接口能识别当前用户；无效或过期 Token 返回明确认证错误；前端登录态和路由守卫可用。
- 是否依赖前一个模块：否；仅依赖第 3 节开发前置条件。

### 模块 2：创建项目

- [x] 模块完成
- [x] 第一步：固定创建项目请求字段和前后端基础校验
- [x] 第二步：接入创建项目接口，并在事务中写入项目和 Owner 成员关系
- [x] 第三步：实现当前用户项目列表接口和前端列表加载
- [x] 第四步：实现项目详情接口、成员访问校验和前端详情页
- [x] 第五步：补齐 Owner 编辑项目接口、权限校验和前端编辑表单
- 开发目标：登录用户创建、查看和编辑项目；创建项目时自动成为该项目唯一 Owner。
- 涉及后端目录：`server/src/modules/projects`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/ProjectsView.vue`、`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/stores`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`projects`、`project_members`、`users`。
- 完成标准：创建项目和写入 Owner 成员关系在同一事务完成；项目列表只返回当前用户参与的项目；只有 Owner 可以编辑项目；失败时不留下不完整数据。
- 是否依赖前一个模块：是；依赖模块 1 提供当前登录用户。

### 模块 3：邀请码加入项目

- [x] 模块完成
- [x] 第一步：固定邀请码接口字段、响应结构和错误码
- [x] 第二步：实现 Owner 生成或刷新邀请码后端接口
- [x] 第三步：实现项目详情页邀请码生成、展示和复制
- [x] 第四步：实现用户通过邀请码加入项目后端接口
- [x] 第五步：实现前端“通过邀请码加入”弹窗和项目列表刷新
- [x] 第六步：完成双用户业务验收、文档同步并标记模块完成
- 开发目标：Owner 生成或刷新邀请码，登录用户通过有效邀请码以 Member 身份加入项目。
- 涉及后端目录：`server/src/modules/projects`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/ProjectsView.vue`、`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`projects`、`project_members`、`users`。
- 完成标准：邀请码唯一且可刷新；无效邀请码返回明确错误；用户不能重复加入同一项目；加入后角色固定为 Member；加入通知和日志延后到模块 10、12 接入。
- 是否依赖前一个模块：是；必须先存在项目及其 Owner。

### 模块 4：项目成员管理

- [ ] 模块完成
- 开发目标：项目成员查看成员列表，Owner 管理 Member，并统一项目内 Owner/Member 权限判断。
- 涉及后端目录：`server/src/modules/members`、`server/src/modules/projects`、`server/src/middlewares`。
- 涉及前端目录：`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`project_members`、`projects`、`users`、`tasks`。
- 完成标准：Owner 和 Member 都能查看成员；只有 Owner 能移除 Member；不能移除 Owner；存在未完成任务的 Member 不可被移除；后端权限校验不依赖前端按钮显示。
- 是否依赖前一个模块：是；成员管理基于已经建立的 Owner 和 Member 关系。

### 模块 5：任务创建与分配

- [ ] 模块完成
- 开发目标：Owner 创建、编辑、分配和筛选任务，Member 查看分配给自己的任务。
- 涉及后端目录：`server/src/modules/tasks`、`server/src/modules/projects`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/MyTasksView.vue`、`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`tasks`、`projects`、`project_members`、`users`。
- 完成标准：只有 Owner 可创建和分配任务；负责人必须是当前项目成员；新任务状态固定为 `todo`；列表支持分页及状态、负责人、优先级、标签和关键词筛选。
- 是否依赖前一个模块：是；任务分配依赖可靠的项目成员和角色判断。

### 模块 6：任务状态流转

- [ ] 模块完成
- 开发目标：Member 开始处理自己的任务，并通过 node-cron 标记逾期任务；状态规则集中在 service 层。
- 涉及后端目录：`server/src/modules/tasks`、`server/src/jobs`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/MyTasksView.vue`、`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`tasks`、`project_members`、`projects`。
- 完成标准：只允许 Assignee 执行 `todo/overdue -> doing`；定时任务只把到期未完成的 `todo/doing` 标记为 `overdue`；非法流转返回 `409xx`；归档项目不能继续处理任务。
- 是否依赖前一个模块：是；必须先有已创建并分配的任务。

### 模块 7：任务提交审核

- [ ] 模块完成
- 开发目标：Member 提交任务，Owner 审核通过或填写原因驳回，形成任务主闭环。
- 涉及后端目录：`server/src/modules/tasks`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/MyTasksView.vue`、`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`tasks`、`projects`、`project_members`。
- 完成标准：只允许 Assignee 执行 `doing -> submitted`；只允许 Owner 执行 `submitted -> done` 或 `submitted -> doing`；驳回必须填写原因；Member 不能直接改为 `done`；通过后记录完成时间。
- 是否依赖前一个模块：是；审核建立在任务状态流转规则之上。

### 模块 8：评论

- [ ] 模块完成
- 开发目标：项目成员在任务下查看和添加评论，支持评论人删除自己的评论，并保留 Owner 管理权限。
- 涉及后端目录：`server/src/modules/comments`、`server/src/modules/tasks`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`task_comments`、`tasks`、`project_members`、`users`。
- 完成标准：评论只属于任务，不做回复树或聊天室；只有项目成员能查看和新增；评论人和项目 Owner 可按规则删除；归档项目不允许新增评论。
- 是否依赖前一个模块：是；评论依赖任务详情和项目成员权限。

### 模块 9：文件上传

- [ ] 模块完成
- 开发目标：使用 Multer 上传、查询、下载和删除项目文件及任务附件，MySQL 只保存文件元数据。
- 涉及后端目录：`server/src/modules/files`、`server/src/modules/projects`、`server/src/modules/tasks`、`server/src/modules/members`、`server/src/config`。
- 涉及前端目录：`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`files`、`projects`、`tasks`、`project_members`、`users`。
- 完成标准：区分项目文件和任务附件；校验文件大小、类型和资源归属；服务端生成安全存储名；上传人或 Owner 可按规则删除；不做文件版本控制。
- 是否依赖前一个模块：否直接依赖评论；固定在模块 8 后开发，并复用项目、任务和成员权限。

### 模块 10：站内通知

- [ ] 模块完成
- 开发目标：补齐加入项目、任务分配、提交审核、审核结果、逾期和项目归档等站内通知，并提供未读数量和已读管理。
- 涉及后端目录：`server/src/modules/notifications`，以及触发通知的 `projects`、`members`、`tasks` service。
- 涉及前端目录：`web/src/views/NotificationsView.vue`、`web/src/api`、`web/src/stores`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`notifications`、`users`、`projects`、`tasks`。
- 完成标准：通知随业务动作可靠写入；用户只能查看和修改自己的通知；支持分页、未读数量、单条已读和全部已读；前端使用普通 HTTP 查询，不使用 WebSocket。
- 是否依赖前一个模块：否直接依赖文件；依赖模块 2 至 7 已形成的通知事件。

### 模块 11：统计

- [ ] 模块完成
- 开发目标：按现有业务数据计算项目进度、任务状态分布、成员完成率和个人任务统计。
- 涉及后端目录：`server/src/modules/stats`、`server/src/modules/projects`、`server/src/modules/tasks`、`server/src/modules/members`。
- 涉及前端目录：`web/src/views/DashboardView.vue`、`web/src/views/ProjectDetailView.vue`、`web/src/views/ProfileView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`projects`、`tasks`、`project_members`、`users`、`files`。
- 完成标准：项目进度按 `done / 全部任务 * 100%` 计算，无任务返回 0；Owner 可查看成员统计；Member 只能查看允许范围；结果与任务实际状态一致；图表支持空数据。
- 是否依赖前一个模块：否直接依赖通知；依赖模块 2 至 7 产生的项目和任务数据。

### 模块 12：操作日志

- [ ] 模块完成
- 开发目标：补齐创建项目、加入项目、成员管理、任务流转、审核、文件上传、逾期和归档等关键操作记录。
- 涉及后端目录：`server/src/modules/logs`，以及产生关键动作的各业务 service。
- 涉及前端目录：`web/src/views/ProjectDetailView.vue`、`web/src/api`、`web/src/components`、`web/src/types`。
- 涉及数据库表：`operation_logs`、`users`、`projects`、`tasks`。
- 完成标准：日志由业务 service 写入；描述包含操作人、动作和目标；系统定时任务允许无操作人；项目成员可分页查看项目日志；日志不提供修改和删除接口；不记录普通页面访问。
- 是否依赖前一个模块：否直接依赖统计；依赖全部前序模块已经确定的关键业务动作。

## 6. 第一版最终验收

- [ ] 完整跑通“注册登录 -> 创建项目 -> 邀请码加入 -> 成员管理 -> 分配任务 -> 开始处理 -> 提交 -> 审核 -> 评论/附件 -> 通知 -> 统计 -> 日志”。
- [ ] 权限角色只有 Owner 和 Member，所有项目权限均由后端校验。
- [ ] 任务状态只使用 `todo`、`doing`、`submitted`、`done`、`overdue`。
- [ ] 分页、响应、错误码、时间和状态映射符合项目文档。
- [ ] 项目归档后保留历史数据并停止写入协作内容。

## 7. 第一版范围边界

以下内容不得加入上述模块，也不为其预留业务代码：

- 管理员后台、Admin、Maintainer、Super Admin 和复杂组织架构
- WebSocket、消息队列、微服务和 DDD
- 第三方登录、手机验证码和邮件通知
- 甘特图、工时统计、绩效评分和 AI 自动分析
- 文件版本控制和复杂聊天室

## 8. 推荐的第一阶段开发顺序

第一阶段目标是先打通“用户进入项目”的最小闭环，固定顺序如下：

1. 完成第 3 节开发前置条件。
2. 模块 1：用户注册登录。
3. 模块 2：创建项目并自动建立 Owner 关系。
4. 模块 3：邀请码加入项目并建立 Member 关系。
5. 模块 4：项目成员列表、角色权限和成员移除。

第一阶段验收结果：两个用户都能注册登录；用户 A 创建项目后成为 Owner；用户 B 使用邀请码加入后成为 Member；双方能查看成员列表；只有 Owner 能管理项目成员。

## 9. 文档维护规则

- 每次只开发一个模块，达到完成标准后再勾选“模块完成”。
- 新增或修改接口时同步更新 `API.md`。
- 新增或修改表、字段或索引时同步更新 `DATABASE.md`。
- 模块边界发生变化时同步更新 `ARCHITECTURE.md`。
- 每次完成开发或文档调整后同步更新 `DEV_LOG.md`。
