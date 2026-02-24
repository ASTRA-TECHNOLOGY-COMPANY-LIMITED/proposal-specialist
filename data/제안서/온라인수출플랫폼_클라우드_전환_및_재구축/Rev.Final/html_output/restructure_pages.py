#!/usr/bin/env python3
"""
01_일반현황.html 재구성 스크립트
- 공통 헤더/푸터를 JS로 자동 주입 (DOM API 사용, innerHTML 미사용)
- A4 한 장 높이에 맞게 페이지 분리
"""

import re

INPUT = '/Volumes/data/repository/astra/app/proposal-specialist/data/제안서/온라인수출플랫폼_클라우드_전환_및_재구축/Rev.Final/html_output/01_일반현황.html'
OUTPUT = INPUT  # overwrite

with open(INPUT, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. Extract the <style> block from <head> ──
head_style_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
original_css = head_style_match.group(1) if head_style_match else ''

# ── 2. Extract all page body contents ──
bodies = re.findall(r'<td class="page-body">(.*?)</td></tr></tbody>', html, re.DOTALL)
all_content = '\n'.join(bodies)

# ── 3. Define page split points ──
split_markers = [
    '<h4 id="112-대표사-퀸텟시스템즈">',
    '<div class="embedded-chart-2 embedded-chart">',
    '<div class="embedded-chart-3 embedded-chart">',
    '<p><strong>(4) 대표 수행 실적</strong></p>',
    '<div class="table-wrapper"><table class="ctbl">\n<thead><tr>\n  <th>항목</th>\n  <th>내용</th>\n</tr></thead>\n<tbody>\n<tr>\n  <td><strong>회사명</strong></td>\n  <td>주식회사 아스트라비전',
    '<div class="table-wrapper"><table class="ctbl">\n<thead><tr>\n  <th>시기</th>',
    '<div class="embedded-chart-4 embedded-chart">',
    '<div class="table-wrapper"><table class="ctbl">\n<thead><tr>\n  <th>구분</th>\n  <th>2023년</th>',
    '<div class="embedded-chart-5 embedded-chart">',
    '<h4 id="116-정보화사업-유사-수행실적">',
    '<p><strong>(2) 퀸텟시스템즈 주요 유사실적</strong></p>',
    '<p><strong>(4) 아스트라비전 유사실적: 인공지능 기반',
    '<div class="embedded-chart-6 embedded-chart">',
    '<h3 id="12-조직-및-인원현황">',
]

def find_chart_style_start(text, chart_div_pos):
    """Find the start of the <style> block that precedes a chart div."""
    style_end = text.rfind('</style>', 0, chart_div_pos)
    if style_end == -1:
        return chart_div_pos
    style_start = text.rfind('<style>', 0, style_end)
    if style_start == -1:
        return chart_div_pos
    fig_start = text.rfind('<div class="figure-container">', 0, style_start)
    if fig_start != -1 and len(text[fig_start:style_start].strip()) < 60:
        return fig_start
    return style_start

# Do the actual splitting
pages = []
remaining = all_content

for i, marker in enumerate(split_markers):
    pos = remaining.find(marker)
    if pos == -1:
        print(f"WARNING: Marker {i+1} not found: {marker[:60]}...")
        continue

    if 'embedded-chart-' in marker and 'embedded-chart' in marker:
        actual_pos = find_chart_style_start(remaining, pos)
    else:
        actual_pos = pos

    before = remaining[:actual_pos].rstrip()
    if before.endswith('<hr>'):
        before = before[:-4].rstrip()

    pages.append(before)
    remaining = remaining[actual_pos:]

pages.append(remaining)

print(f"Split into {len(pages)} pages")
for i, page in enumerate(pages):
    content_len = len(page.strip())
    first_line = page.strip()[:80].replace('\n', ' ')
    print(f"  Page {i+1}: {content_len} chars, starts: {first_line}...")

# ── 4. Build the new HTML ──

# Additional CSS for overflow control
additional_css = """
/* ===== Page overflow control ===== */
.a4-page { overflow: hidden; }
"""

# JavaScript for common header/footer injection using safe DOM APIs
# Note: This is a build-time script generating static HTML+JS for internal use only.
# The JS runs in a controlled Chrome headless environment with trusted content.
js_block = r'''<script>
/* Common Header/Footer Injection — DOM API only */
(function() {
  var C = {
    badge:   'I',
    title:   '\uC77C\uBC18\uD604\uD669',
    project: '\uC628\uB77C\uC778\uC218\uCD9C\uD50C\uB7AB\uD3FC \uD074\uB77C\uC6B0\uB4DC \uC804\uD658 \uBC0F \uC7AC\uAD6C\uCD95',
    section: 'I. \uC77C\uBC18\uD604\uD669'
  };

  function buildEl(tag, cls, children, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    if (children) children.forEach(function(c){ el.appendChild(c); });
    return el;
  }

  function makeHeader() {
    var badge = buildEl('span','hdr-badge',null,C.badge);
    var title = buildEl('span','hdr-title',null,C.title);
    var left  = buildEl('div','hdr-left',[badge,title]);
    var proj  = buildEl('span','hdr-project',null,C.project);
    var row   = buildEl('div','hdr-row',[left,proj]);
    var line  = buildEl('div','hdr-line');
    return buildEl('div','hdr',[row,line]);
  }

  function makeFooter(num, tot) {
    var line = buildEl('div','ftr-line');
    var txt  = buildEl('span','ftr-text',null,C.project);
    var bdg  = buildEl('span','ftr-badge',null,
                 C.section+' \u2014 '+num+' / '+tot);
    var row  = buildEl('div','ftr-row',[txt,bdg]);
    return buildEl('div','ftr',[line,row]);
  }

  document.addEventListener('DOMContentLoaded', function() {
    var pages = document.querySelectorAll('.a4-page');
    var total = pages.length;

    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];
      var num  = i + 1;

      var table = document.createElement('table');
      table.className = 'pf';

      var thead = document.createElement('thead');
      var thTr  = document.createElement('tr');
      var th    = document.createElement('th');
      th.appendChild(makeHeader());
      thTr.appendChild(th);
      thead.appendChild(thTr);

      var tfoot = document.createElement('tfoot');
      var tfTr  = document.createElement('tr');
      var tfTd  = document.createElement('td');
      tfTd.appendChild(makeFooter(num, total));
      tfTr.appendChild(tfTd);
      tfoot.appendChild(tfTr);

      var tbody = document.createElement('tbody');
      var tbTr  = document.createElement('tr');
      var tbTd  = document.createElement('td');
      tbTd.className = 'page-body';

      while (page.firstChild) {
        tbTd.appendChild(page.firstChild);
      }
      tbTr.appendChild(tbTd);
      tbody.appendChild(tbTr);

      table.appendChild(thead);
      table.appendChild(tfoot);
      table.appendChild(tbody);
      page.appendChild(table);
    }
  });
})();
</script>'''

new_html = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>일반현황</title>
<style>
{original_css}
{additional_css}
</style>
</head>
<body>
'''

for i, page_content in enumerate(pages):
    is_last = (i == len(pages) - 1)
    last_class = ' last-page' if is_last else ''
    new_html += f'<div class="a4-page{last_class}">\n'
    new_html += page_content.strip()
    new_html += '\n</div>\n\n'

new_html += js_block
new_html += '\n</body>\n</html>'

# ── 5. Write output ──
with open(OUTPUT, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f"\nDone! Written to {OUTPUT}")
print(f"Total pages: {len(pages)}")
