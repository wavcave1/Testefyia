import { useCallback, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function uploadToServer(file) {
  const token = localStorage.getItem('efyia_token');
  if (!token) throw new Error('You must be logged in to upload files.');

  const fd = new FormData();
  fd.append('file', file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed.');
  return data.url;
}

const ACCEPT_MAP = {
  image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
  audio: 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aac,audio/x-aac,audio/ogg,audio/flac,audio/x-flac,audio/mp4,audio/x-m4a,.mp3,.wav,.aac,.ogg,.flac,.m4a,.m4b',
};

export default function FileUpload({
  value = '',
  onChange,
  type = 'image',
  label,
  hint,
  accept,
  multiple = false,
  maxFiles = 12,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const resolvedAccept = accept || ACCEPT_MAP[type] || 'image/*';

  const values = multiple
    ? (Array.isArray(value) ? value.filter(Boolean) : [])
    : (value && value.trim ? value.trim() : '');

  const handleFiles = useCallback(
    async (incomingFiles) => {
      const files = Array.from(incomingFiles || []).filter(Boolean);
      if (!files.length) return;

      setError(null);
      setUploading(true);
      try {
        const uploadedUrls = await Promise.all(files.map((file) => uploadToServer(file)));
        if (multiple) {
          const next = [...values, ...uploadedUrls].slice(0, maxFiles);
          onChange(next);
        } else {
          onChange(uploadedUrls[0] || '');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    },
    [maxFiles, multiple, onChange, values],
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const files = multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]];
      handleFiles(files);
    },
    [handleFiles, multiple],
  );

  const hasValue = multiple ? values.length > 0 : Boolean(values);

  return (
    <div className="eyf-upload">
      {label ? <p className="eyf-upload__label">{label}</p> : null}

      {hasValue ? (
        multiple ? (
          <div className="eyf-upload__preview">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: '0.5rem' }}>
              {values.map((url, idx) => (
                <div key={`${url}-${idx}`} style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <img src={url} alt={`Uploaded ${idx + 1}`} className="eyf-upload__img" style={{ aspectRatio: '1 / 1', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => onChange(values.filter((_, itemIdx) => itemIdx !== idx))}
                    style={{ position: 'absolute', top: 6, right: 6, border: 'none', borderRadius: '999px', width: 24, height: 24, background: 'rgba(17,24,39,0.75)', color: 'white', cursor: 'pointer' }}
                    aria-label={`Remove image ${idx + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="eyf-upload__preview-actions">
              <button
                type="button"
                className="eyf-upload__change"
                onClick={() => inputRef.current?.click()}
              >
                Add more
              </button>
              <button
                type="button"
                className="eyf-upload__remove"
                onClick={() => onChange([])}
                aria-label="Remove all files"
              >
                Remove all
              </button>
            </div>
          </div>
        ) : (
          <div className="eyf-upload__preview">
            {type === 'audio' ? (
              <audio
                src={values}
                controls
                className="eyf-upload__audio"
                aria-label="Audio preview"
              />
            ) : (
              <img
                src={values}
                alt="Upload preview"
                className="eyf-upload__img"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <div className="eyf-upload__preview-actions">
              <button
                type="button"
                className="eyf-upload__change"
                onClick={() => inputRef.current?.click()}
              >
                Change
              </button>
              <button
                type="button"
                className="eyf-upload__remove"
                onClick={() => onChange('')}
                aria-label="Remove file"
              >
                Remove
              </button>
            </div>
          </div>
        )
      ) : (
        <div
          className={`eyf-dropzone${dragging ? ' is-dragging' : ''}${uploading ? ' is-uploading' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!uploading) inputRef.current?.click();
            }
          }}
          aria-label={uploading ? 'Uploading...' : `Upload ${type} file${multiple ? 's' : ''}`}
        >
          {uploading ? (
            <div className="eyf-dropzone__uploading">
              <span className="eyf-spinner" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <span className="eyf-dropzone__icon" aria-hidden="true">
                {type === 'audio' ? '🎵' : '🖼'}
              </span>
              <span className="eyf-dropzone__text">
                Drop {type === 'audio' ? 'audio' : (multiple ? 'images' : 'image')} here or{' '}
                <span className="eyf-dropzone__browse">browse</span>
              </span>
              {hint ? <span className="eyf-dropzone__hint">{hint}</span> : null}
            </>
          )}
        </div>
      )}

      {error ? (
        <p className="eyf-upload__error" role="alert">
          {error}
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={resolvedAccept}
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFiles(multiple ? e.target.files : [e.target.files[0]]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
