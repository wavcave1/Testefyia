import { useEffect } from 'react';
import { SECTION_TYPES } from '../../lib/websiteTypes';

export default function SectionPicker({ onSelect, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="wb-picker-backdrop" onClick={onClose}>
      <div className="wb-picker-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add section">
        <div className="wb-picker-header">
          <h3 style={{ margin: 0 }}>Add a section</h3>
          <button type="button" onClick={onClose} className="wb-icon-btn" style={{ fontSize: '1.25rem' }}>×</button>
        </div>
        <div className="wb-picker-grid">
          {SECTION_TYPES.map((s) => (
            <button
              key={s.type}
              type="button"
              className="wb-picker-card"
              onClick={() => { onSelect(s.type); onClose(); }}
            >
              <span className="wb-picker-card__icon">{s.icon}</span>
              <strong className="wb-picker-card__label">{s.label}</strong>
              <p className="wb-picker-card__desc">{s.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
