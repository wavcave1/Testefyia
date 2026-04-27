import { useCallback, useEffect, useState } from 'react';
import { bookingFilesApi } from '../../lib/api';
import { Spinner } from '../efyia/ui';

function getFileIcon(mimeType) {
  if (!mimeType) return '📁';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.startsWith('image/')) return '🖼';
  if (mimeType === 'application/pdf') return '📄';
  return '📁';
}

function formatSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '0 KB';
  if (value >= 1024 ** 3) return `${(value / (1024 ** 3)).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${(value / (1024 ** 2)).toFixed(1)} MB`;
  return `${(value / 1024).toFixed(1)} KB`;
}

export default function FileList({ bookingId, canUpload, currentUserId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setUploadError(null);

    try {
      const data = await bookingFilesApi.list(bookingId);
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setUploadError(err.message || 'Could not load files.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      await bookingFilesApi.upload(bookingId, file);
      await loadFiles();
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = async (fileId) => {
    setUploadError(null);
    try {
      await bookingFilesApi.delete(bookingId, fileId);
      await loadFiles();
    } catch (err) {
      setUploadError(err.message || 'Could not delete file.');
    }
  };

  return (
    <div className="eyf-stack" style={{ gap: '0.6rem' }}>
      <h4 style={{ margin: 0, fontSize: '0.76rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Session Files
      </h4>

      {loading ? <Spinner /> : null}

      {canUpload ? (
        <label className="eyf-button eyf-button--ghost" style={{ width: 'fit-content', minHeight: 'unset', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}>
          Upload files
          <input
            type="file"
            accept="audio/*,image/*,application/pdf,video/*,.zip"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
        </label>
      ) : null}

      {uploading ? <p className="eyf-muted" style={{ margin: 0, fontSize: '0.82rem' }}>Uploading...</p> : null}
      {uploadError ? <p className="eyf-field-error" style={{ margin: 0 }}>{uploadError}</p> : null}

      {files.length ? (
        <div className="eyf-file-list">
          {files.map((file) => (
            <div key={file.id} className="eyf-file-item">
              <div className="eyf-file-item__info">
                <span>{getFileIcon(file.mimeType)}</span>
                <a className="eyf-file-item__name" href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                  {file.fileName}
                </a>
                <span className="eyf-file-item__size">{formatSize(file.fileSize)}</span>
              </div>
              {canUpload ? (
                <button
                  type="button"
                  className="eyf-button eyf-button--ghost"
                  style={{ minHeight: 'unset', padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                  onClick={() => removeFile(file.id)}
                >
                  Delete
                </button>
              ) : null}
              {file.mimeType?.startsWith('audio/') && file.fileUrl ? (
                <audio
                  src={file.fileUrl}
                  controls
                  style={{ width: '100%', marginTop: '0.4rem', borderRadius: 6 }}
                  aria-label={file.fileName}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : canUpload ? (
        <p className="eyf-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          Upload session files to share with your client.
        </p>
      ) : (
        <p className="eyf-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
          No files have been shared yet.
        </p>
      )}
    </div>
  );
}
