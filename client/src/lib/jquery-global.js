// lib/jquery-global.js
// Our jQuery plugins (static/js/civicfix-jquery.js) expect a global "jQuery",
// like on the static pages. This tiny module provides it and must be
// imported before the plugins (lib/jquery.js does that).

import $ from 'jquery';

window.jQuery = $;
window.$ = $;
