import * as Switch from "@radix-ui/react-switch";
import { open } from "@tauri-apps/plugin-dialog";
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
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Select workspace",
    });
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
        settingsFiles:
          settingsPath === NO_SETTINGS_LABEL
            ? history.settingsFiles
            : addRecentPath(history.settingsFiles, settingsPath),
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
            <Terminal className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Claude Code</h2>
        </div>

        <div
          aria-label="Claude launch actions"
          role="group"
          className="mt-6 flex flex-wrap gap-3"
        >
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canLaunch}
            onClick={() => launch(false)}
            type="button"
          >
            <Zap className="h-4 w-4" /> Launch
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canLaunch}
            onClick={() => launch(true)}
            type="button"
          >
            <Shield className="h-4 w-4" /> Admin Launch
          </button>
        </div>

        <div className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Workspace
            </span>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Workspace"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                value={workspace}
                onChange={(event) => setWorkspace(event.target.value)}
                placeholder="Select a working directory"
              />
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={chooseWorkspace}
                type="button"
              >
                <FolderOpen className="h-4 w-4" /> Browse
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Settings file
            </span>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Settings file"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                value={settingsPath}
                onChange={(event) => setSettingsPath(event.target.value)}
              />
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={chooseSettings}
                type="button"
              >
                <FolderOpen className="h-4 w-4" /> Browse
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4">
            <div>
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor="bypass-permissions"
              >
                Bypass permissions mode
              </label>
            </div>
            <Switch.Root
              aria-label="Bypass permissions mode"
              checked={bypassPermissions}
              className="relative h-7 w-12 rounded-full bg-slate-300 outline-none data-[state=checked]:bg-indigo-600"
              id="bypass-permissions"
              onCheckedChange={setBypassPermissions}
            >
              <Switch.Thumb className="block h-6 w-6 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>

          {status ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {status}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Recent workspaces
        </h3>
        <div className="mt-4 space-y-2">
          {history.workspaces.length ? (
            history.workspaces.map((item) => (
              <button
                key={item}
                className="block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={() => setWorkspace(item)}
                type="button"
              >
                {item}
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-500">No recent workspaces yet.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
