import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { launchCli } from "./lib/launch";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("./lib/launch", async () => {
  const actual =
    await vi.importActual<typeof import("./lib/launch")>("./lib/launch");
  return {
    ...actual,
    launchCli: vi.fn().mockResolvedValue({ message: "已启动 Claude Code。" }),
  };
});

describe("App", () => {
  it("renders only Claude Code and Codex tabs", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "CLI Launcher" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Claude Code" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Codex" })).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Gemini CLI" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Add CLI" }),
    ).not.toBeInTheDocument();
  });

  it("renders the Claude launch form", () => {
    render(<App />);

    expect(screen.getByLabelText("Workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Settings file")).toHaveValue(
      "不使用 settings",
    );
    expect(
      screen.getByRole("group", { name: "Claude launch actions" }),
    ).toContainElement(screen.getByRole("button", { name: "Launch" }));
    expect(
      screen.getByRole("group", { name: "Claude launch actions" }),
    ).toContainElement(screen.getByRole("button", { name: "Admin Launch" }));
  });

  it("enables bypass permissions mode by default", () => {
    render(<App />);

    expect(
      screen.getByRole("switch", { name: "Bypass permissions mode" }),
    ).toBeChecked();
  });

  it("renders Codex with only workspace and launch controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "Codex" }));

    expect(screen.getByRole("heading", { name: "Codex" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workspace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Launch" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Settings file")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Bypass permissions mode" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Admin Launch" }),
    ).not.toBeInTheDocument();
  });

  it("launches Codex with the selected workspace", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "Codex" }));
    await user.type(screen.getByLabelText("Workspace"), "C:/workspace");
    await user.click(screen.getByRole("button", { name: "Launch" }));

    expect(launchCli).toHaveBeenCalledWith({
      cli: "codex",
      workspace: "C:/workspace",
    });
  });
});
