import { useState } from 'react';

export const DEFAULT_SECTION_ORDER = [
  'about',
  'gallery',
  'services',
  'amenities',
  'equipment',
  'contact',
  'reviews',
  'credits',
  'portfolio',
  'team',
];

const SECTION_LABELS = {
  about: 'About / Bio',
  gallery: 'Gallery',
  services: 'Services & Pricing',
  amenities: 'Amenities',
  equipment: 'Equipment',
  contact: 'Contact & Social',
  reviews: 'Reviews',
  credits: 'Credits',
  portfolio: 'Portfolio Samples',
  team: 'Team',
};

export default function SectionOrderEditor({ sections = [], hidden = [], onChange }) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Ensure all default sections are present (add missing ones at end)
  const fullOrder = [
    ...sections.filter((k) => DEFAULT_SECTION_ORDER.includes(k)),
    ...DEFAULT_SECTION_ORDER.filter((k) => !sections.includes(k)),
  ];
  const hiddenSet = new Set(hidden);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...fullOrder];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setDraggedIndex(null);
    setDragOverIndex(null);
    onChange(updated, hidden);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const toggleHidden = (key) => {
    const newHidden = hiddenSet.has(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];
    onChange(fullOrder, newHidden);
  };

  return (
    <div className="sp-section-order-editor">
      {fullOrder.map((key, index) => {
        const isHidden = hiddenSet.has(key);
        const isDragging = draggedIndex === index;
        const isOver = dragOverIndex === index && draggedIndex !== index;

        return (
          <div
            key={key}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={[
              'sp-section-row',
              isDragging ? 'sp-section-row--dragging' : '',
              isOver ? 'sp-section-row--over' : '',
              isHidden ? 'sp-section-row--hidden' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="sp-section-row__handle" aria-hidden="true">⠿</span>
            <span className="sp-section-row__label">{SECTION_LABELS[key] || key}</span>
            <button
              type="button"
              className="sp-section-row__toggle"
              onClick={() => toggleHidden(key)}
              aria-label={isHidden ? `Show ${SECTION_LABELS[key]}` : `Hide ${SECTION_LABELS[key]}`}
              title={isHidden ? 'Show section' : 'Hide section'}
            >
              {isHidden ? '👁️‍🗨️' : '👁'}
            </button>
          </div>
        );
      })}
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.75rem', lineHeight: 1.5 }}>
        Drag rows to reorder. Click the eye to show or hide a section on your public page.
      </p>
    </div>
  );
}
