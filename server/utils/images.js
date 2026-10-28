// utils/images.js
// Photos arrive as base64 text inside JSON ("data:image/png;base64,...").
// We check the type and size, then save the bytes to /uploads with fs.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// Saves one image and returns its public URL ("/uploads/171...-ab12.jpg").
async function saveImage(dataUrl) {
  const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!match) throw badRequest('Photos must be JPG or PNG images.');

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_BYTES) throw badRequest('Photos must be 3 MB or smaller.');

  // Check the file's real first bytes, not just what it claims to be.
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isPng && !isJpg) throw badRequest('That file is not a real JPG or PNG image.');

  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${isPng ? 'png' : 'jpg'}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), bytes); // async/await version of fs
  return `/uploads/${name}`;
}

// Deletes an uploaded photo (callback version of fs). Seed images are skipped.
function deleteImage(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), (err) => {
    if (err && err.code !== 'ENOENT') console.error('Could not delete', url, err.message);
  });
}

module.exports = { saveImage, deleteImage, UPLOAD_DIR };
