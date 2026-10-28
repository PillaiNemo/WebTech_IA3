// middleware/adminAuth.js
// Admin login without extra libraries:
// 1. POST /api/admin/login compares the passcode with ADMIN_PASSCODE from .env.
// 2. If it matches, Node's crypto module makes a random session token.
// 3. The browser sends it back as "Authorization: Bearer <token>".
// 4. requireAdmin checks that the token exists and has not expired.

const crypto = require('crypto');

const SESSION_HOURS = 8;
const sessions = new Map(); // token -> expiry time (ms)

// Compares two strings in constant time, so the response time never hints
// at how many characters were right.
function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function login(passcode) {
  const expected = process.env.ADMIN_PASSCODE;
  if (!expected || !safeEqual(passcode || '', expected)) return null;
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  return { token, expiresInHours: SESSION_HOURS };
}

function requireAdmin(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expires = sessions.get(token);

  if (!expires || expires < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: true, status: 401, message: 'Please log in as admin first.' });
  }
  next();
}

module.exports = { login, requireAdmin };
