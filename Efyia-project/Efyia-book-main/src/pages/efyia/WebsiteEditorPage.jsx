import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import useWebsiteEditor from '../../hooks/useWebsiteEditor';
import SectionBlock from '../../components/website/SectionBlock';
import SectionPicker from '../../components/website/SectionPicker';
import { websiteApi } from '../../lib/api';
import '../../styles/website.css';

export default function WebsiteEditorPage() {
  const { currentUser } = useAppContext();
  const studioId = currentUser?.studioId || currentUser?.id;

  const {
    website, pages, activePage, activePageId, setActivePageId,
    sections, loading, saving, isDirty, error,
    addSection, updateSection, deleteSection, toggleSectionHidden,
    reorderSections, savePage, updatePageMeta,
  } = useWebsiteEditor(studioId);

  const [showPicker, setShowPicker] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [publishingPage, setPublishingPage] = useState(false);

  const handleTitleBlur = async () => {
    setEditingTitle(false);
    if (activePage && titleDraft.trim() && titleDraft.trim() !== activePage.title) {
      await updatePageMeta(activePage.id, { title: titleDraft.trim() });
    }
  };

  const handleTogglePublished = async () => {
    if (!activePage) return;
    setPublishingPage(true);
    try {
      await updatePageMeta(activePage.id, { isPublished: !activePage.isPublished });
    } finally {
      setPublishingPage(false);
    }
  };

  if (loading) {
    return (
      <div className="wb-editor-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="wb-editor-shell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p style={{ color: 'var(--muted)' }}>{error || 'Website not found.'}</p>
        <Link to="/dashboard/studio/website" className="eyf-button">Back to Website Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="wb-editor-shell">
      {showPicker ? (
        <SectionPicker
          onSelect={(type) => { addSection(type); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      ) : null}

      {/* Left nav — pages list */}
      <aside className="wb-editor-nav">
        <div className="wb-editor-nav__header">
          <Link to="/dashboard/studio/website" style={{ fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>
        <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', margin: '0.75rem 0 0.4rem' }}>
          Pages
        </p>
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivePageId(p.id)}
            className={`wb-nav-page-btn${activePageId === p.id ? ' wb-nav-page-btn--active' : ''}`}
          >
            {p.title || 'Untitled'}
            {p.isHome ? <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '0.3rem' }}>(home)</span> : null}
          </button>
        ))}
      </aside>

      {/* Right editor area */}
      <main className="wb-editor-main">
        {/* Toolbar */}
        <div className="wb-editor-toolbar">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTitleBlur(); if (e.key === 'Escape') setEditingTitle(false); }}
              style={{ fontSize: '1rem', fontWeight: 700, background: 'none', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', minWidth: 200 }}
            />
          ) : (
            <h2
              style={{ margin: 0, cursor: 'text', fontSize: '1rem' }}
              onClick={() => { setTitleDraft(activePage?.title || ''); setEditingTitle(true); }}
              title="Click to rename"
            >
              {activePage?.title || 'Untitled page'}
            </h2>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={activePage?.isPublished || false}
                onChange={handleTogglePublished}
                disabled={publishingPage}
                style={{ width: 15, height: 15 }}
              />
              Published
            </label>
            {website?.subdomain && activePage?.slug ? (
              <a
                href={`https://${website.subdomain}/${activePage.isHome ? '' : activePage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.8rem', color: 'var(--muted)', textDecoration: 'underline' }}
              >
                Preview ↗
              </a>
            ) : null}
            <button
              type="button"
              className="eyf-button"
              onClick={savePage}
              disabled={saving || !isDirty}
            >
              {saving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
            </button>
          </div>
        </div>

        {/* Section list */}
        <div className="wb-sections-list">
          {sections.length === 0 ? (
            <div className="wb-empty-sections">
              <p style={{ color: 'var(--muted)' }}>No sections yet. Add your first section below.</p>
            </div>
          ) : sections.map((section, index) => (
            <SectionBlock
              key={section.id}
              section={section}
              index={index}
              onUpdate={updateSection}
              onDelete={() => deleteSection(section.id)}
              onToggleHide={() => toggleSectionHidden(section.id)}
              isDragging={dragIndex === index}
              isOver={dragOverIndex === index && dragIndex !== index}
              onDragStart={(e) => { setDragIndex(index); e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null && dragIndex !== index) reorderSections(dragIndex, index);
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            />
          ))}
        </div>

        <div className="wb-add-section-bar">
          <button type="button" className="eyf-button eyf-button--ghost" onClick={() => setShowPicker(true)}>
            + Add section
          </button>
        </div>
      </main>
    </div>
  );
}
