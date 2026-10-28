// middleware/rateLimiter.js
// A hand-written rate limiter: remembers, per IP address, when each request
// happened (in a plain object in memory) and refuses requests over the limit.
//
//   rateLimit({ name: 'reports', max: 5, windowMs: 60 * 60 * 1000 })
//   -> at most 5 requests per hour per IP for routes that use it.

const buckets = {}; // { "reports:127.0.0.1": [timestamp, timestamp, ...] }

function rateLimit({ name, max, windowMs, message }) {
  return function rateLimiter(req, res, next) {
    const key = `${name}:${req.ip}`;
    const now = Date.now();

    // Keep only the requests that are still inside the time window.
    const recent = (buckets[key] || []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      const retryMinutes = Math.ceil((windowMs - (now - recent[0])) / 60000);
      res.set('Retry-After', String(retryMinutes * 60));
      return res.status(429).json({
        error: true,
        status: 429,
        message: message || `You're doing that a lot. Please try again in about ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`
      });
    }

    recent.push(now);
    buckets[key] = recent;
    next();
  };
}

// Every 10 minutes, forget IPs that have gone quiet so memory stays small.
setInterval(() => {
  const now = Date.now();
  Object.keys(buckets).forEach((key) => {
    buckets[key] = buckets[key].filter((time) => now - time < 60 * 60 * 1000);
    if (!buckets[key].length) delete buckets[key];
  });
}, 10 * 60 * 1000).unref();

const HOUR = 60 * 60 * 1000;
const reportLimiter = rateLimit({ name: 'reports', max: 5, windowMs: HOUR, message: 'You can send 5 reports an hour. Please try again a little later.' });
const actionLimiter = rateLimit({ name: 'actions', max: 30, windowMs: HOUR, message: 'You can upvote, support or comment 30 times an hour. Please try again a little later.' });

module.exports = { rateLimit, reportLimiter, actionLimiter };
