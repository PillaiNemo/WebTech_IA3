/* ==========================================================================
   site.js: shared behaviour for the static pages (needs jQuery).
   - starts the design-system helpers (theme toggle, reveals, ripple, clock)
   - highlights the current link in the sticky table of contents
   ========================================================================== */
$(function () {
  CivicUI.initAll();

  // Table of contents: mark the section that is currently on screen.
  var $links = $('.sp-toc a');
  if (!$links.length || !('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      $links.removeClass('is-current')                      // manipulator: remove a class from all
        .filter('[href="#' + entry.target.id + '"]')        // traversal: keep the matching link
        .addClass('is-current');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  $links.each(function () {
    var target = document.querySelector($(this).attr('href'));
    if (target) observer.observe(target);
  });
});
