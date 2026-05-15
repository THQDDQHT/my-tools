import { Settings } from "lucide-react";
import { CliTabs } from "./components/CliTabs";

export default function App() {
  return (
    <main className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#080b18] px-8 py-8 text-white">
      <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-indigo-200/70">
              my-tools
            </p>
            <h1
              className="mt-3 text-5xl font-bold tracking-tight text-white"
              id="app-title"
            >
              CLI Launcher
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Launch and manage code CLIs in Windows Terminal tabs with clean
              profiles, history, and elevated launch support.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-medium text-slate-200 backdrop-blur-xl transition hover:bg-white/10"
            type="button"
          >
            <Settings className="h-4 w-4" /> Settings
          </button>
        </header>
        <CliTabs />
      </div>
    </main>
  );
}
