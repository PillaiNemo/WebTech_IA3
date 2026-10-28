/* ==========================================================================
   contact.js: the Contact form.
   Module 2: validation rules are plain JavaScript functions.
   Module 3: jQuery reads the fields (.val, .prop), finds each field's
   message (traversal: .closest/.find), updates the page (manipulators:
   .text, .append, .prepend, .remove) and animates (.slideDown, .fadeIn).
   ========================================================================== */
$(function () {
  var $form = $('#contact-form');
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE = /^[6-9]\d{9}$/;

  // One rule per field: returns an error message, or '' when valid.
  var RULES = {
    name: function (v) { return v.length >= 2 ? '' : 'Please enter your name.'; },
    email: function (v) { return EMAIL.test(v) ? '' : 'Enter a valid email address, like name@example.com.'; },
    phone: function (v) { return !v || PHONE.test(v) ? '' : 'Enter a 10-digit Indian mobile number, or leave it empty.'; },
    subject: function (v) { return v ? '' : 'Choose what your message is about.'; },
    message: function (v) { return v.length >= 20 ? '' : 'Write at least 20 characters (' + (20 - v.length) + ' more).'; },
    consent: function (checked) { return checked ? '' : 'Please tick this box so we can reply.'; }
  };

  // Reads a field's value with jQuery (.prop for the checkbox).
  function valueOf(name) {
    var $field = $form.find('[name="' + name + '"]');
    return $field.is(':checkbox') ? $field.prop('checked') : $.trim($field.val());
  }

  // Shows or clears one field's message; returns true when valid.
  function check(name) {
    var $field = $form.find('[name="' + name + '"]');
    var message = RULES[name](valueOf(name));
    $field.toggleClass('is-invalid', !!message)
      .toggleClass('is-valid', !message && name !== 'consent')
      .attr('aria-invalid', String(!!message));
    $field.closest('div').find('.invalid-feedback').text(message);
    return !message;
  }

  // Validate a field after the person leaves it, then live while they fix it.
  $.each(RULES, function (name) {
    var $field = $form.find('[name="' + name + '"]');
    $field.on('blur change', function () { $field.data('touched', true); check(name); });
    $field.on('input', function () { if ($field.data('touched')) check(name); });
  });

  // Only digits in the phone box; live character count for the message.
  $('#c-phone').on('input', function () { $(this).val($(this).val().replace(/\D/g, '')); });
  $('#c-message').on('input', function () { $('#c-count').text($.trim($(this).val()).length); });

  $form.on('submit', function (e) {
    e.preventDefault();
    if ($('#c-website').val()) return; // honeypot filled: a bot

    var firstBad = null;
    $.each(RULES, function (name) {
      if (!check(name)) {
        var field = $form.find('[name="' + name + '"]')[0];
        CivicUI.shake(field);
        if (!firstBad) firstBad = field;
      }
    });
    if (firstBad) { firstBad.focus(); return; }

    // "Send": add a summary to the list (manipulators) and show a success note.
    var name = valueOf('name');
    var subject = valueOf('subject');
    $('#sent-empty').remove();
    $('<li></li>')
      .text(subject + ' · from ' + name + ' · ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      .hide()
      .prependTo('#sent-list')
      .fadeIn(400);
    $('#contact-success').text('Thank you, ' + name + '. Your message has been sent; we usually reply within two working days.').slideDown(300);
    $.cfToast({ type: 'success', title: 'Message sent', message: 'We will reply to ' + valueOf('email') + '.' });
    $form[0].reset();
  });

  $form.on('reset', function () {
    setTimeout(function () {
      $form.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid').removeAttr('aria-invalid');
      $form.find('[name]').removeData('touched');
      $('#c-count').text('0');
    }, 0);
  });
});
