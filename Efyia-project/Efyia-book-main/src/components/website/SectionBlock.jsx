import { useState } from 'react';
import SectionEditor from './SectionEditor';
import { SECTION_TYPE_MAP } from '../../lib/websiteTypes';

export default function SectionBlock({
  section, index,
  onUpdate, onDelete, onToggleHide,
  onDragStart, onDragOver, onDrop, onDragEnd,
  isDragging, isOver,
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = SECTION_TYPE_MAP[section.type] || { label: section.type, icon: '▪' };

  return (
    <div
      className={[
        'wb-section-block',
        isDragging ? 'wb-section-block--dragging' : '',
        isOver ? 'wb-section-block--over' : '',
        section.isHidden ? 'wb-section-block--hidden' : '',
      ].filter(Boolean).join(' ')}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="wb-section-block__header" onClick={() => setExpanded((v) => !v)}>
        <span className="wb-section-block__handle" aria-hidden="true">⠿</span>
        <span className="wb-section-block__icon">{meta.icon}</span>
        <span className="wb-section-block__label">{meta.label}</span>
        {section.isDraft ? <span className="wb-badge wb-badge--draft" style={{ marginLeft: 'auto' }}>Unsaved</span> : null}
        <div className="wb-section-block__actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleHide}
            title={section.isHidden ? 'Show section' : 'Hide section'}
            className="wb-icon-btn"
          >
            {section.isHidden ? '👁️‍🗨️' : '👁'}
          </button>
          <button type="button" onClick={onDelete} className="wb-icon-btn" title="Delete section">🗑</button>
        </div>
        <span className="wb-section-block__chevron">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded ? <SectionEditor section={section} onUpdate={onUpdate} /> : null}
    </div>
  );
}
