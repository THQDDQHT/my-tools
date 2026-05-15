# 多工具根目录结构设计

## 目标

将仓库根目录调整为多个独立工具的集合。每个工具可以使用自己的技术栈、依赖文件、测试和运行方式；根目录只承担集合入口、共享文档和通用忽略规则的职责。

## 已确认决策

- 工具目录保持在仓库根目录一级，不新增 `tools/` 包裹层。
- `cli_launcher/` 保持现有 Tauri/Rust/React 独立项目位置，不搬迁。
- `word2md/` 调整为完全独立的 Python 项目，拥有自己的 `pyproject.toml`、锁文件、源码包和测试。
- 根目录不再作为 Python 项目，因此根目录的 Python 专属入口与依赖配置需要迁入 `word2md/` 或移除。
- 保留根目录 `docs/` 作为仓库级文档位置。

## 目标目录结构

```text
my-tools/
  cli_launcher/
    package.json
    pnpm-lock.yaml
    src/
    src-tauri/
    ...
  word2md/
    pyproject.toml
    uv.lock
    word2md/
      __init__.py
      converter.py
      gui.py
    tests/
      ...
  docs/
    superpowers/
      specs/
      plans/
  .gitignore
  README.md
```

## 根目录职责

根目录只保留跨工具共享的内容：

- `.gitignore`：覆盖仓库内不同技术栈的通用生成物，如 Python cache、Node `node_modules`、Tauri/Rust `target` 等。
- `docs/`：保存仓库级设计文档、实施计划和说明。
- `README.md`：如果存在，应说明这是工具集合，并列出各工具的进入目录与运行命令。

根目录不再保留只属于 `word2md` 的文件：

- 根目录 `pyproject.toml` 应迁入 `word2md/pyproject.toml` 并改名为 Word2MD 项目配置。
- 根目录 `uv.lock` 如存在，应迁入 `word2md/uv.lock`，并在 `word2md/` 内重新校验。
- 根目录 `main.py` 应移除或改由 `word2md` 内部入口替代。

## `word2md` 项目结构

`word2md/` 作为独立 Python 项目，采用“项目目录 + 同名源码包”结构：

```text
word2md/
  pyproject.toml
  uv.lock
  word2md/
    __init__.py
    converter.py
    gui.py
  tests/
    test_converter.py
```

`word2md/pyproject.toml` 应只声明 Word 转 Markdown 工具相关信息：

- 项目名使用 `word2md`。
- 依赖保留 `python-docx` 和 `markdownify`。
- 命令行入口保留 `word2md = "word2md.gui:main"`。
- 如需测试配置，应限定在该 Python 项目内。

源码移动后，`word2md/gui.py` 中的导入继续使用包内绝对导入：

```python
from word2md.converter import ConversionResult, convert
```

从 `word2md/` 目录运行时，该导入应解析到 `word2md/word2md/` 源码包。

## `cli_launcher` 项目边界

`cli_launcher/` 已经是独立 Tauri 项目，本次结构重构不改变它的技术栈和目录位置。

本次重构不应回退或覆盖 `cli_launcher` 中已经发生的亮色主题、按钮布局、图标配置、Tauri 打包和 Windows 子系统修复等改动。只有在移动仓库级文件确实影响 `cli_launcher` 的忽略规则或说明文档时，才触碰相关文件。

## 文档与运行方式

仓库级说明应从“根目录直接运行某个 Python 工具”调整为“进入具体工具目录后运行”：

- `cli_launcher`：进入 `cli_launcher/` 后使用 pnpm/Tauri 命令运行或打包。
- `word2md`：进入 `word2md/` 后使用 uv/Python 命令运行。

如果更新 README，应避免把任一工具描述成根项目的默认入口。

## 测试与验证

实施完成后应验证：

- 在 `word2md/` 目录内，Python 项目可以解析依赖和入口。
- `word2md` 现有转换逻辑测试通过。
- `word2md` GUI 入口可以被导入，避免迁移后 import 路径错误。
- 根目录不再需要 Python 项目配置即可表达仓库结构。
- 如果未修改 `cli_launcher` 源码，则不需要重新测试全部 Tauri 功能；如果改动了其配置或文档引用，应运行对应检查。

## 不在本次范围

- 不重新设计 `word2md` 的 GUI 或转换逻辑。
- 不修改 `cli_launcher` 的 UI、启动逻辑、图标或打包流程。
- 不新增跨工具统一构建系统。
- 不引入 monorepo 管理工具。
- 不把工具移动到 `tools/` 子目录。

## 验收标准

- 根目录清晰表达“工具集合”而不是单一 Python 项目。
- `cli_launcher/` 和 `word2md/` 都能作为独立工具目录理解和维护。
- `word2md` 的 Python 依赖、入口和测试都收拢在 `word2md/` 内。
- 迁移后没有遗留的根目录 Python 入口误导使用者。
- 已有 `cli_launcher` 改动不被重构误伤。
