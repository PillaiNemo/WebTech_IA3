// lib/jquery.js
// Import jQuery from here in components: it guarantees the global is set and
// our plugins ($.cfToast, .cfCountUp, .cfAccordion) are attached.

import './jquery-global.js';
import '../../../static/js/civicfix-jquery.js';

const $ = window.jQuery;

export default $;
