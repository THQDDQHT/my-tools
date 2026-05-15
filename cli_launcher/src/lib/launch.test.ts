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
