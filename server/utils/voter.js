// utils/voter.js
// One vote per person, without accounts.
// The browser makes a random token once (crypto.randomUUID) and keeps it.
// The server never stores the token itself: it stores a SHA-256 hash of
// token + IP address. The same person gets the same hash every time, so a
// second vote is refused, but the hash cannot be turned back into either.

const crypto = require('crypto');

function voterHash(req) {
  const token = String(req.body.voterToken || req.get('X-Voter-Token') || '').slice(0, 100);
  if (token.length < 8) {
    const err = new Error('Missing voter token. Refresh the page and try again.');
    err.status = 400;
    throw err;
  }
  return crypto.createHash('sha256').update(`${token}|${req.ip}`).digest('hex');
}

module.exports = { voterHash };
