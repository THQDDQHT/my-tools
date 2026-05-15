use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LaunchOptions {
    cli: String,
    workspace: String,
    settings_path: Option<String>,
    /// Codex 启动时前端不传此字段，缺失时默认 false
    #[serde(default)]
    bypass_permissions: bool,
    /// Codex 启动时前端不传此字段，缺失时默认 false
    #[serde(default)]
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

fn build_cli_args(
    cli: &str,
    settings_path: Option<&Path>,
    bypass_permissions: bool,
) -> Vec<String> {
    let mut args = vec![cli.to_string()];
    if cli == "claude" {
        if let Some(settings) = settings_path {
            args.push("--settings".to_string());
            args.push(settings.to_string_lossy().to_string());
        }
        if bypass_permissions {
            args.push("--dangerously-skip-permissions".to_string());
        }
    }
    args
}

fn build_wt_command(
    cli: &str,
    workspace: &Path,
    settings_path: Option<&Path>,
    bypass_permissions: bool,
) -> Vec<String> {
    let mut args = vec![
        "wt".to_string(),
        "-w".to_string(),
        "0".to_string(),
        "nt".to_string(),
        "-d".to_string(),
        workspace.to_string_lossy().to_string(),
    ];
    args.extend(build_cli_args(cli, settings_path, bypass_permissions));
    args
}

fn quote_powershell_argument(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

/// 构建以管理员权限启动 Windows Terminal 的命令。
/// 将整条 Start-Process 命令作为单个 -Command 字符串传递给 powershell，
/// 并使用逗号分隔的 PowerShell 数组语法传递 -ArgumentList，
/// 避免 PowerShell 将 wt 的 -w 等参数误解析为 Start-Process 的参数。
fn build_admin_wt_command(
    workspace: &Path,
    settings_path: Option<&Path>,
    bypass_permissions: bool,
) -> Vec<String> {
    let mut wt_args = vec![
        "-w".to_string(),
        "0".to_string(),
        "nt".to_string(),
        "-d".to_string(),
        workspace.to_string_lossy().to_string(),
        "claude".to_string(),
    ];
    if let Some(settings) = settings_path {
        wt_args.push("--settings".to_string());
        wt_args.push(settings.to_string_lossy().to_string());
    }
    if bypass_permissions {
        wt_args.push("--dangerously-skip-permissions".to_string());
    }

    // 每个参数单独用单引号包裹，再用逗号连接，形成 PowerShell 数组字面量
    let ps_array = wt_args
        .iter()
        .map(|arg| quote_powershell_argument(arg))
        .collect::<Vec<_>>()
        .join(",");

    vec![
        "powershell".to_string(),
        "-NoProfile".to_string(),
        "-Command".to_string(),
        format!("Start-Process wt -Verb RunAs -ArgumentList {}", ps_array),
    ]
}

fn validate_launch_inputs(
    workspace: &str,
    settings_path: Option<&str>,
) -> Result<(PathBuf, Option<PathBuf>), String> {
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
    if options.cli != "claude" && options.cli != "codex" {
        return Err("当前只支持 Claude Code 和 Codex。".to_string());
    }

    let settings = selected_settings_path(options.settings_path);
    let (workspace, settings_file) =
        validate_launch_inputs(&options.workspace, settings.as_deref())?;
    let command = if options.as_admin && options.cli == "claude" {
        build_admin_wt_command(
            &workspace,
            settings_file.as_deref(),
            options.bypass_permissions,
        )
    } else {
        build_wt_command(
            &options.cli,
            &workspace,
            settings_file.as_deref(),
            options.bypass_permissions,
        )
    };
    spawn_command(command)?;

    let message = if options.cli == "codex" {
        "已启动 Codex。"
    } else if options.as_admin {
        "已请求以管理员权限启动 Claude Code。"
    } else {
        "已启动 Claude Code。"
    };
    Ok(LaunchResult {
        message: message.to_string(),
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![launch_cli])
        .run(tauri::generate_context!())
        .expect("error while running cli_launcher");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("cli-launcher-{name}-{unique}"));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn selected_settings_path_treats_empty_and_label_as_none() {
        assert_eq!(selected_settings_path(None), None);
        assert_eq!(selected_settings_path(Some("".to_string())), None);
        assert_eq!(
            selected_settings_path(Some(" 不使用 settings ".to_string())),
            None
        );
        assert_eq!(
            selected_settings_path(Some("C:/settings.json".to_string())),
            Some("C:/settings.json".to_string())
        );
    }

    #[test]
    fn build_cli_args_includes_claude_settings_and_bypass() {
        let settings = PathBuf::from("C:/Users/DELL/.claude/settings.json");
        assert_eq!(
            build_cli_args("claude", Some(&settings), true),
            vec![
                "claude",
                "--settings",
                "C:/Users/DELL/.claude/settings.json",
                "--dangerously-skip-permissions"
            ]
        );
    }

    #[test]
    fn build_wt_command_reuses_recent_window_and_new_tab() {
        let workspace = PathBuf::from("C:/Users/DELL/My Project");
        assert_eq!(
            build_wt_command("claude", &workspace, None, false),
            vec![
                "wt",
                "-w",
                "0",
                "nt",
                "-d",
                "C:/Users/DELL/My Project",
                "claude"
            ]
        );
    }

    #[test]
    fn build_wt_command_launches_codex_without_claude_options() {
        let workspace = PathBuf::from("C:/Users/DELL/My Project");
        assert_eq!(
            build_wt_command("codex", &workspace, None, false),
            vec![
                "wt",
                "-w",
                "0",
                "nt",
                "-d",
                "C:/Users/DELL/My Project",
                "codex"
            ]
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
                "Start-Process wt -Verb RunAs -ArgumentList '-w','0','nt','-d','C:/Users/DELL/My Project','claude','--settings','C:/Users/DELL/.claude/settings.json','--dangerously-skip-permissions'"
            ]
        );
    }

    #[test]
    fn validate_launch_inputs_accepts_existing_workspace_and_settings() {
        let workspace = temp_dir("valid");
        let settings = workspace.join("settings.json");
        fs::write(&settings, "{}").unwrap();

        let result = validate_launch_inputs(
            workspace.to_str().unwrap(),
            Some(settings.to_str().unwrap()),
        )
        .unwrap();

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
        let error = validate_launch_inputs(
            workspace.to_str().unwrap(),
            Some(settings.to_str().unwrap()),
        )
        .unwrap_err();
        assert!(error.contains("settings 文件不存在"));
    }
}
