# LabFlow 认证 UI 视觉验收

- source visual truth: `D:\labflow\docs\ui.docx` 内嵌登录页与注册页设计图
- login implementation screenshot: `%TEMP%\labflow-login-1072x636-final.png`
- register implementation screenshot: `%TEMP%\labflow-register-510x612-final.png`
- viewport: 登录页 `1072 × 636`；注册页 `510 × 612`；移动端补充检查 `390 × 844`
- state: 初始空表单；另外验证空提交错误状态和认证页互相跳转

## Full-view comparison evidence

- 登录页保持约 50/50 分栏，左侧标题、说明、366px 主视觉和版权信息与参考图对齐。
- 登录卡片宽 352px、高约 371px，位置、输入框、按钮和注册链接与参考图一致。
- 注册卡片宽 342px、高约 574px，在参考尺寸下无页面滚动，字段、按钮、分隔线和版权信息顺序一致。
- 移动端切换为单栏，隐藏大幅主视觉，无横向滚动。

## Focused region comparison evidence

- 表单区域已单独核对标签、输入框高度、字段间距、按钮高度、卡片圆角和阴影。
- Logo 使用 `ui.docx` 提供的独立品牌原图，因此图标细节比页面截图中的旧图标复杂，但品牌文字和主色保持一致。
- 登录主视觉为根据参考图生成的独立青蓝科技插图，构图和色调一致，不使用占位图。

## Findings

- 无 P0、P1 或 P2 问题。
- P3：新版 Logo 的烧瓶图标比截图中的简化图标更高；这是采用文档提供品牌素材的预期差异。
- P3：生成的科技插图细节更清晰、青色高光略亮；整体构图和密度符合参考图。

## Patches made since previous QA pass

- 调整登录页品牌区纵向节奏，使标题和 366px 主视觉回到参考位置。
- 将登录卡片高度调整到约 371px。
- 将注册卡片高度调整到约 574px，并消除参考尺寸下的滚动。
- 将超过 300 行的认证样式拆分为公共认证样式和注册页样式。

## Implementation checklist

- [x] 桌面登录页布局
- [x] 注册页布局
- [x] 移动端响应式
- [x] 空表单校验
- [x] 登录/注册路由跳转
- [x] 类型检查与生产构建

final result: passed
