// utils/voter.js
// An anonymous "voter token": a random ID made once per browser with
// crypto.randomUUID() and kept in localStorage. The server combines it with
// the IP address and stores only a SHA-256 hash, so one person = one vote.

const KEY = 'cf-voter';
let memoryToken = null; // used when storage is blocked (private mode)

export function getVoterToken() {
  try {
    let token = localStorage.getItem(KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(KEY, token);
    }
    return token;
  } catch {
    if (!memoryToken) memoryToken = crypto.randomUUID();
    return memoryToken;
  }
}
