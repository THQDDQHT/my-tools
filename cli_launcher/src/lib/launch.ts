import { invoke } from "@tauri-apps/api/core";
import type { LaunchOptions, LaunchResult } from "../types";

export const NO_SETTINGS_LABEL = "不使用 settings";

export function normalizeSettingsPath(
  value: string | undefined,
): string | undefined {
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
