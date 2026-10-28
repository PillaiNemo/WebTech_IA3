// PhotoPicker: drag a photo onto the box or tap it to choose one.
// The file is read with FileReader (utils/files.js) and shown as a preview;
// the parent receives the base64 text that is sent to the server.

import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { readImageFile } from '../utils/files.js';

export default function PhotoPicker({ value, onChange, label = 'Upload Image (optional)' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file) {
    try {
      setError('');
      onChange(await readImageFile(file));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <p className="form-label">{label}</p>
      <div className="cf-photo">
        {value && (
          <div className="cf-photo__preview">
            <img src={value} alt="Preview of the photo you chose" />
            <button type="button" className="cf-photo__remove" onClick={() => onChange('')} aria-label="Remove photo">×</button>
          </div>
        )}
        <button
          type="button"
          className={`cf-photo__drop${dragging ? ' is-dragging' : ''}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        >
          <Icon name="camera" size={22} />
          <span>{value ? 'Replace image' : 'Add Image'}</span>
          <small>JPG or PNG, up to 3 MB. Drag it here or tap.</small>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="visually-hidden"
          tabIndex={-1}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ''; }}
        />
      </div>
      {error && <p className="text-danger cf-small mt-2 mb-0" role="alert">{error}</p>}
    </div>
  );
}
