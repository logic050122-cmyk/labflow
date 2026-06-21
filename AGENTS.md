# AGENTS.md

## 项目定位

本项目是实验室 / 工作室项目协作管理平台。

核心流程：

用户注册登录 → 创建项目或加入项目 → Owner 创建任务并分配成员 → Member 处理任务 → Member 提交完成 → Owner 审核 → 系统更新进度 → 发送通知 → 记录操作日志。

第一版目标是完成结构清晰、功能完整、便于答辩和后续扩展的单体 Web 应用。

## 技术栈

前端：

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios
- Element Plus
- ECharts

后端：

- Node.js
- Express
- TypeScript
- MySQL
- JWT
- Multer
- node-cron

第一版不使用：

- WebSocket
- 消息队列
- 微服务
- DDD
- 手机验证码
- 第三方登录
- 管理员后台

## 角色规则

系统只保留项目角色：

- Owner：项目负责人
- Member：项目成员

规则：

1. 用户创建项目后，在该项目中是 Owner。
2. 用户加入项目后，在该项目中是 Member。
3. 权限判断必须基于当前项目角色。
4. 不做 Admin、Maintainer、Super Admin。
5. 前端隐藏按钮不等于权限控制，后端必须校验权限。

## 后端分层规则

后端按业务模块组织代码。

每个模块建议包含：

- xxx.routes.ts
- xxx.controller.ts
- xxx.service.ts
- xxx.repository.ts
- xxx.types.ts
- xxx.validator.ts

职责：

1. routes 只定义路由。
2. controller 只处理 req、res、参数获取和响应返回。
3. controller 不允许写复杂业务逻辑。
4. controller 不允许直接写 SQL。
5. service 负责业务规则、权限判断、状态流转。
6. repository 只负责数据库操作。
7. repository 不允许写业务判断和权限判断。
8. validator 负责参数校验。
9. types 负责类型定义。
10. middleware 负责认证、权限、错误处理。

## 前端分层规则

前端按功能模块组织代码。

目录职责：

- views：页面级组件
- components：可复用组件
- api：接口请求封装
- stores：Pinia 状态管理
- router：路由
- types：类型定义
- utils：通用工具函数

规则：

1. 页面中不要直接写 axios。
2. 所有请求必须放在 api 目录。
3. 全局状态放在 stores。
4. 重复 UI 必须抽成组件。
5. 状态文本、状态颜色、状态枚举必须统一维护。
6. 页面文件超过 300 行时，需要提示是否拆分。

## 接口规则

1. 后端接口统一返回格式。
2. controller 不允许随意自定义返回结构。
3. 新增接口必须更新 docs/API.md。
4. 分页接口必须包含 list、total、page、pageSize。
5. 错误信息必须明确，不能只返回 error。

## 数据库规则

1. 表名使用小写复数形式。
2. 字段名使用 snake_case。
3. 主键统一使用 id。
4. 外键使用 xxx_id。
5. 核心表必须有 created_at 和 updated_at。
6. 修改数据库必须更新 docs/DATABASE.md。
7. 不允许代码中使用文档里没有的字段。

## 任务状态规则

任务状态：

- todo：待开始
- doing：进行中
- submitted：待审核
- done：已完成
- overdue：已逾期

状态流转：

1. 创建任务后默认 todo。
2. Member 开始处理后变为 doing。
3. Member 提交完成后变为 submitted。
4. Owner 审核通过后变为 done。
5. Owner 审核驳回后回到 doing。
6. 超过截止时间且未完成，可由定时任务标记为 overdue。
7. 状态流转必须在 service 中校验。

## 开发规则

1. 每次只开发一个模块。
2. 不允许一次性开发多个大模块。
3. 不允许随意重构全项目。
4. 不允许修改无关文件。
5. 修改前先阅读 AGENTS.md 和 docs 目录相关文档。不要完整阅读 DEV_LOG.md，除非你需要查询历史问题。
6. 修改前先说明开发计划。
7. 修改后必须说明修改了哪些文件。
8. 修改后必须说明如何测试。
9. 功能开发、业务缺陷修复，以及接口、数据库、依赖、配置或架构变更后，必须更新 docs/DEV_LOG.md。
10. 仅用于消除编辑器提示、补充兼容性类型声明、调整注释、格式或文案，且不改变运行行为和后续开发约定的小更新，可以不更新 docs/DEV_LOG.md。
11. 如果新增接口，必须更新 docs/API.md。
12. 如果修改数据库，必须更新 docs/DATABASE.md。
13. 如果完成 TODO，必须更新 docs/TODO.md。
14. 如果需求不明确，先提出问题，不要直接猜。
15. 如果代码可能变臃肿，先提示重构建议，不要直接大改。

## 代码臃肿控制

以下情况必须提醒用户：

1. 单个文件超过 300 行。
2. controller 中出现大量 if/else 业务判断。
3. service 函数超过 80 行。
4. repository 中出现权限判断。
5. Vue 页面中直接写 axios。
6. 多个页面出现重复表单。
7. 多个地方重复写状态映射。
8. utils 中出现业务逻辑。
9. 一个模块依赖过多其他模块。
10. 一个功能修改超过 10 个文件。

## 禁止行为

1. 不允许绕过 service 直接在 controller 中操作数据库。
2. 不允许用 mock 数据冒充真实接口完成。
3. 不允许随意引入新依赖。
4. 不允许未经说明修改认证逻辑。
5. 不允许未经说明修改数据库连接配置。
6. 不允许未经说明修改全局路由、全局状态、全局样式。
7. 不允许为了让编译通过而注释掉重要逻辑。
8. 不允许忽略 TypeScript 类型错误。

## 每次开发前输出格式

本次开发目标：
- 

需要阅读的文件：
- 

计划修改的文件：
- 

不会修改的内容：
- 

可能影响：
- 

## 每次开发后输出格式

本次完成：
- 

修改文件：
- 

分层自查：
- routes：
- controller：
- service：
- repository：
- docs：

测试方式：
- 

后续建议：
- 
