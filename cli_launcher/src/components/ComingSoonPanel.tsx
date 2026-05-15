const labels = {
  codex: "Codex",
};

export function ComingSoonPanel({ cli }: { cli: keyof typeof labels }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-10 text-center shadow-glow backdrop-blur-xl">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-200/70">
        Coming soon
      </p>
      <h2 className="mt-4 text-3xl font-semibold text-white">
        {labels[cli]} support is coming soon.
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
        The tab is reserved so this launcher can become a single control center
        for multiple code CLIs.
      </p>
    </div>
  );
}
