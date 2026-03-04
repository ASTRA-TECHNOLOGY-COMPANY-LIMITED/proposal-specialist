/*
 * presentation.js — 슬라이드 네비게이션 & 애니메이션 엔진
 *
 * 기능:
 *   - 키보드 네비게이션 (← → Space Home End)
 *   - 클릭 네비게이션 (좌/우 반 클릭)
 *   - 터치 스와이프 지원
 *   - 슬라이드 전환 (CSS transition)
 *   - 요소 애니메이션 순차 트리거 (staggered reveal)
 *   - 풀스크린 모드 (F키)
 *   - 슬라이드 오버뷰 그리드 (Esc키)
 *   - 프로그레스바 업데이트
 *   - 슬라이드 번호 표시
 *   - 뷰포트 맞춤 자동 스케일
 */
(function () {
  'use strict';

  var currentSlide = 0;
  var slides = [];
  var totalSlides = 0;
  var isOverview = false;

  // Touch state
  var touchStartX = 0;
  var touchStartY = 0;
  var touchThreshold = 50;

  // DOM refs
  var progressBar = null;
  var slideNumber = null;

  /* ===== Initialisation ===== */
  function init() {
    slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    totalSlides = slides.length;
    if (!totalSlides) return;

    // Assign data-slide-num for overview
    slides.forEach(function (s, i) {
      s.setAttribute('data-slide-num', i + 1);
    });

    // Create progress bar
    progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    document.body.appendChild(progressBar);

    // Create slide number indicator
    slideNumber = document.createElement('div');
    slideNumber.className = 'slide-number';
    document.body.appendChild(slideNumber);

    // Read hash
    var hash = parseInt(location.hash.replace('#', ''), 10);
    if (hash && hash >= 1 && hash <= totalSlides) {
      currentSlide = hash - 1;
    }

    goToSlide(currentSlide);
    scaleSlides();

    // Bind events
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', scaleSlides);
  }

  /* ===== Scale slides to fit viewport ===== */
  function scaleSlides() {
    if (isOverview) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var sw = 1280;
    var sh = 720;
    var scale = Math.min(vw / sw, vh / sh);
    slides.forEach(function (s) {
      var inner = s.querySelector('.slide-inner');
      if (inner) {
        inner.style.transform = 'scale(' + scale.toFixed(4) + ')';
      }
    });
  }

  /* ===== Navigation ===== */
  function goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;
    currentSlide = index;

    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === currentSlide);
    });

    // Update progress bar
    var pct = totalSlides > 1 ? (currentSlide / (totalSlides - 1)) * 100 : 100;
    if (progressBar) progressBar.style.width = pct + '%';

    // Update slide number
    if (slideNumber) {
      slideNumber.textContent = (currentSlide + 1) + ' / ' + totalSlides;
    }

    // Update URL hash
    history.replaceState(null, '', '#' + (currentSlide + 1));

    // Trigger animations on active slide
    triggerAnimations(slides[currentSlide]);
  }

  function nextSlide() {
    if (currentSlide < totalSlides - 1) goToSlide(currentSlide + 1);
  }

  function prevSlide() {
    if (currentSlide > 0) goToSlide(currentSlide - 1);
  }

  /* ===== Animation Trigger ===== */
  function triggerAnimations(slide) {
    var elements = slide.querySelectorAll('[class*="anim-"]');
    // Reset first
    elements.forEach(function (el) {
      el.classList.remove('animated');
    });
    // Use rAF to ensure CSS resets, then add animated class
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        elements.forEach(function (el) {
          el.classList.add('animated');
        });
      });
    });
  }

  /* ===== Keyboard ===== */
  function onKeyDown(e) {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        if (isOverview) {
          exitOverview();
        } else {
          nextSlide();
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (isOverview) {
          exitOverview();
        } else {
          prevSlide();
        }
        break;
      case 'Home':
        e.preventDefault();
        goToSlide(0);
        break;
      case 'End':
        e.preventDefault();
        goToSlide(totalSlides - 1);
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'Escape':
        e.preventDefault();
        if (isOverview) {
          exitOverview();
        } else {
          enterOverview();
        }
        break;
    }
  }

  /* ===== Click Navigation ===== */
  function onClick(e) {
    // In overview mode, clicking a slide goes to it
    if (isOverview) {
      var clickedSlide = e.target.closest('.slide');
      if (clickedSlide) {
        var idx = slides.indexOf(clickedSlide);
        if (idx >= 0) {
          currentSlide = idx;
          exitOverview();
        }
      }
      return;
    }

    // Ignore clicks on links/buttons
    if (e.target.closest('a, button')) return;

    var vw = window.innerWidth;
    if (e.clientX > vw / 2) {
      nextSlide();
    } else {
      prevSlide();
    }
  }

  /* ===== Touch Swipe ===== */
  function onTouchStart(e) {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }

  function onTouchEnd(e) {
    if (isOverview) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;

    // Only trigger if horizontal swipe is dominant
    if (Math.abs(dx) > touchThreshold && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  }

  /* ===== Fullscreen ===== */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  }

  /* ===== Overview Mode ===== */
  function enterOverview() {
    isOverview = true;
    document.body.classList.add('overview-mode');
    // Reset transforms for overview grid
    slides.forEach(function (s) {
      var inner = s.querySelector('.slide-inner');
      if (inner) inner.style.transform = '';
    });
    // Scroll active slide into view
    var activeSlide = slides[currentSlide];
    if (activeSlide) {
      activeSlide.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function exitOverview() {
    isOverview = false;
    document.body.classList.remove('overview-mode');
    scaleSlides();
    goToSlide(currentSlide);
  }

  /* ===== Boot ===== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
