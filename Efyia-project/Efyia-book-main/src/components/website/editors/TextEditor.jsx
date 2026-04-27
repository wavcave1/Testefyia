export default function TextEditor({ data, onChange }) {
  return (
    <div className="wb-editor-fields">
      <div className="wb-field">
        <label className="wb-label">Content</label>
        <textarea
          rows={8}
          value={data.content || ''}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Write your content here. Separate paragraphs with blank lines."
          style={{ fontFamily: 'inherit', lineHeight: 1.7 }}
        />
      </div>
    </div>
  );
}
