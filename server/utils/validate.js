// utils/validate.js
// Server-side checks for a new report. The browser checks too, but anyone
// can send requests without the browser, so the server must never trust it.

const { CATEGORIES, SEVERITIES } = require('./issueRules');
const { findBlockedWord } = require('./text');

const MIN_TITLE = 6;
const MIN_DESCRIPTION = 20;

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// Returns { errors, value }. `errors` is empty when everything is fine.
function validateIssue(body) {
  const errors = {};
  const loc = body.location || {};
  const reporter = body.reporter || {};

  const value = {
    title: clean(body.title, 120),
    description: clean(body.description, 2000),
    category: clean(body.category, 20),
    severity: clean(body.severity, 10) || 'Medium',
    location: {
      state: clean(loc.state, 60),
      district: clean(loc.district, 60),
      city: clean(loc.city, 60),
      landmark: clean(loc.landmark, 120),
      lat: loc.lat === '' || loc.lat == null ? undefined : Number(loc.lat),
      lng: loc.lng === '' || loc.lng == null ? undefined : Number(loc.lng),
      approximate: loc.approximate === true
    },
    reporter: {
      anonymous: reporter.anonymous !== false,
      name: clean(reporter.name, 60),
      phone: clean(reporter.phone, 15)
    }
  };

  if (value.title.length < MIN_TITLE) errors.title = `Title must be at least ${MIN_TITLE} characters.`;
  if (value.description.length < MIN_DESCRIPTION) errors.description = `Description must be at least ${MIN_DESCRIPTION} characters.`;
  if (!CATEGORIES.includes(value.category)) errors.category = 'Choose a valid category.';
  if (!SEVERITIES.includes(value.severity)) errors.severity = 'Choose Low, Medium, High or Critical.';
  if (!value.location.state || !value.location.district || !value.location.city) errors.location = 'Choose the state, district and city or area.';

  const { lat, lng } = value.location;
  if ((lat !== undefined || lng !== undefined) &&
      !(Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
    errors.location = 'The map position is not valid.';
  }
  if (value.reporter.phone && !/^[6-9]\d{9}$/.test(value.reporter.phone)) errors.phone = 'Enter a 10-digit Indian mobile number.';

  const blocked = findBlockedWord(value.title, value.description, value.location.landmark);
  if (blocked) errors.content = 'Please remove offensive or spam words and try again.';

  return { errors, value };
}

module.exports = { validateIssue, MIN_TITLE, MIN_DESCRIPTION };
