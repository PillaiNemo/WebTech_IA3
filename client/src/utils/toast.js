// utils/toast.js
// One-line access to the jQuery toast plugin from React components.

import $ from '../lib/jquery.js';

export function toast(type, title, message) {
  $.cfToast({ type, title, message, duration: type === 'error' ? 6000 : 4500 });
}
