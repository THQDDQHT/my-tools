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
