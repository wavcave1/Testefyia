import { useCallback, useEffect, useRef, useState } from 'react';
import { websiteApi } from '../lib/api';
import { makeDefaultSectionData } from '../lib/websiteTypes';

export default function useWebsiteEditor(studioId) {
  const [website, setWebsite] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePageId, setActivePageId] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);
  const saveTimerRef = useRef(null);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0] || null;

  // Load website + pages on mount
  useEffect(() => {
    if (!studioId) return;
    setLoading(true);
    websiteApi.get(studioId)
      .then((site) => {
        setWebsite(site);
        return websiteApi.listPages(site.id).then((ps) => {
          const sorted = [...ps].sort((a, b) => a.sortOrder - b.sortOrder);
          setPages(sorted);
          if (sorted.length) {
            const home = sorted.find((p) => p.isHome) || sorted[0];
            setActivePageId(home.id);
          }
          setLoading(false);
        });
      })
      .catch((err) => {
        // If website doesn't exist yet, surface that cleanly
        if (err.status === 404) {
          setWebsite(null);
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
  }, [studioId]);

  // Load sections when activePage changes
  useEffect(() => {
    if (!activePageId) { setSections([]); return; }
    websiteApi.getSections(activePageId)
      .then((secs) => setSections([...secs].sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch(() => setSections([]));
    setIsDirty(false);
  }, [activePageId]);

  const createWebsite = useCallback(async () => {
    const site = await websiteApi.create(studioId);
    setWebsite(site);
    return site;
  }, [studioId]);

  const addPage = useCallback(async ({ title, slug, navLabel, isHome = false }) => {
    const page = await websiteApi.createPage(website.id, {
      title, slug, navLabel, isHome, sortOrder: pages.length,
    });
    setPages((prev) => [...prev, page].sort((a, b) => a.sortOrder - b.sortOrder));
    setActivePageId(page.id);
    return page;
  }, [website, pages]);

  const updatePageMeta = useCallback(async (pageId, data) => {
    const updated = await websiteApi.updatePage(pageId, data);
    setPages((prev) => prev.map((p) => p.id === pageId ? { ...p, ...updated } : p));
    return updated;
  }, []);

  const deletePage = useCallback(async (pageId) => {
    await websiteApi.deletePage(pageId);
    setPages((prev) => {
      const filtered = prev.filter((p) => p.id !== pageId);
      if (activePageId === pageId && filtered.length) setActivePageId(filtered[0].id);
      return filtered;
    });
  }, [activePageId]);

  const addSection = useCallback((type) => {
    const newSection = {
      id: `draft_${Date.now()}`,
      type,
      sortOrder: sections.length,
      isHidden: false,
      data: makeDefaultSectionData(type),
      isDraft: true,
    };
    setSections((prev) => [...prev, newSection]);
    setIsDirty(true);
  }, [sections]);

  const updateSection = useCallback((id, newData) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, data: { ...s.data, ...newData } } : s));
    setIsDirty(true);
  }, []);

  const deleteSection = useCallback((id) => {
    setSections((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, sortOrder: i })));
    setIsDirty(true);
  }, []);

  const toggleSectionHidden = useCallback((id) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, isHidden: !s.isHidden } : s));
    setIsDirty(true);
  }, []);

  const reorderSections = useCallback((fromIndex, toIndex) => {
    setSections((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((s, i) => ({ ...s, sortOrder: i }));
    });
    setIsDirty(true);
  }, []);

  const savePage = useCallback(async () => {
    if (!activePageId) return;
    setSaving(true);
    try {
      const payload = sections.map((s, i) => ({
        id: s.isDraft ? undefined : s.id,
        type: s.type,
        sortOrder: i,
        isHidden: s.isHidden,
        data: s.data,
      }));
      const saved = await websiteApi.saveSections(activePageId, payload);
      setSections([...saved].sort((a, b) => a.sortOrder - b.sortOrder));
      setIsDirty(false);
      clearTimeout(saveTimerRef.current);
    } finally {
      setSaving(false);
    }
  }, [activePageId, sections]);

  const saveSettings = useCallback(async (data) => {
    if (!website) return;
    setSettingsSaving(true);
    try {
      const updated = await websiteApi.updateSettings(website.id, data);
      setWebsite((prev) => ({ ...prev, globalSettings: updated.globalSettings ?? prev.globalSettings, ...updated }));
    } finally {
      setSettingsSaving(false);
    }
  }, [website]);

  return {
    website,
    pages,
    activePage,
    activePageId,
    setActivePageId,
    sections,
    loading,
    saving,
    settingsSaving,
    isDirty,
    error,
    createWebsite,
    addPage,
    updatePageMeta,
    deletePage,
    addSection,
    updateSection,
    deleteSection,
    toggleSectionHidden,
    reorderSections,
    savePage,
    saveSettings,
  };
}
