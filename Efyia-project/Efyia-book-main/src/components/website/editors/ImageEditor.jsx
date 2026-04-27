import FileUpload from '../../efyia/FileUpload';

export default function ImageEditor({ data, onChange }) {
  const set = (field) => (e) => onChange({ [field]: e.target.value });
  return (
    <div className="wb-editor-fields">
      <div className="wb-field">
        <label className="wb-label">Image</label>
        <FileUpload value={data.url || ''} onChange={(url) => onChange({ url })} type="image" />
      </div>
      <div className="wb-field">
        <label className="wb-label">Alt text</label>
        <input type="text" value={data.alt || ''} onChange={set('alt')} placeholder="Describe the image for screen readers" />
      </div>
      <div className="wb-field">
        <label className="wb-label">Caption (optional)</label>
        <input type="text" value={data.caption || ''} onChange={set('caption')} placeholder="Photo by..." />
      </div>
      <div className="wb-field">
        <label className="wb-label">Layout</label>
        <select value={data.layout || 'full'} onChange={set('layout')}>
          <option value="full">Full width</option>
          <option value="center">Centered (max 720px)</option>
          <option value="float-left">Float left</option>
          <option value="float-right">Float right</option>
        </select>
      </div>
    </div>
  );
}
