// middleware/errorHandler.js
// Central error handling: every route calls next(err) and ends up here,
// so all errors reach the client in the same friendly JSON shape:
//   { error: true, status, message, errors? }

// Runs when no route matched the request.
function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

// Express recognises an error handler because it has 4 parameters.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message;

  // Translate common library errors into plain language.
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(' ');
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'That ID is not valid.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'That upload is too large. Photos must be 3 MB or smaller.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  }

  if (status >= 500) console.error(err);

  // Hide internal details of server errors in production.
  const hideDetails = status >= 500 && process.env.NODE_ENV === 'production';

  res.status(status).json({
    error: true,
    status,
    message: hideDetails ? 'Something went wrong on our side. Please try again.' : message,
    ...(err.extra || {})
  });
}

module.exports = { notFound, errorHandler };
