export type CliKind = "claude" | "codex";

export type LaunchOptions =
  | {
      cli: "claude";
      workspace: string;
      settingsPath?: string;
      bypassPermissions: boolean;
      asAdmin: boolean;
    }
  | {
      cli: "codex";
      workspace: string;
    };

export type LaunchResult = {
  message: string;
};

export type LauncherHistory = {
  workspaces: string[];
  settingsFiles: string[];
};
