import * as Tabs from "@radix-ui/react-tabs";
import { Bot, Code2, Plus, Sparkles } from "lucide-react";
import { ClaudePanel } from "./ClaudePanel";
import { ComingSoonPanel } from "./ComingSoonPanel";

const tabClass = "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-slate-300 transition data-[state=active]:bg-white/15 data-[state=active]:text-white hover:bg-white/10";

export function CliTabs() {
  return (
    <Tabs.Root defaultValue="claude" className="mt-8">
      <Tabs.List className="inline-flex rounded-3xl border border-white/10 bg-white/[0.06] p-2 backdrop-blur-xl">
        <Tabs.Trigger className={tabClass} value="claude"><Sparkles className="h-4 w-4" />Claude Code</Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="gemini"><Bot className="h-4 w-4" />Gemini CLI</Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="codex"><Code2 className="h-4 w-4" />Codex</Tabs.Trigger>
        <Tabs.Trigger className={tabClass} value="custom"><Plus className="h-4 w-4" />Add CLI</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content className="mt-6" value="claude"><ClaudePanel /></Tabs.Content>
      <Tabs.Content className="mt-6" value="gemini"><ComingSoonPanel cli="gemini" /></Tabs.Content>
      <Tabs.Content className="mt-6" value="codex"><ComingSoonPanel cli="codex" /></Tabs.Content>
      <Tabs.Content className="mt-6" value="custom"><ComingSoonPanel cli="custom" /></Tabs.Content>
    </Tabs.Root>
  );
}
