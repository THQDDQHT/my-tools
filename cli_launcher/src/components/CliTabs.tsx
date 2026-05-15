import * as Tabs from "@radix-ui/react-tabs";
import { Code2, Sparkles } from "lucide-react";
import { ClaudePanel } from "./ClaudePanel";
import { CodexPanel } from "./CodexPanel";

const tabClass =
  "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:text-slate-700 hover:bg-slate-200/50 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm";

export function CliTabs() {
  return (
    <Tabs.Root defaultValue="claude" className="mt-8">
      <Tabs.List className="inline-flex rounded-3xl bg-slate-200/50 p-1.5 backdrop-blur-xl">
        <Tabs.Trigger className={tabClass} value="claude">
          <Sparkles className="h-4 w-4" />
          Claude Code
        </Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="codex">
          <Code2 className="h-4 w-4" />
          Codex
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content className="mt-6" value="claude">
        <ClaudePanel />
      </Tabs.Content>
      <Tabs.Content className="mt-6" value="codex">
        <CodexPanel />
      </Tabs.Content>
    </Tabs.Root>
  );
}
