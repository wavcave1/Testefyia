import FileUpload from '../../efyia/FileUpload';

export default function GalleryEditor({ data, onChange }) {
  const images = data.images || [];

  const addImage = () => onChange({ images: [...images, { url: '', caption: '' }] });
  const removeImage = (i) => onChange({ images: images.filter((_, idx) => idx !== i) });
  const setImage = (i, field) => (val) => {
    const updated = [...images];
    updated[i] = { ...updated[i], [field]: val };
    onChange({ images: updated });
  };

  return (
    <div className="wb-editor-fields">
      <div className="wb-field wb-field--row" style={{ gap: '1rem' }}>
        <div>
          <label className="wb-label">Columns</label>
          <select value={data.columns || 3} onChange={(e) => onChange({ columns: Number(e.target.value) })} style={{ width: 80 }}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div>
          <label className="wb-label">Style</label>
          <select value={data.style || 'grid'} onChange={(e) => onChange({ style: e.target.value })}>
            <option value="grid">Grid</option>
            <option value="masonry">Masonry</option>
          </select>
        </div>
      </div>
      {images.map((img, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Image {i + 1}</span>
            <button type="button" onClick={() => removeImage(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
          </div>
          <FileUpload value={img.url} onChange={setImage(i, 'url')} type="image" />
          <input type="text" value={img.caption || ''} onChange={(e) => setImage(i, 'caption')(e.target.value)} placeholder="Caption (optional)" style={{ marginTop: '0.5rem' }} />
        </div>
      ))}
      <button type="button" className="eyf-button eyf-button--secondary" onClick={addImage}>+ Add image</button>
    </div>
  );
}
