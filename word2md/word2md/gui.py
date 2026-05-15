"""
Word to Markdown Converter — GUI Application.

Modern tkinter-based interface with drag-and-drop feel, progress feedback,
and a live preview of the converted Markdown output.
"""

from __future__ import annotations

import threading
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk
from pathlib import Path

from word2md.converter import convert, ConversionResult


# ---------------------------------------------------------------------------
# Color palette & design tokens
# ---------------------------------------------------------------------------

COLORS = {
    "bg":          "#f5f5f9",
    "surface":     "#eaeaf0",
    "surface2":    "#c8c8d4",
    "accent":      "#5b5fe7",
    "accent_hover":"#4a4ed6",
    "text":        "#1a1a2e",
    "text_dim":    "#6b6b8a",
    "success":     "#2e9e5a",
    "error":       "#d94452",
    "border":      "#d0d0de",
    "input_bg":    "#ffffff",
}

FONT_FAMILY = "Segoe UI"
FONT_FAMILY_MONO = "Cascadia Code"


# ---------------------------------------------------------------------------
# Custom styled widgets
# ---------------------------------------------------------------------------

class StyledButton(tk.Frame):
    """A flat button with hover color effect, built on tk.Frame + tk.Label."""

    def __init__(
        self,
        parent,
        text: str,
        command=None,
        width: int = 160,
        height: int = 40,
        bg: str = COLORS["accent"],
        bg_hover: str = COLORS["accent_hover"],
        fg: str = "#ffffff",
        **kwargs,
    ):
        super().__init__(parent, bg=COLORS["bg"], **kwargs)
        self._command = command
        self._bg = bg
        self._bg_hover = bg_hover
        self._fg = fg
        self._enabled = True

        self._label = tk.Label(
            self,
            text=text,
            font=(FONT_FAMILY, 10, "bold"),
            bg=bg,
            fg=fg,
            width=width // 10,
            height=1,
            cursor="hand2",
            padx=12,
            pady=4,
        )
        self._label.pack(fill="both", expand=True, ipady=(height - 28) // 2)

        # Bind hover and click events to the label
        self._label.bind("<Enter>", lambda e: self._on_enter())
        self._label.bind("<Leave>", lambda e: self._on_leave())
        self._label.bind("<ButtonRelease-1>", lambda e: self._on_click())

    def _on_enter(self):
        if self._enabled:
            self._label.configure(bg=self._bg_hover)

    def _on_leave(self):
        if self._enabled:
            self._label.configure(bg=self._bg)

    def _on_click(self):
        if self._enabled and self._command:
            self._command()

    def set_enabled(self, enabled: bool):
        self._enabled = enabled
        if not enabled:
            self._label.configure(bg=COLORS["surface2"], cursor="arrow")
        else:
            self._label.configure(bg=self._bg, cursor="hand2")


# ---------------------------------------------------------------------------
# Main application window
# ---------------------------------------------------------------------------

class Word2MdApp:
    """Main application window."""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Word → Markdown Converter")
        self.root.geometry("780x680")
        self.root.minsize(640, 560)
        self.root.configure(bg=COLORS["bg"])
        self.root.resizable(True, True)

        # State
        self._input_path: str = ""
        self._output_dir: str = ""
        self._converting = False

        # Try to set icon — ignore if missing
        try:
            self.root.iconbitmap(default="")
        except Exception:
            pass

        self._build_ui()

    # ---- UI construction --------------------------------------------------

    def _build_ui(self):
        root = self.root

        # Header
        header = tk.Frame(root, bg=COLORS["bg"])
        header.pack(fill="x", padx=32, pady=(28, 0))

        tk.Label(
            header,
            text="📝  Word → Markdown",
            font=(FONT_FAMILY, 20, "bold"),
            bg=COLORS["bg"],
            fg=COLORS["text"],
        ).pack(anchor="w")

        tk.Label(
            header,
            text="Convert .docx files to clean Markdown with images extraction",
            font=(FONT_FAMILY, 10),
            bg=COLORS["bg"],
            fg=COLORS["text_dim"],
        ).pack(anchor="w", pady=(4, 0))

        # Separator
        sep = tk.Frame(root, bg=COLORS["border"], height=1)
        sep.pack(fill="x", padx=32, pady=(20, 0))

        # ---- Input file row ----
        self._build_file_row(
            root,
            label="Word 文件",
            button_text="选择文件",
            command=self._select_input,
            var_attr="_input_var",
            placeholder="点击选择 .docx 文件…",
            pady_top=24,
        )

        # ---- Output dir row ----
        self._build_file_row(
            root,
            label="输出目录",
            button_text="选择目录",
            command=self._select_output,
            var_attr="_output_var",
            placeholder="默认保存到 Word 文件所在目录",
            pady_top=12,
        )

        # ---- Convert button ----
        btn_frame = tk.Frame(root, bg=COLORS["bg"])
        btn_frame.pack(fill="x", padx=32, pady=(24, 0))

        self._convert_btn = StyledButton(
            btn_frame,
            text="🚀  开始转换",
            command=self._do_convert,
            width=200,
            height=44,
        )
        self._convert_btn.pack(side="left")

        # Status label
        self._status_var = tk.StringVar(value="")
        self._status_label = tk.Label(
            btn_frame,
            textvariable=self._status_var,
            font=(FONT_FAMILY, 9),
            bg=COLORS["bg"],
            fg=COLORS["text_dim"],
            anchor="w",
        )
        self._status_label.pack(side="left", padx=(16, 0), fill="x", expand=True)

        # ---- Progress bar ----
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(
            "Custom.Horizontal.TProgressbar",
            troughcolor=COLORS["surface"],
            background=COLORS["accent"],
            bordercolor=COLORS["surface"],
            lightcolor=COLORS["accent"],
            darkcolor=COLORS["accent"],
        )

        self._progress = ttk.Progressbar(
            root,
            style="Custom.Horizontal.TProgressbar",
            orient="horizontal",
            mode="indeterminate",
            length=200,
        )
        self._progress.pack(fill="x", padx=32, pady=(12, 0))

        # ---- Preview area ----
        preview_label = tk.Label(
            root,
            text="Markdown 预览",
            font=(FONT_FAMILY, 10, "bold"),
            bg=COLORS["bg"],
            fg=COLORS["text_dim"],
            anchor="w",
        )
        preview_label.pack(fill="x", padx=32, pady=(20, 4))

        self._preview = scrolledtext.ScrolledText(
            root,
            wrap="word",
            font=(FONT_FAMILY_MONO, 9),
            bg=COLORS["input_bg"],
            fg=COLORS["text"],
            insertbackground=COLORS["text"],
            relief="flat",
            borderwidth=0,
            highlightthickness=1,
            highlightbackground=COLORS["border"],
            highlightcolor=COLORS["accent"],
            state="disabled",
            height=12,
        )
        self._preview.pack(fill="both", expand=True, padx=32, pady=(0, 24))

    def _build_file_row(
        self,
        parent,
        label: str,
        button_text: str,
        command,
        var_attr: str,
        placeholder: str,
        pady_top: int = 12,
    ):
        """Build a row with label, path display, and browse button."""
        row = tk.Frame(parent, bg=COLORS["bg"])
        row.pack(fill="x", padx=32, pady=(pady_top, 0))

        tk.Label(
            row,
            text=label,
            font=(FONT_FAMILY, 10, "bold"),
            bg=COLORS["bg"],
            fg=COLORS["text"],
            width=8,
            anchor="w",
        ).pack(side="left")

        var = tk.StringVar(value=placeholder)
        setattr(self, var_attr, var)

        entry = tk.Entry(
            row,
            textvariable=var,
            font=(FONT_FAMILY, 9),
            bg=COLORS["input_bg"],
            fg=COLORS["text_dim"],
            relief="flat",
            borderwidth=0,
            highlightthickness=1,
            highlightbackground=COLORS["border"],
            highlightcolor=COLORS["accent"],
            insertbackground=COLORS["text"],
            state="readonly",
            readonlybackground=COLORS["input_bg"],
        )
        entry.pack(side="left", fill="x", expand=True, padx=(8, 8), ipady=6)

        browse_btn = StyledButton(
            row,
            text=button_text,
            command=command,
            width=100,
            height=32,
        )
        browse_btn.pack(side="right")

    # ---- Actions ----------------------------------------------------------

    def _select_input(self):
        path = filedialog.askopenfilename(
            title="选择 Word 文件",
            filetypes=[("Word 文件", "*.docx"), ("所有文件", "*.*")],
        )
        if path:
            self._input_path = path
            self._input_var.set(path)
            # Auto-fill output dir if not set
            if not self._output_dir:
                self._output_var.set(str(Path(path).parent))

    def _select_output(self):
        path = filedialog.askdirectory(title="选择输出目录")
        if path:
            self._output_dir = path
            self._output_var.set(path)

    def _do_convert(self):
        if self._converting:
            return

        if not self._input_path:
            messagebox.showwarning("提示", "请先选择一个 Word 文件")
            return

        input_path = Path(self._input_path)
        if not input_path.exists():
            messagebox.showerror("错误", f"文件不存在:\n{input_path}")
            return

        output_dir = self._output_dir if self._output_dir else str(input_path.parent)

        # Start conversion in background thread
        self._converting = True
        self._progress.start(12)
        self._status_var.set("正在转换…")
        self._status_label.configure(fg=COLORS["text_dim"])
        self._convert_btn.set_enabled(False)

        def _worker():
            try:
                result = convert(
                    docx_path=input_path,
                    output_dir=output_dir,
                )
                self.root.after(0, lambda: self._on_success(result))
            except Exception as exc:
                self.root.after(0, lambda: self._on_error(str(exc)))

        threading.Thread(target=_worker, daemon=True).start()

    def _on_success(self, result: ConversionResult):
        self._progress.stop()
        self._converting = False
        self._convert_btn.set_enabled(True)

        img_info = f"，提取了 {result.images_extracted} 张图片" if result.images_extracted else ""
        self._status_var.set(f"✅ 转换完成{img_info}")
        self._status_label.configure(fg=COLORS["success"])

        # Show preview
        self._preview.configure(state="normal")
        self._preview.delete("1.0", "end")
        # Limit preview to first 500 lines for performance
        preview_text = "\n".join(result.markdown.splitlines()[:500])
        self._preview.insert("1.0", preview_text)
        self._preview.configure(state="disabled")

        messagebox.showinfo(
            "转换完成",
            f"Markdown 已保存到:\n{result.output_path}"
            + (f"\n\n共提取 {result.images_extracted} 张图片" if result.images_extracted else ""),
        )

    def _on_error(self, error_msg: str):
        self._progress.stop()
        self._converting = False
        self._convert_btn.set_enabled(True)
        self._status_var.set(f"❌ 转换失败")
        self._status_label.configure(fg=COLORS["error"])
        messagebox.showerror("转换错误", f"转换过程中出错:\n\n{error_msg}")

    # ---- Run --------------------------------------------------------------

    def run(self):
        self.root.mainloop()


def main():
    app = Word2MdApp()
    app.run()


if __name__ == "__main__":
    main()
