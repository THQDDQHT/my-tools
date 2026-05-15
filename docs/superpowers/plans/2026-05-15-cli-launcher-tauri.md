# cli_launcher Tauri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前仓库新增 `cli_launcher/` Tauri 子项目，用 Rust/Tauri + React/TypeScript 重写 Claude Launcher，并预留未来多 CLI tab。

**Architecture:** `cli_launcher/src-tauri` 负责 Rust 后端命令构造、路径校验和启动 Windows Terminal；`cli_launcher/src` 负责 React UI、历史记录状态和 Tauri command 调用。普通启动与管理员启动共用同一份 LaunchOptions 数据模型，Claude tab 先可用，Gemini/Codex/Custom tab 先渲染 Coming soon。

**Tech Stack:** Tauri 2、Rust、React 18、Vite、TypeScript、Tailwind CSS、Radix UI Tabs/Switch/Tooltip、lucide-react、pnpm、Vitest、Testing Library。

---

## 文件结构

- Create: `cli_launcher/package.json` — pnpm scripts、Tauri/React/Tailwind/Radix/Vitest 依赖。
- Create: `cli_launcher/index.html` — Vite HTML 入口。
- Create: `cli_launcher/tsconfig.json` — TypeScript 配置。
- Create: `cli_launcher/tsconfig.node.json` — Vite 配置 TypeScript 配置。
- Create: `cli_launcher/vite.config.ts` — Vite + React + Vitest 配置。
- Create: `cli_launcher/postcss.config.js` — Tailwind PostCSS 配置。
- Create: `cli_launcher/tailwind.config.ts` — Tailwind 内容扫描与主题扩展。
- Create: `cli_launcher/src/main.tsx` — React mount 入口。
- Create: `cli_launcher/src/App.tsx` — 应用主界面。
- Create: `cli_launcher/src/styles.css` — Tailwind 基础样式和玻璃质感背景。
- Create: `cli_launcher/src/types.ts` — 前端数据类型。
- Create: `cli_launcher/src/lib/history.ts` — localStorage 历史记录读写、去重、排序。
- Create: `cli_launcher/src/lib/launch.ts` — Tauri command 包装和 settings 空值转换。
- Create: `cli_launcher/src/components/CliTabs.tsx` — CLI tabs。
- Create: `cli_launcher/src/components/ClaudePanel.tsx` — Claude 启动表单。
- Create: `cli_launcher/src/components/ComingSoonPanel.tsx` — 未实现 CLI tab 占位。
- Create: `cli_launcher/src/App.test.tsx` — 前端 UI 行为测试。
- Create: `cli_launcher/src/lib/history.test.ts` — 历史记录测试。
- Create: `cli_launcher/src/lib/launch.test.ts` — settings 空值和 invoke 参数测试。
- Create: `cli_launcher/src-tauri/Cargo.toml` — Rust crate 与 Tauri 依赖。
- Create: `cli_launcher/src-tauri/build.rs` — Tauri build hook。
- Create: `cli_launcher/src-tauri/tauri.conf.json` — Tauri app 配置、窗口居中、权限。
- Create: `cli_launcher/src-tauri/capabilities/default.json` — Tauri 2 capability 权限。
- Create: `cli_launcher/src-tauri/src/main.rs` — Tauri 后端与 Rust 单元测试。

当前仓库根目录 Python 工具保留不动。

执行说明：用户已要求实现。安装依赖会运行 `pnpm install`，会写入 `cli_launcher/pnpm-lock.yaml`。除非用户明确要求，不执行 `git commit`。

---

### Task 1: Create Tauri project shell and Rust launcher core

**Files:**
- Create: `cli_launcher/src-tauri/Cargo.toml`
- Create: `cli_launcher/src-tauri/build.rs`
- Create: `cli_launcher/src-tauri/tauri.conf.json`
- Create: `cli_launcher/src-tauri/capabilities/default.json`
- Create: `cli_launcher/src-tauri/src/main.rs`

- [ ] **Step 1: Create Tauri Rust files with failing tests first**

Create `cli_launcher/src-tauri/Cargo.toml`:

```toml
[package]
name = "cli_launcher"
version = "0.1.0"
description = "Launch code CLIs in Windows Terminal tabs"
edition = "2021"

[lib]
name = "cli_launcher_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde = { version = "1", features = ["derive"] }
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
```

Create `cli_launcher/src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build();
}
```

Create `cli_launcher/src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "cli_launcher",
  "version": "0.1.0",
  "identifier": "com.mytools.cli-launcher",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "CLI Launcher",
        "width": 1040,
        "height": 720,
        "minWidth": 900,
        "minHeight": 640,
        "center": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": []
  }
}
```

Create `cli_launcher/src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for cli_launcher",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "opener:default"
  ]
}
```

Create `cli_launcher/src-tauri/src/main.rs` with tests that describe the desired API but no passing implementation yet:

```rust
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LaunchOptions {
    cli: String,
    workspace: String,
    settings_path: Option<String>,
    bypass_permissions: bool,
    as_admin: bool,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct LaunchResult {
    message: String,
}

fn selected_settings_path(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim();
        if trimmed.is_empty() || trimmed == "不使用 settings" {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn build_claude_args(settings_path: Option<&Path>, bypass_permissions: bool) -> Vec<String> {
    let mut args = vec!["claude".to_string()];
    if let Some(settings) = settings_path {
        args.push("--settings".to_string());
        args.push(settings.to_string_lossy().to_string());
    }
    if bypass_permissions {
        args.push("--dangerously-skip-permissions".to_string());
    }
    args
}

fn build_wt_command(workspace: &Path, settings_path: Option<&Path>, bypass_permissions: bool) -> Vec<String> {
    let mut args = vec![
        "wt".to_string(),
        "-w".to_string(),
        "0".to_string(),
        "nt".to_string(),
        "-d".to_string(),
        workspace.to_string_lossy().to_string(),
    ];
    args.extend(build_claude_args(settings_path, bypass_permissions));
    args
}

fn quote_powershell_argument(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn build_admin_wt_command(workspace: &Path, settings_path: Option<&Path>, bypass_permissions: bool) -> Vec<String> {
    let mut argument_list = vec![
        "-w".to_string(),
        "0".to_string(),
        "nt".to_string(),
        "-d".to_string(),
        quote_powershell_argument(&workspace.to_string_lossy()),
        "claude".to_string(),
    ];
    if let Some(settings) = settings_path {
        argument_list.push("--settings".to_string());
        argument_list.push(quote_powershell_argument(&settings.to_string_lossy()));
    }
    if bypass_permissions {
        argument_list.push("--dangerously-skip-permissions".to_string());
    }

    vec![
        "powershell".to_string(),
        "-NoProfile".to_string(),
        "-Command".to_string(),
        "Start-Process".to_string(),
        "wt".to_string(),
        "-Verb".to_string(),
        "RunAs".to_string(),
        "-ArgumentList".to_string(),
        argument_list.join(" "),
    ]
}

fn validate_launch_inputs(workspace: &str, settings_path: Option<&str>) -> Result<(PathBuf, Option<PathBuf>), String> {
    if workspace.trim().is_empty() {
        return Err("请选择工作文件夹。".to_string());
    }

    let workspace_path = PathBuf::from(workspace.trim());
    if !workspace_path.is_dir() {
        return Err(format!("工作文件夹不存在:\n{}", workspace_path.display()));
    }

    let settings_file = match settings_path {
        Some(path) if !path.trim().is_empty() => {
            let file = PathBuf::from(path.trim());
            if !file.is_file() {
                return Err(format!("settings 文件不存在:\n{}", file.display()));
            }
            Some(file)
        }
        _ => None,
    };

    Ok((workspace_path, settings_file))
}

fn spawn_command(command_parts: Vec<String>) -> Result<(), String> {
    let (program, args) = command_parts
        .split_first()
        .ok_or_else(|| "启动命令为空。".to_string())?;
    Command::new(program)
        .args(args)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("启动失败: {error}"))
}

#[tauri::command]
fn launch_cli(options: LaunchOptions) -> Result<LaunchResult, String> {
    if options.cli != "claude" {
        return Err("当前只支持 Claude Code。".to_string());
    }

    let settings = selected_settings_path(options.settings_path);
    let (workspace, settings_file) = validate_launch_inputs(&options.workspace, settings.as_deref())?;
    let command = if options.as_admin {
        build_admin_wt_command(&workspace, settings_file.as_deref(), options.bypass_permissions)
    } else {
        build_wt_command(&workspace, settings_file.as_deref(), options.bypass_permissions)
    };
    spawn_command(command)?;

    let message = if options.as_admin {
        "已请求以管理员权限启动 Claude Code。"
    } else {
        "已启动 Claude Code。"
    };
    Ok(LaunchResult { message: message.to_string() })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![launch_cli])
        .run(tauri::generate_context!())
        .expect("error while running cli_launcher");
}

fn main() {
    run();
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        let path = std::env::temp_dir().join(format!("cli-launcher-{name}-{unique}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn selected_settings_path_treats_empty_and_label_as_none() {
        assert_eq!(selected_settings_path(None), None);
        assert_eq!(selected_settings_path(Some("".to_string())), None);
        assert_eq!(selected_settings_path(Some(" 不使用 settings ".to_string())), None);
        assert_eq!(selected_settings_path(Some("C:/settings.json".to_string())), Some("C:/settings.json".to_string()));
    }

    #[test]
    fn build_claude_args_includes_settings_and_bypass() {
        let settings = PathBuf::from("C:/Users/DELL/.claude/settings.json");
        assert_eq!(
            build_claude_args(Some(&settings), true),
            vec!["claude", "--settings", "C:/Users/DELL/.claude/settings.json", "--dangerously-skip-permissions"]
        );
    }

    #[test]
    fn build_wt_command_reuses_recent_window_and_new_tab() {
        let workspace = PathBuf::from("C:/Users/DELL/My Project");
        assert_eq!(
            build_wt_command(&workspace, None, false),
            vec!["wt", "-w", "0", "nt", "-d", "C:/Users/DELL/My Project", "claude"]
        );
    }

    #[test]
    fn build_admin_wt_command_uses_powershell_runas() {
        let workspace = PathBuf::from("C:/Users/DELL/My Project");
        let settings = PathBuf::from("C:/Users/DELL/.claude/settings.json");
        assert_eq!(
            build_admin_wt_command(&workspace, Some(&settings), true),
            vec![
                "powershell",
                "-NoProfile",
                "-Command",
                "Start-Process",
                "wt",
                "-Verb",
                "RunAs",
                "-ArgumentList",
                "-w 0 nt -d 'C:/Users/DELL/My Project' claude --settings 'C:/Users/DELL/.claude/settings.json' --dangerously-skip-permissions"
            ]
        );
    }

    #[test]
    fn validate_launch_inputs_accepts_existing_workspace_and_settings() {
        let workspace = temp_dir("valid");
        let settings = workspace.join("settings.json");
        fs::write(&settings, "{}").unwrap();

        let result = validate_launch_inputs(workspace.to_str().unwrap(), Some(settings.to_str().unwrap())).unwrap();

        assert_eq!(result.0, workspace);
        assert_eq!(result.1, Some(settings));
    }

    #[test]
    fn validate_launch_inputs_rejects_missing_workspace() {
        let workspace = temp_dir("missing-parent").join("missing");
        let error = validate_launch_inputs(workspace.to_str().unwrap(), None).unwrap_err();
        assert!(error.contains("工作文件夹不存在"));
    }

    #[test]
    fn validate_launch_inputs_rejects_missing_settings_file() {
        let workspace = temp_dir("missing-settings");
        let settings = workspace.join("missing.json");
        let error = validate_launch_inputs(workspace.to_str().unwrap(), Some(settings.to_str().unwrap())).unwrap_err();
        assert!(error.contains("settings 文件不存在"));
    }
}
```

- [ ] **Step 2: Run Rust tests before installing dependencies**

Run:

```bash
cd cli_launcher/src-tauri && cargo test
```

Expected: dependency resolution may fail before `pnpm install`, or tests may run if Cargo can fetch dependencies. If it fails only because Tauri dependencies are not fetched yet, continue to Task 2; if it fails because of Rust syntax, fix the syntax before continuing.

---

### Task 2: Create React/Vite/Tailwind shell and install dependencies

**Files:**
- Create: `cli_launcher/package.json`
- Create: `cli_launcher/index.html`
- Create: `cli_launcher/tsconfig.json`
- Create: `cli_launcher/tsconfig.node.json`
- Create: `cli_launcher/vite.config.ts`
- Create: `cli_launcher/postcss.config.js`
- Create: `cli_launcher/tailwind.config.ts`
- Create: `cli_launcher/src/main.tsx`
- Create: `cli_launcher/src/styles.css`
- Create: `cli_launcher/src/types.ts`

- [ ] **Step 1: Create package and config files**

Create `cli_launcher/package.json`:

```json
{
  "name": "cli_launcher",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 1420",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "typecheck": "tsc --noEmit",
    "test:unit": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-switch": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@tauri-apps/api": "latest",
    "@tauri-apps/plugin-dialog": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@tauri-apps/cli": "latest",
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "autoprefixer": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "^3.4.17",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

Create `cli_launcher/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CLI Launcher</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `cli_launcher/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `cli_launcher/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "tailwind.config.ts"]
}
```

Create `cli_launcher/vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
```

Create `cli_launcher/postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `cli_launcher/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(99, 102, 241, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Create `cli_launcher/src/types.ts`:

```ts
export type CliKind = "claude" | "gemini" | "codex" | "custom";

export type LaunchOptions = {
  cli: CliKind;
  workspace: string;
  settingsPath?: string;
  bypassPermissions: boolean;
  asAdmin: boolean;
};

export type LaunchResult = {
  message: string;
};

export type LauncherHistory = {
  workspaces: string[];
  settingsFiles: string[];
};
```

Create `cli_launcher/src/styles.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color: #eef2ff;
  background: #080b18;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 900px;
  min-height: 640px;
  overflow: hidden;
}

button,
input {
  font: inherit;
}
```

Create `cli_launcher/src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
cd cli_launcher && pnpm install
```

Expected: dependencies install successfully and `cli_launcher/pnpm-lock.yaml` is created.

---

### Task 3: Frontend history and launch wrappers

**Files:**
- Create: `cli_launcher/src/lib/history.test.ts`
- Create: `cli_launcher/src/lib/history.ts`
- Create: `cli_launcher/src/lib/launch.test.ts`
- Create: `cli_launcher/src/lib/launch.ts`

- [ ] **Step 1: Write failing frontend utility tests**

Create `cli_launcher/src/lib/history.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addRecentPath, emptyHistory, loadHistory, saveHistory } from "./history";

describe("history", () => {
  it("adds recent paths to the front and removes duplicates", () => {
    const values = addRecentPath(["C:/old", "C:/same"], "C:/same");
    expect(values).toEqual(["C:/same", "C:/old"]);
  });

  it("keeps only twenty recent paths", () => {
    let values: string[] = [];
    for (let index = 0; index < 25; index += 1) {
      values = addRecentPath(values, `C:/project-${index}`);
    }
    expect(values).toHaveLength(20);
    expect(values[0]).toBe("C:/project-24");
    expect(values[19]).toBe("C:/project-5");
  });

  it("loads empty history when localStorage has invalid json", () => {
    localStorage.setItem("cli_launcher.history", "not json");
    expect(loadHistory()).toEqual(emptyHistory());
  });

  it("saves and loads history", () => {
    const history = { workspaces: ["C:/workspace"], settingsFiles: ["C:/settings.json"] };
    saveHistory(history);
    expect(loadHistory()).toEqual(history);
  });
});
```

Create `cli_launcher/src/lib/launch.test.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { launchCli, normalizeSettingsPath } from "./launch";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("launch", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("normalizes empty settings selections to undefined", () => {
    expect(normalizeSettingsPath("")).toBeUndefined();
    expect(normalizeSettingsPath("  ")).toBeUndefined();
    expect(normalizeSettingsPath("不使用 settings")).toBeUndefined();
    expect(normalizeSettingsPath("C:/settings.json")).toBe("C:/settings.json");
  });

  it("invokes launch_cli with normalized options", async () => {
    vi.mocked(invoke).mockResolvedValue({ message: "ok" });

    await launchCli({
      cli: "claude",
      workspace: "C:/workspace",
      settingsPath: "不使用 settings",
      bypassPermissions: true,
      asAdmin: false,
    });

    expect(invoke).toHaveBeenCalledWith("launch_cli", {
      options: {
        cli: "claude",
        workspace: "C:/workspace",
        settingsPath: undefined,
        bypassPermissions: true,
        asAdmin: false,
      },
    });
  });
});
```

- [ ] **Step 2: Run frontend utility tests to verify they fail**

Run:

```bash
cd cli_launcher && pnpm test:unit -- src/lib/history.test.ts src/lib/launch.test.ts
```

Expected: FAIL because `history.ts` and `launch.ts` do not exist yet.

- [ ] **Step 3: Implement frontend utility modules**

Create `cli_launcher/src/lib/history.ts`:

```ts
import type { LauncherHistory } from "../types";

const STORAGE_KEY = "cli_launcher.history";
const MAX_HISTORY = 20;

export function emptyHistory(): LauncherHistory {
  return { workspaces: [], settingsFiles: [] };
}

export function addRecentPath(values: string[], value: string): string[] {
  const text = value.trim();
  if (!text) {
    return values.slice(0, MAX_HISTORY);
  }
  return [text, ...values.filter((item) => item !== text)].slice(0, MAX_HISTORY);
}

function cleanValues(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const text = item.trim();
    if (text && !cleaned.includes(text)) {
      cleaned.push(text);
    }
    if (cleaned.length >= MAX_HISTORY) {
      break;
    }
  }
  return cleaned;
}

export function loadHistory(): LauncherHistory {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyHistory();
  }
  try {
    const parsed = JSON.parse(raw) as { workspaces?: unknown; settingsFiles?: unknown };
    return {
      workspaces: cleanValues(parsed.workspaces),
      settingsFiles: cleanValues(parsed.settingsFiles),
    };
  } catch {
    return emptyHistory();
  }
}

export function saveHistory(history: LauncherHistory): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      workspaces: cleanValues(history.workspaces),
      settingsFiles: cleanValues(history.settingsFiles),
    }),
  );
}
```

Create `cli_launcher/src/lib/launch.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { LaunchOptions, LaunchResult } from "../types";

export const NO_SETTINGS_LABEL = "不使用 settings";

export function normalizeSettingsPath(value: string | undefined): string | undefined {
  const text = value?.trim();
  if (!text || text === NO_SETTINGS_LABEL) {
    return undefined;
  }
  return text;
}

export function launchCli(options: LaunchOptions): Promise<LaunchResult> {
  return invoke<LaunchResult>("launch_cli", {
    options: {
      ...options,
      settingsPath: normalizeSettingsPath(options.settingsPath),
    },
  });
}
```

- [ ] **Step 4: Run frontend utility tests to verify they pass**

Run:

```bash
cd cli_launcher && pnpm test:unit -- src/lib/history.test.ts src/lib/launch.test.ts
```

Expected: PASS with 6 tests passing.

---

### Task 4: Build the polished React UI

**Files:**
- Create: `cli_launcher/src/components/ComingSoonPanel.tsx`
- Create: `cli_launcher/src/components/CliTabs.tsx`
- Create: `cli_launcher/src/components/ClaudePanel.tsx`
- Create: `cli_launcher/src/App.tsx`
- Create: `cli_launcher/src/App.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `cli_launcher/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("./lib/launch", async () => {
  const actual = await vi.importActual<typeof import("./lib/launch")>("./lib/launch");
  return {
    ...actual,
    launchCli: vi.fn().mockResolvedValue({ message: "已启动 Claude Code。" }),
  };
});

describe("App", () => {
  it("renders CLI tabs and Claude launch form", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "CLI Launcher" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Claude Code" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gemini CLI" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Codex" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Settings file")).toHaveValue("不使用 settings");
  });

  it("enables bypass permissions mode by default", () => {
    render(<App />);

    expect(screen.getByRole("switch", { name: "Bypass permissions mode" })).toBeChecked();
  });

  it("shows coming soon content for Gemini tab", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "Gemini CLI" }));

    expect(screen.getByText("Gemini CLI support is coming soon.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```bash
cd cli_launcher && pnpm test:unit -- src/App.test.tsx
```

Expected: FAIL because `App.tsx` and components do not exist yet.

- [ ] **Step 3: Implement components**

Create `cli_launcher/src/components/ComingSoonPanel.tsx`:

```tsx
import type { CliKind } from "../types";

const labels: Record<CliKind, string> = {
  claude: "Claude Code",
  gemini: "Gemini CLI",
  codex: "Codex",
  custom: "Custom CLI",
};

export function ComingSoonPanel({ cli }: { cli: Exclude<CliKind, "claude"> }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-10 text-center shadow-glow backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-200/70">Coming soon</p>
      <h2 className="mt-4 text-3xl font-semibold text-white">{labels[cli]} support is coming soon.</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
        The tab is reserved so this launcher can become a single control center for multiple code CLIs.
      </p>
    </div>
  );
}
```

Create `cli_launcher/src/components/ClaudePanel.tsx`:

```tsx
import { open } from "@tauri-apps/plugin-dialog";
import * as Switch from "@radix-ui/react-switch";
import { FolderOpen, Shield, Terminal, Zap } from "lucide-react";
import { useState } from "react";
import { addRecentPath, loadHistory, saveHistory } from "../lib/history";
import { launchCli, NO_SETTINGS_LABEL } from "../lib/launch";
import type { LauncherHistory } from "../types";

export function ClaudePanel() {
  const [history, setHistory] = useState<LauncherHistory>(() => loadHistory());
  const [workspace, setWorkspace] = useState(history.workspaces[0] ?? "");
  const [settingsPath, setSettingsPath] = useState(NO_SETTINGS_LABEL);
  const [bypassPermissions, setBypassPermissions] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const canLaunch = workspace.trim().length > 0;

  async function chooseWorkspace() {
    const selected = await open({ directory: true, multiple: false, title: "Select workspace" });
    if (typeof selected === "string") {
      setWorkspace(selected);
    }
  }

  async function chooseSettings() {
    const selected = await open({
      directory: false,
      multiple: false,
      title: "Select Claude settings file",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (typeof selected === "string") {
      setSettingsPath(selected);
    }
  }

  async function launch(asAdmin: boolean) {
    setError("");
    setStatus("");
    try {
      const result = await launchCli({
        cli: "claude",
        workspace,
        settingsPath,
        bypassPermissions,
        asAdmin,
      });
      const nextHistory = {
        workspaces: addRecentPath(history.workspaces, workspace),
        settingsFiles: settingsPath === NO_SETTINGS_LABEL ? history.settingsFiles : addRecentPath(history.settingsFiles, settingsPath),
      };
      setHistory(nextHistory);
      saveHistory(nextHistory);
      setStatus(result.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-glow backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-200/70">Claude Code</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">Launch a Claude terminal tab</h2>
          </div>
          <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-200">
            <Terminal className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Workspace</span>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Workspace"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-indigo-400/0 transition focus:border-indigo-300/60 focus:ring-4 focus:ring-indigo-400/10"
                value={workspace}
                onChange={(event) => setWorkspace(event.target.value)}
                placeholder="Select a working directory"
              />
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15" onClick={chooseWorkspace} type="button">
                <FolderOpen className="h-4 w-4" /> Browse
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Settings file</span>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Settings file"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-indigo-400/0 transition focus:border-indigo-300/60 focus:ring-4 focus:ring-indigo-400/10"
                value={settingsPath}
                onChange={(event) => setSettingsPath(event.target.value)}
              />
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15" onClick={chooseSettings} type="button">
                <FolderOpen className="h-4 w-4" /> Browse
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
            <div>
              <label className="text-sm font-medium text-white" htmlFor="bypass-permissions">Bypass permissions mode</label>
              <p className="mt-1 text-xs text-slate-400">Equivalent to Claude Code bypassPermissions mode.</p>
            </div>
            <Switch.Root
              aria-label="Bypass permissions mode"
              checked={bypassPermissions}
              className="relative h-7 w-12 rounded-full bg-slate-700 outline-none data-[state=checked]:bg-indigo-500"
              id="bypass-permissions"
              onCheckedChange={setBypassPermissions}
            >
              <Switch.Thumb className="block h-6 w-6 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canLaunch}
              onClick={() => launch(false)}
              type="button"
            >
              <Zap className="h-4 w-4" /> Launch
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canLaunch}
              onClick={() => launch(true)}
              type="button"
            >
              <Shield className="h-4 w-4" /> Launch as Administrator
            </button>
          </div>

          <p className="text-xs leading-5 text-slate-400">Administrator launches use a separate elevated Windows Terminal instance when Windows requires it.</p>
          {status ? <p className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{status}</p> : null}
          {error ? <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        </div>
      </section>

      <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Recent workspaces</h3>
        <div className="mt-4 space-y-2">
          {history.workspaces.length ? history.workspaces.map((item) => (
            <button key={item} className="block w-full truncate rounded-xl bg-white/5 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10" onClick={() => setWorkspace(item)} type="button">
              {item}
            </button>
          )) : <p className="text-sm text-slate-500">No recent workspaces yet.</p>}
        </div>
      </aside>
    </div>
  );
}
```

Create `cli_launcher/src/components/CliTabs.tsx`:

```tsx
import * as Tabs from "@radix-ui/react-tabs";
import { Bot, Code2, Plus, Sparkles } from "lucide-react";
import { ClaudePanel } from "./ClaudePanel";
import { ComingSoonPanel } from "./ComingSoonPanel";

const tabClass = "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-slate-300 transition data-[state=active]:bg-white/15 data-[state=active]:text-white hover:bg-white/10";

export function CliTabs() {
  return (
    <Tabs.Root defaultValue="claude" className="mt-8">
      <Tabs.List className="inline-flex rounded-3xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl">
        <Tabs.Trigger className={tabClass} value="claude"><Sparkles className="h-4 w-4" />Claude Code</Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="gemini"><Bot className="h-4 w-4" />Gemini CLI</Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="codex"><Code2 className="h-4 w-4" />Codex</Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="custom"><Plus className="h-4 w-4" />Add CLI</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content className="mt-6" value="claude"><ClaudePanel /></Tabs.Content>
      <Tabs.Content className="mt-6" value="gemini"><ComingSoonPanel cli="gemini" /></Tabs.Content>
      <Tabs.Content className="mt-6" value="codex"><ComingSoonPanel cli="codex" /></Tabs.Content>
      <Tabs.Content className="mt-6" value="custom"><ComingSoonPanel cli="custom" /></Tabs.Content>
    </Tabs.Root>
  );
}
```

Create `cli_launcher/src/App.tsx`:

```tsx
import { Settings } from "lucide-react";
import { CliTabs } from "./components/CliTabs";

export default function App() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b18] px-8 py-8 text-white">
      <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-indigo-200/70">my-tools</p>
            <h1 className="mt-3 text-5xl font-bold tracking-tight text-white" id="app-title">CLI Launcher</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Launch and manage code CLIs in Windows Terminal tabs with clean profiles, history, and elevated launch support.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-medium text-slate-200 backdrop-blur-xl transition hover:bg-white/10" type="button">
            <Settings className="h-4 w-4" /> Settings
          </button>
        </header>
        <CliTabs />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run UI tests to verify they pass**

Run:

```bash
cd cli_launcher && pnpm test:unit -- src/App.test.tsx
```

Expected: PASS with 3 UI tests passing.

---

### Task 5: Run full automated checks and Tauri dev smoke

**Files:**
- No new files expected.

- [ ] **Step 1: Run frontend tests**

Run:

```bash
cd cli_launcher && pnpm test:unit
```

Expected: PASS with all frontend tests passing.

- [ ] **Step 2: Run frontend typecheck**

Run:

```bash
cd cli_launcher && pnpm typecheck
```

Expected: TypeScript exits 0.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd cli_launcher && pnpm build
```

Expected: Vite builds `cli_launcher/dist` successfully.

- [ ] **Step 4: Run Rust tests**

Run:

```bash
cd cli_launcher/src-tauri && cargo test
```

Expected: Rust tests pass.

- [ ] **Step 5: Run Tauri config/build check**

Run:

```bash
cd cli_launcher && pnpm tauri info
```

Expected: Tauri prints environment information without command failure.

- [ ] **Step 6: Manual dev server smoke**

Run:

```bash
cd cli_launcher && pnpm tauri:dev
```

Expected: Tauri opens a centered `CLI Launcher` window with dark glass UI, visible Claude/Gemini/Codex/Add CLI tabs, Bypass permissions enabled by default, and Launch/Launch as Administrator buttons. Stop the dev process after confirming the window opens.
