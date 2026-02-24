#!/usr/bin/env python3
"""
Markdown to HTML converter for proposal documents.
- Splits at h2/h3 into discrete page cards, each with its own header & footer.
- Uses <table> thead/tfoot so that when a section overflows A4,
  the header & footer repeat on EVERY printed page automatically.
- thead is NOT sticky — it scrolls normally with the card on screen.
- Self-contained html_output/ folder for sharing.
"""

import re
import sys
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).parent
IMAGES_DIR = BASE_DIR / "images"
OUTPUT_DIR = BASE_DIR / "html_output"
EMBEDDING_DIR = OUTPUT_DIR / "_embedding"
ASSETS_DIR = OUTPUT_DIR / "_images"

PROJECT_NAME = BASE_DIR.parent.name.replace('_', ' ')

ROMAN = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
         7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X'}


# ---------------------------------------------------------------------------
# Markdown parsing helpers
# ---------------------------------------------------------------------------

def find_html_source(img_path: str) -> str | None:
    basename = Path(img_path).stem
    html_path = IMAGES_DIR / f"{basename}.html"
    if html_path.exists():
        return html_path.read_text(encoding="utf-8")
    return None

def get_html_source_path(img_path: str) -> Path | None:
    basename = Path(img_path).stem
    html_path = IMAGES_DIR / f"{basename}.html"
    return html_path if html_path.exists() else None

def extract_html_body_and_style(html_content: str, idx: int) -> str:
    style_match = re.search(r'<style>(.*?)</style>', html_content, re.DOTALL)
    style_content = style_match.group(1) if style_match else ""
    body_match = re.search(r'<body[^>]*>(.*?)</body>', html_content, re.DOTALL)
    body_content = body_match.group(1).strip() if body_match else ""
    if not body_content:
        parts = re.split(r'</head>\s*<body[^>]*>|</style>\s*</head>\s*<body[^>]*>', html_content)
        if len(parts) > 1:
            body_content = re.sub(r'</body>\s*</html>', '', parts[-1]).strip()
    scope = f"embedded-chart-{idx}"
    scoped_css = ""
    if style_content:
        out = []
        for line in style_content.strip().split('\n'):
            s = line.strip()
            if not s:
                out.append(line); continue
            if '{' in s and not s.startswith('}'):
                sel_part, rest = s.split('{', 1)
                new_sels = []
                for sel in sel_part.split(','):
                    sel = sel.strip()
                    if sel in ('*', 'body', 'html'):
                        new_sels.append(f'.{scope}')
                    elif sel.startswith('body ') or sel.startswith('html '):
                        new_sels.append(f'.{scope} {re.sub(r"^(body|html)\\s+", "", sel)}')
                    else:
                        new_sels.append(f'.{scope} {sel}')
                out.append(f"  {', '.join(new_sels)} {{{rest}")
            else:
                out.append(line)
        scoped_css = '\n'.join(out)
    return (f'<style>\n{scoped_css}\n</style>\n'
            f'<div class="{scope} embedded-chart">\n{body_content}\n</div>')

def process_inline(text: str) -> str:
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text

def parse_table(lines: list[str]) -> str:
    if len(lines) < 2: return ""
    html = '<div class="table-wrapper"><table class="ctbl">\n<thead><tr>\n'
    for c in lines[0].strip('|').split('|'):
        html += f'  <th>{process_inline(c.strip())}</th>\n'
    html += '</tr></thead>\n<tbody>\n'
    for line in lines[2:]:
        html += '<tr>\n'
        for c in line.strip('|').split('|'):
            html += f'  <td>{process_inline(c.strip())}</td>\n'
        html += '</tr>\n'
    html += '</tbody>\n</table></div>\n'
    return html


# ---------------------------------------------------------------------------
# Parse markdown → list of page content fragments
# ---------------------------------------------------------------------------

def parse_markdown_to_pages(md_content: str):
    lines = md_content.split('\n')
    pages: list[list[str]] = [[]]
    embedded_charts, referenced_images = [], []
    chart_idx = 0
    first_section = False
    i = 0

    def emit(frag): pages[-1].append(frag)

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith('<!--'):
            while i < len(lines) and '-->' not in lines[i]: i += 1
            i += 1; continue

        if not line.strip(): i += 1; continue

        hm = re.match(r'^(#{1,6})\s+(.+)$', line)
        if hm:
            lvl = len(hm.group(1)); raw = hm.group(2)
            txt = process_inline(raw)
            hid = re.sub(r'[^\w가-힣-]', '', raw.lower().replace(' ', '-'))
            if lvl in (2, 3):
                if first_section: pages.append([])
                first_section = True
            emit(f'<h{lvl} id="{hid}">{txt}</h{lvl}>\n')
            i += 1; continue

        if re.match(r'^---+\s*$', line):
            emit('<hr>\n'); i += 1; continue

        im = re.match(r'^!\[([^\]]*)\]\(([^)]+)\)\s*$', line)
        if im:
            alt, src = im.group(1), im.group(2)
            cap = ""
            if i+1 < len(lines) and lines[i+1].strip().startswith('*['):
                cm = re.match(r'^\*(\[.+\].*)\*$', lines[i+1].strip())
                if cm: cap = cm.group(1); i += 1
            hs = find_html_source(src); hp = get_html_source_path(src)
            if hs and hp:
                chart_idx += 1; embedded_charts.append(hp.name)
                emb = extract_html_body_and_style(hs, chart_idx)
                emit('<div class="figure-container">\n'); emit(emb)
                if cap: emit(f'\n<p class="figure-caption">{process_inline(cap)}</p>')
                emit('\n</div>\n')
            else:
                fn = Path(src).name; referenced_images.append(fn)
                emit('<div class="figure-container">\n')
                emit(f'  <img src="_images/{fn}" alt="{alt}" class="figure-image">\n')
                if cap: emit(f'  <p class="figure-caption">{process_inline(cap)}</p>\n')
                emit('</div>\n')
            i += 1; continue

        if line.strip().startswith('>'):
            ql = []
            while i < len(lines) and (lines[i].strip().startswith('>') or
                    (lines[i].strip() and ql and not lines[i].strip().startswith('#')
                     and not lines[i].strip().startswith('|')
                     and not lines[i].strip().startswith('-')
                     and not lines[i].strip().startswith('!'))):
                ql.append(re.sub(r'^>\s?', '', lines[i])); i += 1
            emit('<blockquote>\n')
            for p in re.split(r'\n\n+', '\n'.join(ql).strip()):
                if p.strip(): emit(f'  <p>{process_inline(p.strip())}</p>\n')
            emit('</blockquote>\n'); continue

        if '|' in line and line.strip().startswith('|'):
            tl = []
            while i < len(lines) and '|' in lines[i] and lines[i].strip():
                tl.append(lines[i]); i += 1
            if len(tl) >= 2: emit(parse_table(tl))
            continue

        if re.match(r'^(\s*)[-*]\s+', line):
            emit('<ul>\n')
            while i < len(lines) and (re.match(r'^(\s*)[-*]\s+', lines[i]) or
                    (lines[i].strip() and lines[i].startswith('  '))):
                lm = re.match(r'^(\s*)[-*]\s+(.+)$', lines[i])
                if lm: emit(f'  <li>{process_inline(lm.group(2))}</li>\n')
                i += 1
            emit('</ul>\n'); continue

        if re.match(r'^\d+\.\s+', line):
            emit('<ol>\n')
            while i < len(lines) and re.match(r'^\d+\.\s+', lines[i]):
                lm = re.match(r'^\d+\.\s+(.+)$', lines[i])
                if lm: emit(f'  <li>{process_inline(lm.group(1))}</li>\n')
                i += 1
            emit('</ol>\n'); continue

        if re.match(r'^\*\[.+\].*\*$', line.strip()):
            ct = re.sub(r'^\*|\*$', '', line.strip())
            emit(f'<p class="figure-caption">{process_inline(ct)}</p>\n')
            i += 1; continue

        pl = []
        while (i < len(lines) and lines[i].strip()
               and not lines[i].strip().startswith('#')
               and not lines[i].strip().startswith('|')
               and not lines[i].strip().startswith('>')
               and not lines[i].strip().startswith('!')
               and not re.match(r'^---+', lines[i])
               and not re.match(r'^[-*]\s+', lines[i])
               and not re.match(r'^\d+\.\s+', lines[i])):
            pl.append(lines[i]); i += 1
        if pl:
            emit(f'<p>{process_inline(" ".join(l.strip() for l in pl))}</p>\n')
            continue
        i += 1

    return pages, embedded_charts, referenced_images


# ---------------------------------------------------------------------------
# HTML assembly
# ---------------------------------------------------------------------------

def build_page_div(body: str, section_num: str, section_title: str,
                   project_name: str, page_idx: int, total: int,
                   is_last: bool) -> str:
    cls = "a4-page last-page" if is_last else "a4-page"
    return f"""<div class="{cls}">
  <table class="pf">
    <thead><tr><th>
      <div class="hdr">
        <div class="hdr-row">
          <div class="hdr-left">
            <span class="hdr-badge">{section_num}</span>
            <span class="hdr-title">{section_title}</span>
          </div>
          <span class="hdr-project">{project_name}</span>
        </div>
        <div class="hdr-line"></div>
      </div>
    </th></tr></thead>
    <tfoot><tr><td>
      <div class="ftr">
        <div class="ftr-line"></div>
        <div class="ftr-row">
          <span class="ftr-text">{project_name}</span>
          <span class="ftr-badge">{section_num}. {section_title} &mdash; {page_idx} / {total}</span>
        </div>
      </div>
    </td></tr></tfoot>
    <tbody><tr><td class="page-body">
{body}
    </td></tr></tbody>
  </table>
</div>"""


def build_html(pages, title, section_num, section_title, project_name):
    total = len(pages)
    divs = []
    for idx, frags in enumerate(pages, 1):
        body = '\n'.join(frags)
        divs.append(build_page_div(body, section_num, section_title,
                                   project_name, idx, total, idx == total))
    pages_html = '\n\n'.join(divs)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
/* ===== Reset ===== */
*{{margin:0;padding:0;box-sizing:border-box}}

body {{
  font-family: 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif;
  background: #E5E9EF;
  color: #1A202C;
  line-height: 1.7;
  padding: 24px 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}

/* ===== A4 Card ===== */
.a4-page {{
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto 28px;
  background: #fff;
  box-shadow: 0 2px 24px rgba(0,0,0,.10);
  position: relative;
}}
.a4-page.last-page {{ margin-bottom:0 }}

/* left stripe via border + triangle via pseudo */
.a4-page::before {{
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 5px; height: 100%;
  background: linear-gradient(180deg,#1B2A4A,#2E75B6);
  z-index: 5;
}}
.a4-page::after {{
  content: '';
  position: absolute;
  top: 0; left: 0;
  border-left: 48px solid #1B2A4A;
  border-bottom: 36px solid transparent;
  z-index: 6;
}}

/* ===== Page-Frame Table ===== */
.pf {{
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}}
.pf th, .pf > thead > tr > th,
.pf td, .pf > tbody > tr > td,
.pf > tfoot > tr > td {{
  padding: 0; border: none;
  text-align: left; font-weight: normal;
  vertical-align: top;
}}

/* ===== Header (in thead — NOT sticky, repeats on print) ===== */
.hdr {{
  padding: 22px 36px 0 48px;
}}
.hdr-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.hdr-left {{
  display: flex;
  align-items: center;
  gap: 14px;
}}
.hdr-badge {{
  background: linear-gradient(135deg,#1B2A4A,#2E75B6);
  color: #fff; font-size: 15px; font-weight: 700;
  padding: 5px 18px; border-radius: 5px;
  letter-spacing: 1.5px; white-space: nowrap;
}}
.hdr-title {{
  font-size: 17px; font-weight: 700;
  color: #1A3C5E; letter-spacing: .5px;
}}
.hdr-project {{
  font-size: 10px; color: #999;
  letter-spacing: .3px; text-align: right; flex-shrink: 0;
}}
.hdr-line {{
  height: 2.5px;
  background: linear-gradient(90deg,#1B2A4A 0%,#2E75B6 40%,#5B9BD5 75%,#E2E8F0 100%);
  margin-top: 12px; border-radius: 2px;
}}

/* ===== Page Body (in tbody) ===== */
.page-body {{
  padding: 20px 36px 24px 48px;
  min-height: 232mm;          /* push tfoot toward bottom of A4 card */
}}

/* ===== Footer (in tfoot — repeats on print) ===== */
.ftr {{
  padding: 0 36px 16px 48px;
}}
.ftr-line {{
  height: 1px;
  background: linear-gradient(90deg,#CBD5E0 0%,#E2E8F0 60%,transparent 100%);
  margin-bottom: 8px;
}}
.ftr-row {{
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.ftr-text {{
  font-size: 9px; color: #A0AEC0; letter-spacing: .3px;
}}
.ftr-badge {{
  background: #C0392B; color: #fff;
  font-size: 8px; font-weight: 700;
  padding: 3px 12px; border-radius: 3px; letter-spacing: .5px;
}}

/* ===== Typography ===== */
h1 {{ font-size:26px;color:#1B2A4A;border-bottom:3px solid #2D5F8A;padding-bottom:12px;margin:4px 0 20px;letter-spacing:1px }}
h2 {{ font-size:20px;color:#1B2A4A;border-left:4px solid #2D5F8A;padding-left:14px;margin:4px 0 14px }}
h3 {{ font-size:17px;color:#2D5F8A;margin:4px 0 12px;padding-bottom:6px;border-bottom:1px solid #E2E8F0 }}
h4 {{ font-size:14.5px;color:#2D3748;margin:18px 0 8px }}
h5 {{ font-size:13.5px;color:#4A5568;margin:14px 0 6px }}
h6 {{ font-size:12.5px;color:#718096;margin:12px 0 5px }}
p  {{ font-size:12.5px;line-height:1.85;margin:6px 0;color:#2D3748 }}
strong {{ color:#1A202C }}
code {{ background:#EDF2F7;padding:2px 6px;border-radius:3px;font-size:11.5px;font-family:'Consolas','Monaco',monospace;color:#C53030 }}
a {{ color:#2B6CB0;text-decoration:none }}
a:hover {{ text-decoration:underline }}

/* ===== Content Tables ===== */
.table-wrapper {{ overflow-x:auto;margin:10px 0;border-radius:6px;border:1px solid #E2E8F0 }}
.ctbl {{ width:100%;border-collapse:collapse;font-size:12px }}
.ctbl thead th {{ background:linear-gradient(135deg,#1B2A4A,#2D5F8A);color:#fff;padding:9px 12px;text-align:left;font-weight:600;font-size:11.5px;letter-spacing:.3px;white-space:nowrap }}
.ctbl tbody td {{ padding:8px 12px;border-bottom:1px solid #EDF2F7;color:#2D3748;vertical-align:top }}
.ctbl tbody tr:nth-child(even) {{ background:#F7FAFC }}
.ctbl tbody tr:hover {{ background:#EBF4FF }}

/* ===== Lists ===== */
ul,ol {{ margin:8px 0 8px 22px;font-size:12.5px;color:#2D3748 }}
li {{ margin:3px 0;line-height:1.75 }}

/* ===== Blockquotes ===== */
blockquote {{ border-left:4px solid #4A90D9;background:linear-gradient(135deg,#EBF8FF,#F0F7FF);padding:12px 18px;margin:12px 0;border-radius:0 6px 6px 0 }}
blockquote p {{ font-size:12px;color:#2A4365;margin:3px 0 }}

/* ===== HR ===== */
hr {{ border:none;height:2px;background:linear-gradient(90deg,#2D5F8A,#E2E8F0);margin:24px 0;border-radius:1px }}

/* ===== Figures ===== */
.figure-container {{ margin:16px 0;text-align:center }}
.figure-image {{ max-width:100%;height:auto;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.07) }}
.figure-caption {{ font-size:10.5px;color:#718096;margin-top:6px;font-style:italic;text-align:center }}

/* ===== Embedded Charts ===== */
.embedded-chart {{ margin:6px 0;border-radius:6px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 1px 8px rgba(0,0,0,.04);background:#fff }}

/* =================================================================
   PRINT — A4 per section, thead/tfoot repeat on overflow pages
   ================================================================= */
@media print {{
  body {{ background:#fff;margin:0;padding:0 }}
  @page {{ size:210mm 297mm; margin:10mm 14mm 10mm 14mm }}

  .a4-page {{
    width:auto; min-height:auto;
    margin:0; box-shadow:none;
    page-break-after: always;
    break-after: page;
  }}
  .a4-page.last-page {{
    page-break-after: auto;
    break-after: auto;
  }}

  /* stripe repeats on every printed page via fixed */
  .a4-page::before {{
    position: fixed;
    top:0; left:0;
    width:4px; height:100%;
  }}
  .a4-page::after {{
    position: fixed;
    top:0; left:0;
  }}

  .hdr {{ padding: 2px 8px 0 12px }}
  .hdr-line {{ margin-top:8px }}
  .page-body {{ padding:12px 8px 8px 12px; min-height:auto }}
  .ftr {{ padding:0 8px 2px 12px }}

  .embedded-chart,.table-wrapper,.figure-container {{
    break-inside:avoid; page-break-inside:avoid
  }}
  h2,h3,h4 {{ break-after:avoid; page-break-after:avoid }}
}}
</style>
</head>
<body>
{pages_html}
</body>
</html>"""


# ---------------------------------------------------------------------------
# File conversion
# ---------------------------------------------------------------------------

def convert_file(md_path: Path):
    print(f"Converting: {md_path.name}")
    md = md_path.read_text(encoding="utf-8")
    stem = md_path.stem
    num = int(stem[:2])
    roman = ROMAN.get(num, str(num))
    sec_name = stem[3:].replace('_', ' ')
    tm = re.search(r'^#{{1,2}}\s+(.+)$', md, re.MULTILINE)
    title = tm.group(1) if tm else sec_name

    pages, ec, ri = parse_markdown_to_pages(md)
    html = build_html(pages, title, roman, sec_name, PROJECT_NAME)

    out = OUTPUT_DIR / (stem + ".html")
    out.write_text(html, encoding="utf-8")
    print(f"  -> {out.name}  ({len(html):,} B, {len(pages)} pages, "
          f"{len(ec)} charts, {len(ri)} imgs)")
    return ec, ri


def main():
    for d in (OUTPUT_DIR, EMBEDDING_DIR, ASSETS_DIR):
        d.mkdir(exist_ok=True)

    md_files = sorted(BASE_DIR.glob("[0-9][0-9]_*.md"))
    if not md_files:
        print("No markdown files found!"); sys.exit(1)

    print(f"Project : {PROJECT_NAME}")
    print(f"Output  : {OUTPUT_DIR}\n")

    all_ec, all_ri = set(), set()
    for f in md_files:
        ec, ri = convert_file(f)
        all_ec.update(ec); all_ri.update(ri)

    print(f"\n_embedding/ <- {len(all_ec)} chart HTMLs")
    for n in sorted(all_ec):
        s = IMAGES_DIR / n
        if s.exists(): shutil.copy2(s, EMBEDDING_DIR / n)

    print(f"_images/    <- {len(all_ri)} referenced PNGs")
    for n in sorted(all_ri):
        s = IMAGES_DIR / n
        if s.exists(): shutil.copy2(s, ASSETS_DIR / n)
        else: print(f"  WARNING: {n} not found")

    print("\nDone! html_output/ is self-contained.")


if __name__ == "__main__":
    main()
