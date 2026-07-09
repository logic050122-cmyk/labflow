# 开发日志

本文档按日期记录已经发生的变更，不记录尚未实施的计划。

## 2026-06-20

### 前端依赖安装与构建验证
- 发现 `web` 目录仅存在 `package.json`，缺少 `node_modules` 与 `package-lock.json`，导致 `npm.cmd run typecheck` 报错 `vue-tsc` 不存在。
- 在当前 Windows PowerShell 环境中，直接执行 `npm` 会命中 `npm.ps1` 并被执行策略拦截，因此本次统一改用 `npm.cmd` 进行依赖安装和脚本验证，未修改系统执行策略。
- 执行 `web` 目录下的 `npm.cmd install` 后，成功安装前端依赖并生成 `web/package-lock.json`，审计结果为 0 个已知漏洞。
- 安装完成后，`npm.cmd run typecheck` 通过；首次执行 `npm.cmd run build` 因沙箱环境触发 `esbuild` 子进程 `spawn EPERM` 失败。
- 经提权重试后，前端 `vite build` 成功，确认剩余问题来自执行环境权限而非项目依赖配置错误。
- 同时验证 `server` 目录的 `npm.cmd run typecheck` 与 `npm.cmd run build` 均已通过，本次未修改任何业务代码或接口设计。

### 项目计划书归档

- 将原始项目计划书整理为 `docs/PROJECT_PLAN.md`，作为初始化文档的需求来源。

### 初始化文档建立

- 创建 `docs/ARCHITECTURE.md`，定义单体前后端分离架构、模块边界和分层原则。
- 创建 `docs/DATABASE.md`，定义核心实体、关系、字段方向和索引建议。
- 创建 `docs/API.md`，定义 REST 接口模块、统一响应和权限规则。
- 创建 `docs/TODO.md`，拆分后续开发阶段和验收顺序。
- 创建 `docs/DEV_LOG.md`，用于持续记录项目变更。

### 初始化文档完善

- 统一技术栈为 Vue 3 + TypeScript + Node.js + Express + TypeScript + MySQL，并补充项目已确定的基础依赖。
- 统一项目角色为 `Owner` 和 `Member`，明确角色只在项目成员关系中生效。
- 统一任务状态为 `todo`、`doing`、`submitted`、`done`、`overdue`，修正原 `pending_review` 命名冲突。
- 明确后端采用按业务模块组织的 routes/controller/service/repository/validator/types 分层。
- 明确前端使用 `views`、`components`、`api`、`stores`、`router`、`types`、`utils` 分层。
- 细化数据库字段、约束、索引、事务和删除策略，第一版邀请码直接保存在项目表。
- 细化 API 请求路径、权限标记、状态副作用和分页响应契约。
- 将 TODO 改为按模块实施和验收的清单，并标记初始化文档阶段已完成。
- 再次确认第一版不做 WebSocket、消息队列、复杂组织架构、第三方登录、手机验证码和管理员后台。
- 本次仅修改初始化文档，未创建或修改任何业务代码。

### 后端基础工程初始化

- 初始化 `server/package.json` 和 TypeScript 编译配置，采用 Node.js + Express + TypeScript。
- 安装最小基础依赖并生成 `server/package-lock.json`，当前依赖审计无已知漏洞。
- 创建 `server/src/app.ts` 和 `server/src/server.ts`，分离 Express 应用组装与进程启动。
- 创建环境变量配置和 MySQL 连接池配置，启动时校验数据库连接，退出时关闭连接池。
- 创建统一成功响应、应用错误、404 处理和全局错误处理中间件。
- 预留空的 `server/src/modules` 目录，后续业务模块按架构文档逐个加入。
- 同步更新 `docs/TODO.md`，标记已完成的后端基础工程事项。
- 本次未创建用户、项目、任务或其他具体业务模块，也未新增业务接口。

### 前端基础工程初始化

- 初始化 `web` 下的 Vue 3 + Vite + TypeScript 工程配置，仅声明依赖，未执行依赖安装。
- 配置 Vue Router、Pinia 和 Axios 通用请求封装，未调用任何后端业务接口。
- 建立 `views`、`components`、`api`、`stores`、`router`、`types`、`utils` 和 `layouts` 目录。
- 创建基础响应式 Layout、公共页面占位组件和全局样式。
- 将基础、Layout 和页面样式分文件维护，避免单个样式文件超过 300 行。
- 创建登录、注册、工作台、项目列表、项目详情、我的任务、通知中心和个人中心占位页面。
- 同步更新 `docs/TODO.md`，标记已完成的前端基础工程事项。
- 本次未安装依赖，未实现认证、项目、任务、通知等具体业务逻辑。

### 第一版开发顺序固定

- 根据 `PROJECT_PLAN.md` 重整 `docs/TODO.md`，固定第一版 12 个业务模块的开发顺序。
- 为每个模块补充开发目标、前后端目录边界、数据库表、完成标准和前序依赖。
- 将通知和操作日志定义为后置集成模块，分别补齐前序业务事件和关键操作记录。
- 推荐第一阶段依次完成开发前置条件、用户注册登录、创建项目、邀请码加入项目和项目成员管理。
- 明确排除管理员后台、WebSocket、消息队列、第三方登录、手机验证码、甘特图和工时统计等范围外功能。
- 本次仅修改开发顺序文档和开发日志，未创建或修改任何业务代码。

### 基础代码注释完善

- 为后端应用组装、启动流程、环境变量、MySQL 连接池和统一错误处理补充中文说明。
- 为前端入口、Vite、路由、Pinia、Axios、Layout、公共类型和样式分层补充中文说明。
- 注释重点解释代码职责和设计原因，未机械重复每一行代码含义。
- 本次只增加注释，未修改运行逻辑，未安装依赖，也未新增业务代码。

### 数据库设计局部调整

- 将 `project_members.role` 的存储值统一为小写 `owner`、`member`。
- 取消在 `project_members` 中强制唯一 Owner 的设计，项目负责人以 `projects.owner_user_id` 为准。
- 为 `tasks` 增加 `submit_content`、`reviewer_user_id`、`reviewed_at`。
- 为 `operation_logs` 增加 `target_name`，保存操作发生时的目标名称快照。
- 其他数据库表和字段保持不变，本次未修改任何业务代码。

### API 设计一致性调整

- 统一接口请求和响应中的项目角色值为小写 `owner`、`member`。
- 明确项目负责人权限以 `projects.owner_user_id` 为判断依据。
- 为任务提交接口增加可选字段 `submitContent`，并说明审核字段由服务端写入。
- 增加完成项目接口，形成 `active -> finished -> archived` 的项目状态流转。
- 补充无 `projectId` 资源接口的所属项目查询和后端权限校验规则。
- 本次仅修改 API 设计文档和开发日志，未生成 Swagger，也未修改任何业务代码。

### 前端请求封装完善

- Axios 请求发送前自动读取 `localStorage` 中的 `labflow_token`，并添加 Bearer Token。
- HTTP 响应返回后统一检查后端业务 `code`，只有 `code=0` 才视为成功。
- 新增 `ApiBusinessError` 保留后端业务错误码和错误信息，方便页面后续统一提示。
- 本次未新增具体业务接口，也未修改后端认证逻辑。

### 架构权限说明调整

- Owner 判断统一以 `projects.owner_user_id` 为准，普通成员关系仍通过 `project_members` 校验。
- 明确项目文件仅 Owner 可上传，任务附件允许项目成员上传。
- 明确前端权限仅控制展示，后端 service 必须兜底校验角色和资源归属。
- 本次仅小幅调整架构文档，未修改模块结构或业务代码。

### 第一版数据库迁移建立

- 新增 `server/migrations/001_initial_schema.sql`，用于创建 `labflow` 数据库及
  `users`、`projects`、`project_members`、`tasks`、`task_comments`、`files`、
  `notifications`、`operation_logs` 8 张表。
- 迁移按 `docs/DATABASE.md` 落实字段、唯一约束、状态检查、外键和查询索引，
  使用 MySQL 8.0、InnoDB 与 `utf8mb4`。
- 更新 `docs/DATABASE.md`，记录迁移位置、Navicat 执行方式和执行后核对语句。
- 更新 `docs/TODO.md`，标记第一版数据库迁移已建立。
- 本次未修改业务代码、接口、认证逻辑或数据库连接配置；迁移已在本机 MySQL 8.0
  执行，并核对 `labflow` 数据库的 8 张表均已创建。

## 2026-06-21
### 简化认证前端代码

- 保持登录页、注册页的样式、素材和接口地址不变，简化现有认证代码的阅读难度。
- 通用请求函数改为直接返回接口 `data`，删除当前阶段不需要的自定义业务错误类和响应拦截器。
- 注册页面直接调用注册 API；登录状态仍由 Pinia store 管理，避免把非全局的注册动作放入全局状态。
- 表单校验改为直观的 `if` 判断，删除嵌套三元表达式和模板中的复杂事件表达式。
- 邮箱按照接口文档调整为可选字段；填写邮箱时仍会校验格式。

### 登录与注册改用 Element Plus

- 安装 Element Plus，并在前端入口统一注册组件库及基础样式。
- 登录和注册页面改用 `el-form`、`el-form-item`、`el-input` 和 `el-button`，保留原有布局、颜色、Logo 和插图。
- 删除提前抽象的 `AuthField.vue`，让字段、校验、提交和错误处理都能直接在页面文件中阅读。
- 继续使用普通 `if` 完成表单校验，不引入复杂校验规则对象、hooks 或新的通用表单封装。
- 本次未修改认证接口、Token 逻辑、后端或数据库。

## 2026-06-24

### 增加前后端一键启动脚本

- 在项目根目录新增 `start-dev.cmd`，双击后分别打开前端和后端开发终端。
- 脚本通过自身所在目录定位 `web` 和 `server`，不写死项目绝对路径。
- 脚本使用 `npm.cmd run dev`，避免 Windows PowerShell 执行策略拦截 `npm.ps1`。
- 启动前检查前后端依赖目录；缺少 `server/.env` 时只提示警告，不自动创建或修改数据库配置。

### 简化认证页面提交逻辑

- 删除登录和注册页面的重复提交拦截、提交状态变量及按钮加载状态。
- 页面当前只保留表单校验、接口请求、成功提示和失败提示；连续点击防护留到后期体验优化阶段。
- 本次未修改认证接口、Token、样式、后端或数据库。
