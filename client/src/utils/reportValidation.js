// utils/reportValidation.js
// Plain JavaScript checks for each step of the report form. Each function
// returns an object of error messages; an empty object means "valid".
// The server repeats these checks (server/utils/validate.js).

export const MIN_TITLE = 6;
export const MIN_DESCRIPTION = 20;

export function validateCategory(form) {
  return form.category ? {} : { category: 'Choose the type of issue to continue.' };
}

export function validateDetails(form) {
  const errors = {};
  if (form.title.trim().length < MIN_TITLE) errors.title = `Give it a short title (at least ${MIN_TITLE} characters).`;
  const length = form.description.trim().length;
  if (length < MIN_DESCRIPTION) errors.description = `Describe it in at least ${MIN_DESCRIPTION} characters (${MIN_DESCRIPTION - length} more).`;
  if (!form.anonymous && form.phone && !/^[6-9]\d{9}$/.test(form.phone)) errors.phone = 'Enter a 10-digit Indian mobile number, or leave it empty.';
  return errors;
}

export function validateLocation(form) {
  const { state, district, city } = form.location;
  return state && district && city ? {} : { location: 'Choose the state, district and city or area.' };
}
