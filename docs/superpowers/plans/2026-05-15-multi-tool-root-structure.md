# Multi-Tool Root Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repository so the root is a collection of independent tools, with `word2md/` owning its Python project files and `cli_launcher/` remaining an independent Tauri project.

**Architecture:** The root directory becomes a lightweight container for tool folders and shared documentation. `word2md/` becomes a standalone Python project using a nested package layout (`word2md/word2md/`) so it can be run and tested from its own directory. `cli_launcher/` is not moved or modified unless verification reveals a direct path reference that must be updated.

**Tech Stack:** Python 3.11+, uv, unittest, python-docx, markdownify, existing Tauri/React/Rust project in `cli_launcher/`.

---

## File Structure

### Move / Remove

- Move root `pyproject.toml` content into `word2md/pyproject.toml`, changing the project name from `my-tools` to `word2md`.
- Move root `uv.lock` to `word2md/uv.lock` if it exists, then refresh it from inside the `word2md` project.
- Move root `.python-version` to `word2md/.python-version` if it exists.
- Remove root `main.py`; the `word2md` script entry point replaces it.
- Move existing Word2MD source files:
  - `word2md/__init__.py` → `word2md/word2md/__init__.py`
  - `word2md/converter.py` → `word2md/word2md/converter.py`
  - `word2md/gui.py` → `word2md/word2md/gui.py`

### Create / Modify

- Create: `word2md/tests/test_project_layout.py`
- Modify: `word2md/pyproject.toml`
- Modify: `README.md`
- Modify only if needed: `.gitignore`

### Do Not Touch

- Do not move `cli_launcher/`.
- Do not edit `cli_launcher/src/**`.
- Do not revert the existing bright-theme UI changes in `cli_launcher/`.
- Do not create a `tools/` wrapper directory.

---

### Task 1: Add a failing project-layout test for standalone `word2md`

**Files:**
- Create: `word2md/tests/test_project_layout.py`

- [ ] **Step 1: Create the standalone layout test**

Write `word2md/tests/test_project_layout.py`:

```python
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from docx import Document


class Word2MdProjectLayoutTests(unittest.TestCase):
    def test_converter_imports_from_project_package_and_writes_markdown(self) -> None:
        from word2md.converter import convert

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            docx_path = root / "sample.docx"
            output_dir = root / "out"

            document = Document()
            document.add_heading("Sample Title", level=1)
            document.add_paragraph("Hello from Word2MD")
            document.save(docx_path)

            result = convert(docx_path, output_dir=output_dir)

            self.assertEqual(output_dir / "sample.md", result.output_path)
            self.assertTrue(result.output_path.exists())
            self.assertIn("# Sample Title", result.markdown)
            self.assertIn("Hello from Word2MD", result.markdown)

    def test_gui_entrypoint_imports_from_project_package(self) -> None:
        from word2md.gui import main

        self.assertTrue(callable(main))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test from the future project root and verify it fails**

Run:

```bash
uv --directory word2md run python -m unittest discover -s tests
```

Expected: FAIL with an import error similar to:

```text
ModuleNotFoundError: No module named 'word2md.converter'
```

This failure proves the current flat `word2md/` source layout is not yet a standalone Python project when executed from inside `word2md/`.

---

### Task 2: Move Word2MD source into a nested Python package

**Files:**
- Move: `word2md/__init__.py` → `word2md/word2md/__init__.py`
- Move: `word2md/converter.py` → `word2md/word2md/converter.py`
- Move: `word2md/gui.py` → `word2md/word2md/gui.py`
- Test: `word2md/tests/test_project_layout.py`

- [ ] **Step 1: Create the nested package directory**

Run:

```bash
mkdir -p "word2md/word2md"
```

Expected: `word2md/word2md/` exists.

- [ ] **Step 2: Move the existing source files**

Run:

```bash
mv "word2md/__init__.py" "word2md/word2md/__init__.py" && mv "word2md/converter.py" "word2md/word2md/converter.py" && mv "word2md/gui.py" "word2md/word2md/gui.py"
```

Expected source layout:

```text
word2md/
  word2md/
    __init__.py
    converter.py
    gui.py
  tests/
    test_project_layout.py
```

- [ ] **Step 3: Run the layout test again**

Run:

```bash
uv --directory word2md run python -m unittest discover -s tests
```

Expected: the previous import error is gone. If the command now fails because the project has no local `pyproject.toml`, continue to Task 3 before treating the failure as a code issue.

---

### Task 3: Move Python project configuration into `word2md/`

**Files:**
- Modify/Create: `word2md/pyproject.toml`
- Move if present: `uv.lock` → `word2md/uv.lock`
- Move if present: `.python-version` → `word2md/.python-version`
- Remove: root `pyproject.toml` after the new project file exists

- [ ] **Step 1: Write the independent Word2MD project config**

Replace `word2md/pyproject.toml` with:

```toml
[project]
name = "word2md"
version = "0.1.0"
description = "Convert Word .docx files to Markdown"
requires-python = ">=3.11"
dependencies = [
    "python-docx>=1.1.0",
    "markdownify>=0.14.1",
]

[project.scripts]
word2md = "word2md.gui:main"
```

- [ ] **Step 2: Move the existing lock file if it exists**

Run:

```bash
if [ -f "uv.lock" ]; then mv "uv.lock" "word2md/uv.lock"; fi
```

Expected: root `uv.lock` is gone if it existed; `word2md/uv.lock` exists if a lock file existed before.

- [ ] **Step 3: Move the Python version file if it exists**

Run:

```bash
if [ -f ".python-version" ]; then mv ".python-version" "word2md/.python-version"; fi
```

Expected: root `.python-version` is gone if it existed; `word2md/.python-version` exists if a Python version file existed before.

- [ ] **Step 4: Remove the root Python project config**

Run:

```bash
rm "pyproject.toml"
```

Expected: root `pyproject.toml` no longer exists; `word2md/pyproject.toml` is the Python project config.

- [ ] **Step 5: Refresh the Word2MD lock file**

Run:

```bash
uv --directory word2md lock
```

Expected: exit code 0 and `word2md/uv.lock` reflects the `word2md` project.

- [ ] **Step 6: Run the Word2MD tests**

Run:

```bash
uv --directory word2md run python -m unittest discover -s tests
```

Expected: PASS; the test imports `word2md.converter`, imports `word2md.gui`, creates a temporary `.docx`, and writes `sample.md`.

---

### Task 4: Remove the obsolete root Python entry point

**Files:**
- Remove: `main.py`
- Test: `word2md/tests/test_project_layout.py`

- [ ] **Step 1: Remove the root entry point**

Run:

```bash
rm "main.py"
```

Expected: root `main.py` no longer exists.

- [ ] **Step 2: Verify the package script entry point imports correctly**

Run:

```bash
uv --directory word2md run python -c "from word2md.gui import main; print(callable(main))"
```

Expected output:

```text
True
```

- [ ] **Step 3: Re-run the Word2MD tests**

Run:

```bash
uv --directory word2md run python -m unittest discover -s tests
```

Expected: PASS.

---

### Task 5: Update repository-level documentation for tool collection layout

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the root README with collection-level guidance**

Write `README.md`:

```markdown
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
```

- [ ] **Step 2: Verify the README no longer describes the root as the Python app**

Run:

```bash
python - <<'PY'
from pathlib import Path
text = Path('README.md').read_text(encoding='utf-8')
assert 'The repository root is not a Python, Node, or Rust project.' in text
assert 'cd word2md' in text
assert 'cd cli_launcher' in text
print('README describes tool collection layout')
PY
```

Expected output:

```text
README describes tool collection layout
```

---

### Task 6: Verify root cleanup and tool boundaries

**Files:**
- Inspect: root directory
- Inspect: `word2md/`
- Inspect: `cli_launcher/`

- [ ] **Step 1: Verify root Python files are gone**

Run:

```bash
test ! -f "pyproject.toml" && test ! -f "main.py" && test -f "word2md/pyproject.toml" && test -f "word2md/word2md/converter.py" && test -f "word2md/word2md/gui.py"
```

Expected: exit code 0.

- [ ] **Step 2: Verify Word2MD tests pass from its own project directory**

Run:

```bash
uv --directory word2md run python -m unittest discover -s tests
```

Expected: PASS.

- [ ] **Step 3: Verify the Word2MD console script resolves**

Run:

```bash
uv --directory word2md run python -c "import shutil; assert shutil.which('word2md'); print('word2md script available')"
```

Expected output:

```text
word2md script available
```

- [ ] **Step 4: Verify `cli_launcher` was not modified by this restructure**

Run:

```bash
git diff --name-only -- "cli_launcher"
```

Expected: no output.

If this command prints any `cli_launcher` file, inspect the diff and either revert the accidental edit or run the relevant `cli_launcher` verification commands before continuing.

- [ ] **Step 5: Inspect final git status**

Run:

```bash
git status --short
```

Expected changes should be limited to the restructuring work:

```text
D  main.py
D  pyproject.toml
R  uv.lock -> word2md/uv.lock
R  .python-version -> word2md/.python-version
R  word2md/__init__.py -> word2md/word2md/__init__.py
R  word2md/converter.py -> word2md/word2md/converter.py
R  word2md/gui.py -> word2md/word2md/gui.py
A  word2md/pyproject.toml
A  word2md/tests/test_project_layout.py
M  README.md
```

The exact rename notation may differ, but there should be no generated directories and no accidental `cli_launcher` source changes.

---

## Completion Gate

Before reporting completion, run these fresh commands and read the output:

```bash
uv --directory word2md run python -m unittest discover -s tests
```

```bash
test ! -f "pyproject.toml" && test ! -f "main.py" && test -f "word2md/pyproject.toml" && test -f "word2md/word2md/converter.py" && test -f "word2md/word2md/gui.py"
```

```bash
git diff --name-only -- "cli_launcher"
```

Completion can be claimed only if:

- Word2MD tests pass.
- Root `pyproject.toml` and `main.py` are gone.
- Word2MD owns `pyproject.toml` and nested source package files.
- `git diff --name-only -- "cli_launcher"` prints no files.

Do not create a git commit unless the user explicitly asks for one at execution time.
