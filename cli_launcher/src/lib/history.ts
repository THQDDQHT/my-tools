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
