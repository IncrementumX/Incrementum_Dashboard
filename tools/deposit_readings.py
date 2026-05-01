#!/usr/bin/env python3
"""
tools/deposit_readings.py
Convert PDFs/DOCXs from OneDrive folders to MD files with frontmatter.

Usage:
    python tools/deposit_readings.py --source <dir> --dest <dir> --rel-path <str>
    python tools/deposit_readings.py --source <dir> --dest <dir> --rel-path <str> --docx
    python tools/deposit_readings.py --source <dir> --dest <dir> --rel-path <str> --single "filename.pdf"
"""
import argparse
import re
import sys
from pathlib import Path


def extract_date(filename: str) -> str:
    stem = Path(filename).stem
    # ISO: YYYY-MM-DD
    m = re.search(r'(20\d{2})-(\d{2})-(\d{2})', stem)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    # Space-separated: YYYY MM DD  (e.g. "Myrmikan 2025 01 14")
    m = re.search(r'(20\d{2})\s+(\d{1,2})\s+(\d{1,2})', stem)
    if m:
        return f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}"
    # Compact: YYYYMMDD  (e.g. "20250827")
    m = re.search(r'(20\d{2})(\d{2})(\d{2})(?:\D|$)', stem)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    # US short: M-D-YY or MM-DD-YY  (e.g. "1-10-25", "12-16-25", "3-10-26")
    m = re.search(r'(\d{1,2})-(\d{1,2})-(\d{2})(?:\D|$)', stem)
    if m:
        month, day, year = m.group(1), m.group(2), m.group(3)
        return f"20{year}-{month.zfill(2)}-{day.zfill(2)}"
    return ""


def slugify(text: str) -> str:
    text = re.sub(r'\([^)]*\)', '', text)   # strip (parenthesized content)
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s_]+', '-', text)
    return text.strip('-')[:100]


def build_frontmatter(filename: str, rel_path: str) -> str:
    date = extract_date(filename)
    lines = [
        "---",
        f"source: {filename}",
        f"path: {rel_path}/{filename}",
    ]
    if date:
        lines.append(f"date: {date}")
    lines += ["status: unprocessed", "---"]
    return "\n".join(lines)


def process_pdf(pdf_path: Path, dest_dir: Path, rel_path: str) -> bool:
    try:
        from pdfminer.high_level import extract_text
    except ImportError:
        print("ERROR: pdfminer.six not installed. Run: python -m pip install pdfminer.six")
        return False

    try:
        full_text = extract_text(str(pdf_path))
    except Exception as e:
        print(f"  ERROR reading {pdf_path.name}: {e}")
        return False
    slug = slugify(pdf_path.stem) or re.sub(r'\s+', '-', pdf_path.stem.lower())[:80]
    content = f"{build_frontmatter(pdf_path.name, rel_path)}\n\n{full_text}"

    out_file = dest_dir / f"{slug}.md"
    out_file.write_text(content, encoding='utf-8')
    print(f"  OK {pdf_path.name} -> {out_file.name} ({len(full_text):,} chars)")
    return True


def process_docx(docx_path: Path, dest_dir: Path, rel_path: str) -> bool:
    try:
        import docx
    except ImportError:
        print("ERROR: python-docx not installed. Run: python -m pip install python-docx")
        return False

    try:
        doc = docx.Document(str(docx_path))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    except Exception as e:
        print(f"  ERROR reading {docx_path.name}: {e}")
        return False

    full_text = "\n\n".join(paragraphs)
    slug = slugify(docx_path.stem) or re.sub(r'\s+', '-', docx_path.stem.lower())[:80]
    content = f"{build_frontmatter(docx_path.name, rel_path)}\n\n{full_text}"

    out_file = dest_dir / f"{slug}.md"
    out_file.write_text(content, encoding='utf-8')
    print(f"  OK {docx_path.name} -> {out_file.name} ({len(full_text):,} chars)")
    return True


def main():
    parser = argparse.ArgumentParser(description="Convert PDFs/DOCXs to MD with frontmatter")
    parser.add_argument('--source', required=True, help='Source directory')
    parser.add_argument('--dest', required=True, help='Destination directory for MD files')
    parser.add_argument('--rel-path', required=True, help='Relative path for frontmatter')
    parser.add_argument('--docx', action='store_true', help='Process .docx files instead of .pdf')
    parser.add_argument('--single', help='Process one file by name (must be inside --source)')
    args = parser.parse_args()

    source_dir = Path(args.source)
    dest_dir = Path(args.dest)

    if not source_dir.exists():
        print(f"ERROR: source directory not found: {source_dir}")
        sys.exit(1)

    dest_dir.mkdir(parents=True, exist_ok=True)

    if args.single:
        files = [source_dir / args.single]
    else:
        ext = '*.docx' if args.docx else '*.pdf'
        files = sorted(source_dir.glob(ext))

    if not files:
        print(f"No files found in {source_dir}")
        sys.exit(0)

    print(f"Processing {len(files)} file(s): {source_dir.name} -> {dest_dir}")
    ok = err = 0
    for f in files:
        if not f.exists():
            print(f"  SKIP (not found): {f.name}")
            continue
        success = process_docx(f, dest_dir, args.rel_path) if args.docx else process_pdf(f, dest_dir, args.rel_path)
        ok += 1 if success else 0
        err += 0 if success else 1

    print(f"\nDone: {ok} ok, {err} errors -> {dest_dir}")


if __name__ == '__main__':
    main()
