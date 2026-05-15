"""
Word (.docx) to Markdown converter engine.

Uses python-docx to parse document structure and markdownify for HTML-to-MD conversion.
Handles headings, paragraphs, tables, images, lists, and inline formatting.
"""

from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.document import Document as DocumentType
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph
from markdownify import markdownify


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_images(doc: DocumentType, output_dir: Path) -> dict[str, str]:
    """Extract embedded images and return a mapping of rId -> relative path."""
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    mapping: dict[str, str] = {}

    for rel in doc.part.rels.values():
        if "image" in rel.reltype:
            image_data = rel.target_part.blob
            image_name = Path(rel.target_part.partname).name
            image_path = images_dir / image_name
            image_path.write_bytes(image_data)
            mapping[rel.rId] = f"images/{image_name}"

    return mapping


def _paragraph_to_html(para: Paragraph, image_map: dict[str, str]) -> str:
    """Convert a single paragraph to an HTML string preserving inline formatting."""
    style_name = (para.style.name or "").lower()

    # Detect heading level
    heading_level = 0
    if style_name.startswith("heading"):
        try:
            heading_level = int(style_name.replace("heading", "").strip())
        except ValueError:
            heading_level = 0

    # Detect list style
    numPr = para._element.find(qn("w:pPr"))
    is_list = False
    is_ordered = False
    if numPr is not None:
        numId_elem = numPr.find(qn("w:numPr"))
        if numId_elem is not None:
            is_list = True
            # Attempt to detect ordered list via numId
            numId_val = numId_elem.find(qn("w:numId"))
            if numId_val is not None:
                val = numId_val.get(qn("w:val"))
                if val and int(val) > 0:
                    # Heuristic: check if style name contains 'list number'
                    if "number" in style_name or "ordered" in style_name:
                        is_ordered = True

    parts: list[str] = []
    for run in para.runs:
        text = run.text or ""

        # Check for inline images in this run
        drawing_elements = run._element.findall(qn("w:drawing"))
        for drawing in drawing_elements:
            blip = drawing.find(".//" + qn("a:blip"))
            if blip is not None:
                rId = blip.get(qn("r:embed"))
                if rId and rId in image_map:
                    parts.append(f'<img src="{image_map[rId]}" alt="image" />')

        if not text:
            continue

        # Apply inline formatting
        if run.bold:
            text = f"<strong>{text}</strong>"
        if run.italic:
            text = f"<em>{text}</em>"
        if run.underline:
            text = f"<u>{text}</u>"
        if run.font.strike:
            text = f"<s>{text}</s>"
        if run.font.superscript:
            text = f"<sup>{text}</sup>"
        if run.font.subscript:
            text = f"<sub>{text}</sub>"

        parts.append(text)

    content = "".join(parts)

    if not content.strip():
        return ""

    if heading_level:
        tag = f"h{heading_level}"
        return f"<{tag}>{content}</{tag}>"

    if is_list:
        if is_ordered:
            return f"<ol><li>{content}</li></ol>"
        return f"<ul><li>{content}</li></ul>"

    return f"<p>{content}</p>"


def _table_to_html(table: Table) -> str:
    """Convert a docx table to an HTML table string."""
    rows_html: list[str] = []
    for i, row in enumerate(table.rows):
        cells_html: list[str] = []
        for cell in row.cells:
            cell_text = cell.text.strip()
            tag = "th" if i == 0 else "td"
            cells_html.append(f"<{tag}>{cell_text}</{tag}>")
        rows_html.append("<tr>" + "".join(cells_html) + "</tr>")
    return "<table>" + "".join(rows_html) + "</table>"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class ConversionResult:
    """Holds the result of a Word-to-Markdown conversion."""

    def __init__(self, markdown: str, output_path: Path, images_extracted: int):
        self.markdown = markdown
        self.output_path = output_path
        self.images_extracted = images_extracted


def convert(
    docx_path: str | Path,
    output_dir: str | Path | None = None,
    output_filename: str | None = None,
) -> ConversionResult:
    """
    Convert a .docx file to Markdown.

    Args:
        docx_path: Path to the source .docx file.
        output_dir: Directory to write the .md file and images. Defaults to same dir as docx.
        output_filename: Name of the output .md file. Defaults to <docx_stem>.md.

    Returns:
        ConversionResult with the generated markdown text and output path.
    """
    docx_path = Path(docx_path)
    if not docx_path.exists():
        raise FileNotFoundError(f"File not found: {docx_path}")

    if output_dir is None:
        output_dir = docx_path.parent
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if output_filename is None:
        output_filename = docx_path.stem + ".md"

    doc = Document(str(docx_path))

    # Extract images
    image_map = _extract_images(doc, output_dir)
    images_count = len(image_map)

    # Build HTML from document body elements
    html_parts: list[str] = []

    for element in doc.element.body:
        tag = element.tag.split("}")[-1] if "}" in element.tag else element.tag

        if tag == "p":
            para = Paragraph(element, doc)
            html = _paragraph_to_html(para, image_map)
            if html:
                html_parts.append(html)

        elif tag == "tbl":
            table = Table(element, doc)
            html = _table_to_html(table)
            if html:
                html_parts.append(html)

    # Convert assembled HTML to Markdown
    full_html = "\n".join(html_parts)
    markdown = markdownify(full_html, heading_style="ATX", bullets="-")

    # Clean up excessive blank lines
    markdown = re.sub(r"\n{3,}", "\n\n", markdown).strip() + "\n"

    # Write output
    output_path = output_dir / output_filename
    output_path.write_text(markdown, encoding="utf-8")

    return ConversionResult(
        markdown=markdown,
        output_path=output_path,
        images_extracted=images_count,
    )
