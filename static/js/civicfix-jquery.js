/* ==========================================================================
   CivicFix jQuery helpers   (static/js/civicfix-jquery.js)
   Needs jQuery 3.x loaded first. Adds:
     $.cfToast({ type, title, message, duration })   toast notifications
     $(el).cfCountUp()                                animated number counters
     $(el).cfAccordion()                              FAQ accordion
   ========================================================================== */
(function ($) {
  'use strict';

  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }


  // ---------- Toasts ----------------------------------------------------------

  var ICONS = { success: '✓', error: '!', warning: '!', info: 'i' };
  var MAX_TOASTS = 4;

  // Finds the toast stack or creates it once (manipulator: appendTo).
  function getStack() {
    var $stack = $('.cf-toast-stack');
    if (!$stack.length) {
      $stack = $('<div class="cf-toast-stack" role="region" aria-label="Notifications"></div>').appendTo('body');
    }
    return $stack;
  }

  function closeToast($toast) {
    if ($toast.data('closing')) return;
    $toast.data('closing', true);
    clearTimeout($toast.data('timer'));
    // Effects: fade out, then collapse the gap, then remove from the DOM.
    $toast.fadeTo(160, 0).slideUp(200, function () { $toast.remove(); });
  }

  $.cfToast = function (options) {
    var opts = $.extend({ type: 'info', title: '', message: '', duration: 4000 }, options);
    var $stack = getStack();

    // Too many on screen? Close the oldest first (traversal: children, first).
    var $open = $stack.children('.cf-toast');
    if ($open.length >= MAX_TOASTS) closeToast($open.first());

    // Build the toast with .text() so user content can never inject HTML.
    var $toast = $('<div>', {
      'class': 'cf-toast cf-toast--' + opts.type,
      role: opts.type === 'error' ? 'alert' : 'status'
    }).css('--duration', opts.duration + 'ms');

    $('<span class="cf-toast__icon" aria-hidden="true"></span>').text(ICONS[opts.type] || 'i').appendTo($toast);
    var $body = $('<div></div>').appendTo($toast);
    $('<p class="cf-toast__title"></p>').text(opts.title).appendTo($body);
    if (opts.message) $('<p class="cf-toast__msg"></p>').text(opts.message).appendTo($body);
    $('<button type="button" class="cf-toast__close" aria-label="Dismiss notification">×</button>').appendTo($toast);
    $('<span class="cf-toast__timer" aria-hidden="true"></span>').appendTo($toast);

    $toast.hide().appendTo($stack).fadeIn(reducedMotion() ? 0 : 250);

    // Auto-close; hovering pauses the countdown (the CSS bar pauses too).
    var remaining = opts.duration;
    var startedAt = Date.now();
    $toast.data('timer', setTimeout(function () { closeToast($toast); }, remaining));

    $toast.on('mouseenter', function () {
      clearTimeout($toast.data('timer'));
      remaining -= Date.now() - startedAt;
    });
    $toast.on('mouseleave', function () {
      startedAt = Date.now();
      $toast.data('timer', setTimeout(function () { closeToast($toast); }, Math.max(remaining, 600)));
    });
    $toast.find('.cf-toast__close').on('click', function () { closeToast($toast); });

    return $toast;
  };


  // ---------- Counters --------------------------------------------------------

  // Formats 1284 as "1,284" using Indian digit grouping (12,34,567),
  // optionally zero-padded first: pad 5 gives "01,284".
  function formatIndian(value, pad, decimals) {
    var fixed = Number(value).toFixed(decimals);
    var parts = fixed.split('.');
    var digits = parts[0].padStart(pad, '0');
    var last3 = digits.slice(-3);
    var rest = digits.slice(0, -3);
    var grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
    return parts[1] ? grouped + '.' + parts[1] : grouped;
  }

  // <span data-count="1284" data-pad="5" data-suffix="+" data-decimals="1">
  // Animates from 0 to data-count using jQuery's .animate() on a plain object.
  // Reads the counter settings with .attr() (not .data(), which caches the
  // first value) so a React re-render with new numbers is picked up.
  function readCounter($el) {
    return {
      target: parseFloat($el.attr('data-count')) || 0,
      pad: parseInt($el.attr('data-pad'), 10) || 0,
      decimals: parseInt($el.attr('data-decimals'), 10) || 0,
      prefix: $el.attr('data-prefix') || '',
      suffix: $el.attr('data-suffix') || ''
    };
  }

  function stopCounter($el) {
    var previous = $el.data('cfCounter');
    if (previous) $(previous).stop();
  }

  $.fn.cfCountUp = function (options) {
    var opts = $.extend({ duration: 1800 }, options);

    return this.each(function () {
      var $el = $(this);
      var c = readCounter($el);
      var target = c.target;
      var pad = c.pad;
      var decimals = c.decimals;
      var prefix = c.prefix;
      var suffix = c.suffix;

      function render(n) {
        $el.text(prefix + formatIndian(n, pad, decimals) + suffix);
      }

      // Stop a previous run so replaying never stacks animations.
      stopCounter($el);

      if (reducedMotion()) {
        render(target);
        return;
      }

      var counter = { n: 0 };
      $el.data('cfCounter', counter);
      $(counter).animate({ n: target }, {
        duration: opts.duration,
        easing: 'swing',
        step: function (now) { render(now); },
        complete: function () { render(target); }
      });
    });
  };

  // Stops any running count and shows zero again (used before a replay).
  $.fn.cfCountReset = function () {
    return this.each(function () {
      var $el = $(this);
      var c = readCounter($el);
      stopCounter($el);
      $el.text(c.prefix + formatIndian(0, c.pad, c.decimals) + c.suffix);
    });
  };

  // The number formatter, shared so React can show the same final text.
  $.cfFormatNumber = formatIndian;

  // Start counters automatically when their container scrolls into view.
  // civicfix-ui.js fires "cf:inview" on [data-inview] elements.
  $(document).on('cf:inview', function (e) {
    $(e.target).find('[data-count]').addBack('[data-count]').cfCountUp();
  });


  // ---------- Accordion (FAQ) -------------------------------------------------

  // Markup per item:
  //   <div class="cf-acc__item">
  //     <h3><button class="cf-acc__btn" aria-expanded="false" aria-controls="p1">Question</button></h3>
  //     <div class="cf-acc__panel" id="p1" hidden>Answer</div>
  //   </div>
  $.fn.cfAccordion = function () {
    return this.each(function () {
      var $acc = $(this);
      var speed = reducedMotion() ? 0 : 280;

      // Panels start hidden with the attribute; jQuery takes over from here.
      $acc.find('.cf-acc__panel').removeAttr('hidden').hide();
      $acc.find('.cf-acc__item.is-open .cf-acc__panel').show();

      $acc.on('click', '.cf-acc__btn', function () {
        var $item = $(this).closest('.cf-acc__item');      // traversal: closest
        var opening = !$item.hasClass('is-open');

        // Close any other open item (traversal: siblings, find).
        $item.siblings('.is-open').removeClass('is-open')
          .find('.cf-acc__btn').attr('aria-expanded', 'false').end()
          .find('.cf-acc__panel').slideUp(speed);

        $item.toggleClass('is-open', opening);
        $(this).attr('aria-expanded', String(opening));
        $item.find('.cf-acc__panel').stop(true, true).slideToggle(speed);
      });
    });
  };
})(jQuery);
