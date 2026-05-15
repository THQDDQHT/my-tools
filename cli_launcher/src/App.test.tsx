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
    expect(screen.getByRole("group", { name: "Claude launch actions" })).toContainElement(screen.getByRole("button", { name: "Launch" }));
    expect(screen.getByRole("group", { name: "Claude launch actions" })).toContainElement(screen.getByRole("button", { name: "Launch as Administrator" }));
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
