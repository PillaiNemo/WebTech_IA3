// utils/text.js
// Word overlap for the duplicate check, and the blocked-word (spam) filter.

const fs = require('fs');
const path = require('path');

// Small words that say nothing about the problem itself.
const STOP_WORDS = new Set(['the', 'a', 'an', 'near', 'on', 'in', 'at', 'of', 'and', 'to', 'is', 'for', 'road', 'the', 'not', 'with', 'by']);

function words(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

// How many meaningful words two texts share (0 = nothing in common).
function wordOverlap(a, b) {
  const setB = new Set(words(b));
  return [...new Set(words(a))].filter((w) => setB.has(w)).length;
}

// The blocked-word list is read once at start-up with fs and a callback.
let blockedWords = [];
fs.readFile(path.join(__dirname, '..', 'data', 'blocked-words.json'), 'utf8', (err, data) => {
  if (err) {
    console.error('Could not read blocked-words.json:', err.message);
    return;
  }
  blockedWords = JSON.parse(data).map((w) => w.toLowerCase());
});

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Returns the first blocked word found in any of the texts, or null.
// Whole words only (\b), so a name like "Shital" is never blocked.
function findBlockedWord(...texts) {
  const joined = texts.join(' ').toLowerCase();
  return blockedWords.find((w) => new RegExp(`\\b${escapeRegex(w)}\\b`).test(joined)) || null;
}

module.exports = { wordOverlap, findBlockedWord, escapeRegex };
