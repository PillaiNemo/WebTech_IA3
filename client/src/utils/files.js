// utils/files.js
// Reads a photo the user picked with FileReader and returns it as base64
// text ("data:image/png;base64,..."), which travels inside the JSON body.

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const TYPES = ['image/jpeg', 'image/png'];

export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file chosen.'));
    if (!TYPES.includes(file.type)) return reject(new Error('Please choose a JPG or PNG photo.'));
    if (file.size > MAX_IMAGE_BYTES) return reject(new Error('Photos must be 3 MB or smaller.'));

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsDataURL(file);
  });
}
