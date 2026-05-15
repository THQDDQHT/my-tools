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
    const selected = await open({ directory: true, multiple: false, title: "Select workspace" });
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
        settingsFiles: settingsPath === NO_SETTINGS_LABEL ? history.settingsFiles : addRecentPath(history.settingsFiles, settingsPath),
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
      <section className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 shadow-glow backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-200/70">Claude Code</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Launch a Claude terminal tab</h2>
          </div>
          <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-200">
            <Terminal className="h-6 w-6" />
          </div>
        </div>

        <div aria-label="Claude launch actions" role="group" className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/50 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canLaunch}
            onClick={() => launch(false)}
            type="button"
          >
            <Zap className="h-4 w-4" /> Launch
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canLaunch}
            onClick={() => launch(true)}
            type="button"
          >
            <Shield className="h-4 w-4" /> Launch as Administrator
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">Workspace</span>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Workspace"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-indigo-400/0 transition focus:border-indigo-300/60 focus:ring-4 focus:ring-indigo-400/10"
                value={workspace}
                onChange={(event) => setWorkspace(event.target.value)}
                placeholder="Select a working directory"
              />
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15" onClick={chooseWorkspace} type="button">
                <FolderOpen className="h-4 w-4" /> Browse
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Settings file</span>
            <div className="mt-2 flex gap-3">
              <input
                aria-label="Settings file"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none ring-indigo-400/0 transition focus:border-indigo-300/60 focus:ring-4 focus:ring-indigo-400/10"
                value={settingsPath}
                onChange={(event) => setSettingsPath(event.target.value)}
              />
              <button className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15" onClick={chooseSettings} type="button">
                <FolderOpen className="h-4 w-4" /> Browse
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
            <div>
              <label className="text-sm font-medium text-white" htmlFor="bypass-permissions">Bypass permissions mode</label>
              <p className="mt-1 text-xs text-slate-400">Equivalent to Claude Code bypassPermissions mode.</p>
            </div>
            <Switch.Root
              aria-label="Bypass permissions mode"
              checked={bypassPermissions}
              className="relative h-7 w-12 rounded-full bg-slate-700 outline-none data-[state=checked]:bg-indigo-500"
              id="bypass-permissions"
              onCheckedChange={setBypassPermissions}
            >
              <Switch.Thumb className="block h-6 w-6 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Root>
          </div>

          <p className="text-xs leading-5 text-slate-400">Administrator launches use a separate elevated Windows Terminal instance when Windows requires it.</p>
          {status ? <p className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{status}</p> : null}
          {error ? <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
        </div>
      </section>

      <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Recent workspaces</h3>
        <div className="mt-4 space-y-2">
          {history.workspaces.length ? history.workspaces.map((item) => (
            <button key={item} className="block w-full truncate rounded-xl bg-white/5 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10" onClick={() => setWorkspace(item)} type="button">
              {item}
            </button>
          )) : <p className="text-sm text-slate-500">No recent workspaces yet.</p>}
        </div>
      </aside>
    </div>
  );
}
