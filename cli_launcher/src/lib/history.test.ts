import { describe, expect, it } from "vitest";
import {
  addRecentPath,
  emptyHistory,
  loadHistory,
  saveHistory,
} from "./history";

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
    const history = {
      workspaces: ["C:/workspace"],
      settingsFiles: ["C:/settings.json"],
    };
    saveHistory(history);
    expect(loadHistory()).toEqual(history);
  });
});
