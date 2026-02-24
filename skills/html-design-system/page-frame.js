/*
 * page-frame.js — 공통 헤더/푸터 자동 주입 + 오버플로 자동 분할
 *
 * PAGE_CONFIG 옵션:
 *   badge, title, project, section  — 기존 옵션
 *   startPage   — 전체 기준 시작 페이지 (기본: 1)
 *   totalPages  — 전체 페이지 수 (기본: 이 파일의 페이지 수)
 */
(function() {
  var C = window.PAGE_CONFIG;
  if (!C) {
    console.warn('page-frame.js: PAGE_CONFIG not defined, skipping injection.');
    return;
  }

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

  function makeFooter(globalNum, totalPages) {
    var line = buildEl('div','ftr-line');
    var txt  = buildEl('span','ftr-text',null,C.project);
    var bdg  = buildEl('span','ftr-badge',null,
                 C.section+' \u2014 '+globalNum+' / '+totalPages);
    var row  = buildEl('div','ftr-row',[txt,bdg]);
    return buildEl('div','ftr',[line,row]);
  }

  /* Wrap raw page children in table.pf (header/body/footer).
   * Sub-TOC pages (.sub-toc-wrapper) are section cover pages — skip framing. */
  function wrapPage(page) {
    if (page.querySelector('table.pf')) return false;
    if (page.querySelector('.sub-toc-wrapper')) return false;

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
    tfTd.appendChild(makeFooter(0, 0)); // placeholder — updated in Phase 3
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
    return true;
  }

  /* Get usable content height for a page */
  function getAvailH(page) {
    var ch = page.clientHeight || 1123;
    var thead = page.querySelector('thead');
    var tfoot = page.querySelector('tfoot');
    var theadH = thead ? thead.getBoundingClientRect().height : 0;
    var tfootH = tfoot ? tfoot.getBoundingClientRect().height : 0;
    var body = page.querySelector('.page-body');
    var padTop = 0, padBot = 0;
    if (body) {
      var bs = getComputedStyle(body);
      padTop = parseFloat(bs.paddingTop) || 0;
      padBot = parseFloat(bs.paddingBottom) || 0;
    }
    return ch - theadH - tfootH - padTop - padBot;
  }

  /* Effective bottom of a child including its margin-bottom */
  function childBottom(child, bodyTop) {
    var rect = child.getBoundingClientRect();
    var mb = parseFloat(getComputedStyle(child).marginBottom) || 0;
    return rect.bottom - bodyTop + mb;
  }

  /*
   * Phase 2a: Split multi-child overflow pages.
   * Iterates until stable (no more splits needed).
   */
  function splitOverflow() {
    var MAX_ITER = 200;
    for (var iter = 0; iter < MAX_ITER; iter++) {
      var pages = document.querySelectorAll('.a4-page');
      var didSplit = false;

      for (var i = 0; i < pages.length; i++) {
        var page = pages[i];
        var sh = page.scrollHeight;
        var ch = page.clientHeight;
        if (!ch || sh <= ch + 3) continue;

        var body = page.querySelector('.page-body');
        if (!body) continue;
        var children = body.children;
        if (children.length < 2) continue; // single-child → Phase 2b

        var availH = getAvailH(page);
        var padTop = parseFloat(getComputedStyle(body).paddingTop) || 0;
        var bodyTop = body.getBoundingClientRect().top + padTop;

        // Find first child whose effective bottom exceeds available area
        var splitIdx = -1;
        for (var j = 0; j < children.length; j++) {
          if (childBottom(children[j], bodyTop) > availH && j > 0) {
            splitIdx = j;
            break;
          }
        }
        if (splitIdx < 1) continue;

        // Create new .a4-page after current
        var newPage = document.createElement('div');
        newPage.className = 'a4-page';
        page.parentNode.insertBefore(newPage, page.nextSibling);

        // Move overflowing children
        var overflow = [];
        while (body.children.length > splitIdx) {
          overflow.push(body.removeChild(body.children[splitIdx]));
        }

        wrapPage(newPage);
        var newBody = newPage.querySelector('.page-body');
        for (var k = 0; k < overflow.length; k++) {
          newBody.appendChild(overflow[k]);
        }

        didSplit = true;
        break; // restart scan (DOM changed)
      }

      if (!didSplit) break;
    }
  }

  /*
   * Phase 2b: Auto-shrink single-child pages that still overflow.
   * Applies CSS transform to fit oversized embedded charts / figures.
   */
  function shrinkOverflow() {
    var pages = document.querySelectorAll('.a4-page');
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];
      var sh = page.scrollHeight;
      var ch = page.clientHeight;
      if (!ch || sh <= ch + 3) continue;

      var body = page.querySelector('.page-body');
      if (!body) continue;

      var availH = getAvailH(page);
      var padTop = parseFloat(getComputedStyle(body).paddingTop) || 0;
      var bodyTop = body.getBoundingClientRect().top + padTop;

      var children = body.children;
      for (var j = 0; j < children.length; j++) {
        var rect = children[j].getBoundingClientRect();
        var mb = parseFloat(getComputedStyle(children[j]).marginBottom) || 0;
        var totalH = rect.height + mb;
        var relBot = rect.bottom - bodyTop + mb;

        if (relBot > availH && totalH > availH * 0.7) {
          var scale = (availH - 8) / (totalH + 8);
          if (scale < 0.75) scale = 0.75; // floor: never shrink > 25%
          children[j].style.transformOrigin = 'top left';
          children[j].style.transform = 'scale(' + scale.toFixed(4) + ')';
          children[j].style.width = (100 / scale).toFixed(2) + '%';
          children[j].style.height = (totalH * scale) + 'px';
          children[j].style.marginBottom = '0px';
        }
      }
    }
  }

  /*
   * Phase 3: Update all footer page numbers.
   * Only pages with .ftr-badge are numbered (sub-TOC pages are skipped).
   */
  function updateNumbers() {
    var pages = document.querySelectorAll('.a4-page');
    var start = C.startPage || 1;
    var total = C.totalPages || pages.length;
    var num = start;
    for (var i = 0; i < pages.length; i++) {
      var badge = pages[i].querySelector('.ftr-badge');
      if (badge) {
        badge.textContent = C.section + ' \u2014 ' + num + ' / ' + total;
        num++;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    var pages = document.querySelectorAll('.a4-page');

    // Phase 1: Inject header/footer for all content pages
    for (var i = 0; i < pages.length; i++) {
      wrapPage(pages[i]);
    }

    // Phase 2a: Split multi-child overflow pages
    splitOverflow();

    // Phase 2b: Auto-shrink single-child overflow
    shrinkOverflow();

    // Phase 3: Update page numbers
    updateNumbers();
  });
})();
