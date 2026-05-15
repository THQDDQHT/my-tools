import { Settings } from "lucide-react";
import { CliTabs } from "./components/CliTabs";

export default function App() {
  return (
    <main className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-slate-50 px-8 py-8 text-slate-900">
      <div className="absolute left-[-10%] top-[-20%] h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] h-96 w-96 rounded-full bg-sky-400/5 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-start justify-between gap-6">
          <div className="pt-2">
            <h1
              className="text-4xl font-bold tracking-tight text-slate-900"
              id="app-title"
            >
              CLI Launcher
            </h1>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
