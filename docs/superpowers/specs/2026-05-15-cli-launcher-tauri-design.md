# cli_launcher Tauri 重写设计

## 目标

在当前仓库新增 `cli_launcher/` Tauri 子项目，用 Rust + Tauri 2 + React + TypeScript 重写 Claude Launcher。新应用命名为 `cli_launcher`，先支持 Claude Code，后续通过 tab 扩展到 Gemini CLI、Codex 或其他 code CLI。

## 范围

包含：

- 新建 `cli_launcher/` 子项目。
- 使用 pnpm 管理前端依赖。
- 使用 Tauri 2、React 18、Vite、TypeScript、Tailwind、Radix/shadcn 风格组件、lucide-react。
- 深色玻璃质感 UI，紫蓝渐变，卡片式布局。
- Claude Code tab 可用。
- 预留 Gemini CLI、Codex、Add CLI tab，先显示 Coming soon。
- 支持选择工作文件夹。
- 支持选择可选 settings 文件；不选择时不传 `--settings`。
- 支持 Bypass permissions mode，默认开启。
- 支持普通启动和管理员权限启动。
- 使用 Windows Terminal 新 tab 承载 Claude Code。
- 保存工作文件夹历史和 settings 文件历史。
- Tauri 窗口默认居中。

不包含：

- 内嵌终端。
- 在 Tauri 窗口内部显示 Claude 会话输出。
- 完整迁移 Python `word2md`。
- 替换当前仓库根目录 Python 配置。
- 实现非 Claude CLI 的真实启动逻辑。

## 项目结构

`cli_launcher/` 是独立 Tauri 子项目：

- `package.json`：pnpm scripts 和前端依赖。
- `src/`：React 前端。
- `src-tauri/`：Rust/Tauri 后端。
- `src-tauri/tauri.conf.json`：窗口配置、权限、bundle 信息。
- `src-tauri/src/main.rs`：Tauri commands，负责启动 CLI 和文件校验。

当前根目录 Python 工具继续保留，现有 `word2md` 不迁移。

## UI 设计

主界面为深色中控台风格：

```text
┌─────────────────────────────────────────────────────────────┐
│ CLI Launcher                                      Settings   │
│ Launch and manage code CLIs in Windows Terminal tabs         │
├─────────────────────────────────────────────────────────────┤
│ [ Claude Code ] [ Gemini CLI ] [ Codex ] [ + Add CLI ]       │
├─────────────────────────────────────────────────────────────┤
│ Claude Code                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Workspace                                               │ │
│ │ E:\MyProjects\my-tools                         Browse   │ │
│ │                                                         │ │
│ │ Settings file                                           │ │
│ │ 不使用 settings                                Browse   │ │
│ │                                                         │ │
│ │ ☑ Bypass permissions mode                               │ │
│ │                                                         │ │
│ │ [ Launch ]   [ Launch as Administrator ]                │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Recent workspaces                                           │
│ • E:\MyProjects\my-tools                                    │
│ • E:\Projects\Platforms\LowCode-All                         │
└─────────────────────────────────────────────────────────────┘
```

UI 文案：

- 普通按钮：`Launch`
- 管理员按钮：`Launch as Administrator`
- 权限模式：`Bypass permissions mode`
- settings 空值：`不使用 settings`

管理员启动旁显示说明：管理员 Terminal 与普通 Terminal 属于不同权限实例，Windows 可能把它们放在不同窗口中。

## 数据模型

前端状态：

```ts
type CliKind = "claude" | "gemini" | "codex" | "custom";

type LaunchOptions = {
  cli: CliKind;
  workspace: string;
  settingsPath?: string;
  bypassPermissions: boolean;
  asAdmin: boolean;
};

type LauncherHistory = {
  workspaces: string[];
  settingsFiles: string[];
};
```

历史记录保存最近 20 个路径，去重后最近使用排在前面。

## 启动行为

普通 Claude 启动：

```text
wt -w 0 nt -d <workspace> claude [--settings <settings>] [--dangerously-skip-permissions]
```

管理员 Claude 启动：

```text
powershell -NoProfile -Command Start-Process wt -Verb RunAs -ArgumentList "-w 0 nt -d '<workspace>' claude ..."
```

Rust 后端负责：

1. 校验 workspace 存在且是目录。
2. settingsPath 存在时校验是文件。
3. 根据 `asAdmin` 选择普通启动或管理员启动。
4. 返回成功或错误消息给前端。

## 文件选择

使用 Tauri dialog 插件：

- workspace：目录选择。
- settings：文件选择，优先显示 JSON 文件，也允许所有文件。

## 历史记录

使用 Tauri store 插件保存：

- `workspaces`
- `settingsFiles`

历史记录更新时机：Rust 后端启动命令成功后，前端更新 store。

## 错误处理

- workspace 为空：前端禁用 Launch 按钮并提示选择工作文件夹。
- workspace 不存在：Rust 返回错误，前端 toast 展示。
- settings 不存在：Rust 返回错误，前端 toast 展示。
- `wt` 不可用：Rust 返回 Windows Terminal 不可用提示。
- 管理员启动被取消：PowerShell/UAC 行为由系统处理；前端只显示已发起管理员启动请求。

## 测试策略

Rust：

- 测试 Claude 参数构造。
- 测试普通 `wt` 命令构造。
- 测试管理员 PowerShell 命令构造。
- 测试 workspace/settings 校验。

前端：

- 测试 tab 渲染。
- 测试默认 Bypass permissions mode 开启。
- 测试 settings 空值不传 `--settings`。
- 测试点击 Launch 调用 Tauri command。

手动验证：

- `pnpm tauri dev` 能启动居中的 Tauri 窗口。
- 普通 Launch 会在最近普通权限 Windows Terminal 中打开新 tab。
- Launch as Administrator 会触发 UAC，并进入管理员权限 Terminal 实例。
- 历史工作文件夹和 settings 文件重启后仍显示。
