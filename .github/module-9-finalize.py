from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(relative_path: str, old: str, new: str) -> None:
    path = ROOT / relative_path
    content = path.read_text(encoding="utf-8")
    if old not in content:
        raise RuntimeError(f"未找到待替换内容: {relative_path}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


replace_once(
    "docs/TODO.md",
    """### 模块 9：文件上传

- [ ] 模块完成
""",
    """### 模块 9：文件上传

- [x] 模块完成
""",
)

replace_once(
    "docs/TODO.md",
    "- [ ] 完成真实 HTTP + MySQL 文件上传、下载、权限和归档业务验收后，再标记模块完成",
    "- [x] 已完成真实 HTTP + MySQL 文件上传、下载、权限和归档业务验收",
)

replace_once(
    "docs/DEV_LOG.md",
    "- 后端和前端类型检查及生产构建通过；真实 HTTP + MySQL 文件业务验收仍待执行，因此模块九总完成项暂不勾选。",
    "- 后端和前端类型检查、生产构建及真实 HTTP + MySQL 文件业务验收全部通过，模块九已完成。\n- 新增模块九 PR 验证工作流和真实接口验收脚本，覆盖上传类型、成员隔离、下载内容、删除权限和归档只读。",
)
