/* ==========================================================================
   CivicFix UI helpers   (static/js/civicfix-ui.js)
   Plain JavaScript, no libraries. Everything is exposed on window.CivicUI.

   Every init function returns a "cleanup" function that removes its event
   listeners. Static pages can ignore it; the React app calls it from a
   useEffect cleanup so nothing leaks when a component unmounts.
   ========================================================================== */
(function (global) {
  'use strict';

  var doc = global.document;

  // ---------- Small utilities ------------------------------------------------

  function prefersReducedMotion() {
    return global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function noop() {}

  // Runs fn at most once per animation frame (keeps scroll handlers cheap).
  function rafThrottle(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      global.requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    };
  }

  // A hidden live region so screen readers hear short status messages.
  function announce(message) {
    var region = doc.getElementById('cf-live');
    if (!region) {
      region = doc.createElement('div');
      region.id = 'cf-live';
      region.className = 'visually-hidden';
      region.setAttribute('aria-live', 'polite');
      doc.body.appendChild(region);
    }
    region.textContent = '';
    global.setTimeout(function () { region.textContent = message; }, 50);
  }

  // Plays the shake animation on a field (used by form validation).
  function shake(el) {
    el.classList.remove('cf-shake');
    void el.offsetWidth; // forces a reflow so the animation can restart
    el.classList.add('cf-shake');
    el.addEventListener('animationend', function done() {
      el.classList.remove('cf-shake');
      el.removeEventListener('animationend', done);
    });
  }


  // ---------- 1. Theme (dark / light) ---------------------------------------

  var THEME_KEY = 'cf-theme';
  var themeTimer = null;

  function getTheme() {
    return doc.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    var root = doc.documentElement;

    // Briefly enable colour transitions everywhere so the switch is smooth.
    if (!prefersReducedMotion()) {
      root.classList.add('cf-theme-anim');
      global.clearTimeout(themeTimer);
      themeTimer = global.setTimeout(function () { root.classList.remove('cf-theme-anim'); }, 600);
    }

    root.setAttribute('data-theme', theme);
    try { global.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* storage blocked: theme still applies */ }

    updateThemeButtons();
    doc.dispatchEvent(new CustomEvent('cf:themechange', { detail: { theme: theme } }));
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  function updateThemeButtons() {
    var dark = getTheme() === 'dark';
    doc.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  function initThemeToggles(root) {
    var buttons = (root || doc).querySelectorAll('[data-theme-toggle]');
    buttons.forEach(function (btn) { btn.addEventListener('click', toggleTheme); });
    updateThemeButtons();
    return function () {
      buttons.forEach(function (btn) { btn.removeEventListener('click', toggleTheme); });
    };
  }


  // ---------- 1b. Text size (A− / A / A+) -------------------------------------

  // Stored as "sm", "md" or "lg" and applied as data-text on <html>;
  // the CSS changes the root font size, and every rem size follows.
  var TEXT_KEY = 'cf-text';

  function getTextSize() {
    return doc.documentElement.getAttribute('data-text') || 'md';
  }

  function setTextSize(size) {
    var value = size === 'sm' || size === 'lg' ? size : 'md';
    doc.documentElement.setAttribute('data-text', value);
    try { global.localStorage.setItem(TEXT_KEY, value); } catch (e) { /* storage blocked: size still applies */ }
    doc.querySelectorAll('[data-text-size]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-text-size') === value));
    });
  }

  // Static pages: buttons with data-text-size="sm|md|lg".
  function initTextSize(root) {
    var buttons = (root || doc).querySelectorAll('[data-text-size]');
    function onClick(e) { setTextSize(e.currentTarget.getAttribute('data-text-size')); }
    buttons.forEach(function (btn) { btn.addEventListener('click', onClick); });
    setTextSize(getTextSize());
    return function () {
      buttons.forEach(function (btn) { btn.removeEventListener('click', onClick); });
    };
  }


  // ---------- 2. Scroll reveal (IntersectionObserver) -----------------------

  // Gives each direct child of [data-stagger] an index (--i) used as a delay.
  function applyStagger(root) {
    (root || doc).querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--i', i);
      });
    });
  }

  // Adds .is-in to [data-reveal] and [data-inview] elements when they scroll
  // into view, and fires a "cf:inview" event (jQuery counters listen to it).
  function initReveal(root) {
    root = root || doc;
    applyStagger(root);
    var targets = root.querySelectorAll('[data-reveal], [data-inview]');

    function show(el) {
      el.classList.add('is-in');
      el.dispatchEvent(new CustomEvent('cf:inview', { bubbles: true }));
    }

    if (!('IntersectionObserver' in global) || prefersReducedMotion()) {
      targets.forEach(show);
      return noop;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          observer.unobserve(entry.target); // reveal once
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el) { observer.observe(el); });
    return function () { observer.disconnect(); };
  }

  // Jumps back to the "before" state with transitions off, then plays the
  // reveal again on the next frame, so a demo can be watched again.
  function replay(el) {
    el.classList.add('cf-reset');
    el.classList.remove('is-in');
    void el.offsetWidth; // apply the reset state now
    el.classList.remove('cf-reset');
    global.requestAnimationFrame(function () {
      el.classList.add('is-in');
      el.dispatchEvent(new CustomEvent('cf:inview', { bubbles: true }));
    });
  }


  // ---------- 3. Typewriter -------------------------------------------------

  // Types `text` into `el` one character at a time.
  // Accessibility: put the full text in a visually hidden span and mark the
  // typed layer aria-hidden, so screen readers never hear single letters.
  function typewriter(el, text, options) {
    options = options || {};
    var speed = options.speed || 60;
    var host = el.closest('.cf-type') || el.parentElement;
    var timer = null;
    var i = 0;

    if (prefersReducedMotion()) {
      el.textContent = text;
      if (options.onDone) options.onDone();
      return noop;
    }

    el.textContent = '';
    host.classList.add('is-typing');

    function tick() {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        // A little randomness makes the typing feel human.
        timer = global.setTimeout(tick, speed + Math.random() * 30 - 15);
      } else {
        host.classList.remove('is-typing');
        if (options.onDone) options.onDone();
      }
    }

    timer = global.setTimeout(tick, options.startDelay || 0);
    return function () { global.clearTimeout(timer); };
  }

  // Types a phrase, pauses, deletes it, then types the next one, forever.
  // `target` is an element, or a function that receives the current text
  // (used to animate an input's placeholder).
  function rotateWords(target, words, options) {
    options = options || {};
    var typeSpeed = options.typeSpeed || 60;
    var deleteSpeed = options.deleteSpeed || 32;
    var pause = options.pause || 1500;
    var write = typeof target === 'function' ? target : function (t) { target.textContent = t; };
    var wordIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var timer = null;

    if (prefersReducedMotion()) {
      write(words[0]);
      return noop;
    }

    function tick() {
      var word = words[wordIndex];
      if (!deleting) {
        charIndex += 1;
        write(word.slice(0, charIndex));
        if (charIndex === word.length) {
          deleting = true;
          timer = global.setTimeout(tick, pause);
          return;
        }
        timer = global.setTimeout(tick, typeSpeed);
      } else {
        charIndex -= 1;
        write(word.slice(0, charIndex));
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % words.length;
          timer = global.setTimeout(tick, 350);
          return;
        }
        timer = global.setTimeout(tick, deleteSpeed);
      }
    }

    write('');
    timer = global.setTimeout(tick, options.startDelay || 0);
    return function () { global.clearTimeout(timer); };
  }


  // ---------- 4. Buttons: ripple and copy -----------------------------------

  // A soft ripple on every .btn and [data-ripple] (one delegated listener).
  function initRipple() {
    function onDown(e) {
      var btn = e.target.closest('.btn, [data-ripple]');
      if (!btn || btn.disabled || prefersReducedMotion()) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 2;
      var dot = doc.createElement('span');
      dot.className = 'cf-ripple';
      dot.style.width = dot.style.height = size + 'px';
      dot.style.left = (e.clientX - rect.left - size / 2) + 'px';
      dot.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(dot);
      dot.addEventListener('animationend', function () { dot.remove(); });
    }
    doc.addEventListener('pointerdown', onDown);
    return function () { doc.removeEventListener('pointerdown', onDown); };
  }

  // Copies text to the clipboard (with an old-browser fallback).
  function copyText(text) {
    if (global.navigator.clipboard && global.isSecureContext) {
      return global.navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      doc.body.appendChild(area);
      area.select();
      var ok = doc.execCommand('copy');
      area.remove();
      if (ok) resolve(); else reject(new Error('Copy failed'));
    });
  }

  // [data-copy="CF-2026-00123"]: copies the value and shows "Copied" briefly.
  function initCopy(root) {
    var buttons = (root || doc).querySelectorAll('[data-copy]');
    function onClick(e) {
      var btn = e.currentTarget;
      var value = btn.getAttribute('data-copy');
      copyText(value).then(function () {
        btn.classList.add('is-copied');
        announce('Copied ' + value);
        global.setTimeout(function () { btn.classList.remove('is-copied'); }, 1800);
      }).catch(function () {
        announce('Could not copy. Please select the text and copy it manually.');
      });
    }
    buttons.forEach(function (b) { b.addEventListener('click', onClick); });
    return function () {
      buttons.forEach(function (b) { b.removeEventListener('click', onClick); });
    };
  }


  // ---------- 5. Scroll progress bar ----------------------------------------

  // bar: the .cf-progress element. It grows as the page is scrolled.
  function initScrollProgress(bar) {
    var update = rafThrottle(function () {
      var el = doc.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      var p = max > 0 ? el.scrollTop / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)).toFixed(4) + ')';
    });
    global.addEventListener('scroll', update, { passive: true });
    global.addEventListener('resize', update);
    update();
    return function () {
      global.removeEventListener('scroll', update);
      global.removeEventListener('resize', update);
    };
  }


  // ---------- 6. IST clock --------------------------------------------------

  // [data-clock]: shows the current time in India, updated every second.
  function initClock(root) {
    var els = (root || doc).querySelectorAll('[data-clock]');
    if (!els.length) return noop;
    var format = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
    });
    function tick() {
      var text = 'IST ' + format.format(new Date());
      els.forEach(function (el) { el.textContent = text; });
    }
    tick();
    var timer = global.setInterval(tick, 15000);
    return function () { global.clearInterval(timer); };
  }


  // ---------- 7. Side navigation drawer (static pages) ----------------------

  // On small screens the side navigation is a Bootstrap offcanvas; close it
  // after a link is chosen (matters for links to sections of the same page).
  function initSideDrawer() {
    var drawer = doc.getElementById('side-nav');
    if (!drawer || !global.bootstrap) return noop;
    function onClick(e) {
      if (!e.target.closest('a')) return;
      var instance = global.bootstrap.Offcanvas.getInstance(drawer);
      if (instance) instance.hide();
    }
    drawer.addEventListener('click', onClick);
    return function () { drawer.removeEventListener('click', onClick); };
  }


  // ---------- 8. Start everything on a static page --------------------------

  function initAll() {
    var cleanups = [initThemeToggles(), initTextSize(), initSideDrawer(), initReveal(), initRipple(), initCopy(), initClock()];
    var bar = doc.querySelector('.cf-progress');
    if (bar) cleanups.push(initScrollProgress(bar));
    return function () { cleanups.forEach(function (fn) { fn(); }); };
  }

  global.CivicUI = {
    prefersReducedMotion: prefersReducedMotion,
    announce: announce,
    shake: shake,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    initThemeToggles: initThemeToggles,
    getTextSize: getTextSize,
    setTextSize: setTextSize,
    initTextSize: initTextSize,
    applyStagger: applyStagger,
    initReveal: initReveal,
    replay: replay,
    typewriter: typewriter,
    rotateWords: rotateWords,
    initRipple: initRipple,
    copyText: copyText,
    initCopy: initCopy,
    initScrollProgress: initScrollProgress,
    initClock: initClock,
    initAll: initAll
  };
})(window);
