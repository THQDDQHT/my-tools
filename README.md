# my-tools

A collection of local productivity tools. Each top-level tool directory owns its own tech stack, dependencies, commands, and build outputs.

## Tools

### cli_launcher

Tauri desktop app for launching code CLIs such as Claude Code from Windows Terminal tabs.

Common commands:

```bash
cd cli_launcher
pnpm install
pnpm tauri:dev
pnpm tauri:build
```

### word2md

Python desktop tool for converting Word `.docx` files to Markdown.

Common commands:

```bash
cd word2md
uv run word2md
uv run python -m unittest discover -s tests
```

## Repository layout

```text
my-tools/
  cli_launcher/
  word2md/
  docs/
```

The repository root is not a Python, Node, or Rust project. Enter a tool directory before running tool-specific commands.
