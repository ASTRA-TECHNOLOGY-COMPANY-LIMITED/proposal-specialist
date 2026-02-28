/*
 * finalize-nav.js — 플로팅 네비게이션 바 자동 삽입
 *
 * 사용법:
 *   <script src="../styles/finalize-nav.js"></script>
 *
 * nav-manifest.json을 로드하여 현재 파일 위치 기준으로
 * 이전/다음 섹션, 장 목차, 대메뉴 링크를 플로팅 네비바로 주입한다.
 *
 * page-frame.js의 A4 레이아웃과 간섭 없음 (position: fixed).
 */
(function () {
  'use strict';

  /* ── Determine base path to nav-manifest.json ── */
  function resolveManifestPath() {
    var path = window.location.pathname;
    // sections/xx.html → ../nav-manifest.json
    if (path.indexOf('/sections/') !== -1) {
      return '../nav-manifest.json';
    }
    // chapters/xx.html → ../nav-manifest.json
    if (path.indexOf('/chapters/') !== -1) {
      return '../nav-manifest.json';
    }
    // index.html (root) → nav-manifest.json
    return 'nav-manifest.json';
  }

  /* ── Determine relative prefix to final/ root ── */
  function resolveRootPrefix() {
    var path = window.location.pathname;
    if (path.indexOf('/sections/') !== -1 || path.indexOf('/chapters/') !== -1) {
      return '../';
    }
    return '';
  }

  /* ── Extract current filename from path ── */
  function currentFilename() {
    var path = window.location.pathname;
    var parts = path.split('/');
    return parts[parts.length - 1];
  }

  /* ── Flatten manifest into ordered section list ── */
  function flattenSections(manifest) {
    var list = [];
    var chapters = manifest.chapters || [];
    for (var i = 0; i < chapters.length; i++) {
      var ch = chapters[i];
      var sections = ch.sections || [];
      for (var j = 0; j < sections.length; j++) {
        list.push({
          number: sections[j].number,
          title: sections[j].title,
          href: sections[j].href,
          chapterHref: ch.href,
          chapterTitle: ch.number + '. ' + ch.title
        });
      }
    }
    return list;
  }

  /* ── Find current section index by matching filename ── */
  function findCurrentIndex(sections, filename) {
    for (var i = 0; i < sections.length; i++) {
      var href = sections[i].href;
      var hrefFile = href.split('/').pop();
      if (hrefFile === filename) {
        return i;
      }
    }
    return -1;
  }

  /* ── Build and inject nav bar ── */
  function injectNav(manifest) {
    var prefix = resolveRootPrefix();
    var filename = currentFilename();
    var sections = flattenSections(manifest);
    var idx = findCurrentIndex(sections, filename);

    // Only inject nav on section pages
    if (idx === -1) return;

    var current = sections[idx];
    var prev = idx > 0 ? sections[idx - 1] : null;
    var next = idx < sections.length - 1 ? sections[idx + 1] : null;

    var nav = document.createElement('nav');
    nav.className = 'finalize-nav';

    var inner = document.createElement('div');
    inner.className = 'finalize-nav-inner';

    // Previous link
    var prevLink = document.createElement('a');
    prevLink.className = 'nav-prev';
    if (prev) {
      prevLink.href = prefix + prev.href;
      prevLink.textContent = '\u2190 \uc774\uc804';
      prevLink.title = prev.number + ' ' + prev.title;
    } else {
      prevLink.className += ' disabled';
      prevLink.textContent = '\u2190 \uc774\uc804';
      prevLink.setAttribute('aria-disabled', 'true');
    }
    inner.appendChild(prevLink);

    // Spacer
    var spacer1 = document.createElement('span');
    spacer1.className = 'nav-spacer';
    inner.appendChild(spacer1);

    // Chapter link
    var chLink = document.createElement('a');
    chLink.className = 'nav-chapter';
    chLink.href = prefix + current.chapterHref;
    chLink.textContent = '\uc7a5 \ubaa9\ucc28';
    chLink.title = current.chapterTitle;
    inner.appendChild(chLink);

    // Current indicator
    var curSpan = document.createElement('span');
    curSpan.className = 'nav-current';
    curSpan.textContent = current.number + ' ' + current.title;
    inner.appendChild(curSpan);

    // Home link
    var homeLink = document.createElement('a');
    homeLink.className = 'nav-home';
    homeLink.href = prefix + 'index.html';
    homeLink.textContent = '\ub300\uba54\ub274';
    inner.appendChild(homeLink);

    // Spacer
    var spacer2 = document.createElement('span');
    spacer2.className = 'nav-spacer';
    inner.appendChild(spacer2);

    // Next link
    var nextLink = document.createElement('a');
    nextLink.className = 'nav-next';
    if (next) {
      nextLink.href = prefix + next.href;
      nextLink.textContent = '\ub2e4\uc74c \u2192';
      nextLink.title = next.number + ' ' + next.title;
    } else {
      nextLink.className += ' disabled';
      nextLink.textContent = '\ub2e4\uc74c \u2192';
      nextLink.setAttribute('aria-disabled', 'true');
    }
    inner.appendChild(nextLink);

    nav.appendChild(inner);

    // Add bottom padding to body so nav doesn't cover content
    document.body.style.paddingBottom = '56px';

    document.body.appendChild(nav);
  }

  /* ── Load manifest and inject ── */
  function init() {
    var manifestPath = resolveManifestPath();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', manifestPath, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      // xhr.status === 0 covers file:// protocol (local filesystem access)
      if (xhr.status === 200 || xhr.status === 0) {
        try {
          var manifest = JSON.parse(xhr.responseText);
          injectNav(manifest);
        } catch (e) {
          console.warn('finalize-nav.js: Failed to parse nav-manifest.json', e);
        }
      } else {
        console.warn('finalize-nav.js: Could not load nav-manifest.json (status ' + xhr.status + ')');
      }
    };
    xhr.send();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
