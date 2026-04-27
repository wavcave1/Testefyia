import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import useWebsiteEditor from '../../hooks/useWebsiteEditor';
import DomainSearchWidget from '../../components/website/DomainSearchWidget';
import WebsiteGlobalSettings from '../../components/website/WebsiteGlobalSettings';
import { websiteApi } from '../../lib/api';
import '../../styles/website.css';

function PageRow({ page, onEdit }) {
  return (
    <div className="wb-page-row">
      <div className="wb-page-row__info">
        <strong>{page.title}</strong>
        <span className="wb-page-row__slug">/{page.slug || ''}</span>
        {page.isHome ? <span className="wb-badge">Home</span> : null}
      </div>
      <div className="wb-page-row__actions">
        <span className={`wb-badge wb-badge--${page.isPublished ? 'published' : 'draft'}`}>
          {page.isPublished ? 'Published' : 'Draft'}
        </span>
        <button type="button" className="eyf-button eyf-button--ghost" onClick={() => onEdit(page)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}>
          Edit
        </button>
      </div>
    </div>
  );
}

export default function WebsiteDashboard() {
  const { currentUser } = useAppContext();
  const studioId = currentUser?.studioId || currentUser?.id;

  const {
    website, pages, loading, error, settingsSaving,
    createWebsite, addPage, saveSettings,
  } = useWebsiteEditor(studioId);

  const [searchParams] = useSearchParams();
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [dnsVerifying, setDnsVerifying] = useState(false);
  const [dnsResult, setDnsResult] = useState(null);
  const [activeTab, setActiveTab] = useState('pages');

  const handleCreateWebsite = async () => {
    await createWebsite();
  };

  const handleAddPage = async (e) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const slug = newPageSlug.trim() || newPageTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await addPage({ title: newPageTitle.trim(), slug, navLabel: newPageTitle.trim(), isHome: pages.length === 0 });
      setNewPageTitle('');
      setNewPageSlug('');
      setShowNewPage(false);
    } catch (err) {
      setCreateError(err.message || 'Could not create page.');
    } finally {
      setCreating(false);
    }
  };

  const handleVerifyDns = async () => {
    setDnsVerifying(true);
    setDnsResult(null);
    try {
      const result = await websiteApi.verifyDns(website.id);
      setDnsResult(result);
    } catch (err) {
      setDnsResult({ error: err.message });
    } finally {
      setDnsVerifying(false);
    }
  };

  const subdomain = website?.subdomain || (currentUser?.studioSlug ? `${currentUser.studioSlug}.efyiabook.com` : null);

  if (loading) {
    return (
      <div className="eyf-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="eyf-page">
        <p style={{ color: 'var(--error, #f87171)' }}>{error}</p>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="eyf-page">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Website Builder</h1>
          <p style={{ color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Build a standalone website for your studio. You'll get a free subdomain at{' '}
            <strong>{subdomain || '{slug}.efyiabook.com'}</strong> and can connect a custom domain.
          </p>
          <button type="button" className="eyf-button" onClick={handleCreateWebsite}>
            Create my website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="eyf-page">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Website Builder</h1>
          <Link to="/dashboard/studio/website/editor" className="eyf-button">
            Open Editor
          </Link>
        </div>

        {/* Subdomain card */}
        <div className="eyf-card eyf-stack" style={{ marginBottom: '1.25rem' }}>
          <div className="eyf-row eyf-row--between">
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Free subdomain</p>
              <p style={{ margin: '0.2rem 0 0', color: 'var(--mint, #62f3d4)', fontFamily: 'monospace', fontSize: '1rem' }}>
                {subdomain}
              </p>
            </div>
            {subdomain ? (
              <a href={`https://${subdomain}`} target="_blank" rel="noopener noreferrer" className="eyf-button eyf-button--ghost" style={{ fontSize: '0.8rem' }}>
                Visit site ↗
              </a>
            ) : null}
          </div>
        </div>

        {/* Tab nav */}
        <div className="eyf-tabs eyf-tabs--scroll" style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', gap: 0 }}>
          {['pages', 'domain', 'settings'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--mint)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--text)' : 'var(--muted)',
                fontWeight: activeTab === tab ? 700 : 400,
                fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Pages tab */}
        {activeTab === 'pages' ? (
          <div className="eyf-card eyf-stack">
            {pages.length > 0 ? (
              pages.map((p) => (
                <PageRow key={p.id} page={p} onEdit={() => {}} />
              ))
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No pages yet. Add your first page below.</p>
            )}
            {showNewPage ? (
              <form onSubmit={handleAddPage} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="Page title (e.g. About)"
                  required
                  autoFocus
                />
                <input
                  type="text"
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder="URL slug (e.g. about) — auto-generated if blank"
                />
                {createError ? <p style={{ color: 'var(--error, #f87171)', fontSize: '0.8rem', margin: 0 }}>{createError}</p> : null}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="eyf-button" disabled={creating}>{creating ? 'Creating...' : 'Create page'}</button>
                  <button type="button" className="eyf-button eyf-button--ghost" onClick={() => setShowNewPage(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <button type="button" className="eyf-button eyf-button--secondary" onClick={() => setShowNewPage(true)} style={{ alignSelf: 'flex-start' }}>
                + Add page
              </button>
            )}
          </div>
        ) : null}

        {/* Domain tab */}
        {activeTab === 'domain' ? (
          <div className="eyf-card eyf-stack">
            {website.customDomain ? (
              <>
                <p style={{ fontWeight: 700 }}>Custom domain: <span style={{ color: 'var(--mint, #62f3d4)', fontFamily: 'monospace' }}>{website.customDomain}</span></p>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                  Status: {website.dnsConfigured ? '✅ DNS verified' : '⏳ Awaiting DNS verification'}
                </p>
                {!website.dnsConfigured ? (
                  <>
                    <div className="wb-dns-instructions">
                      <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Point your domain DNS to:</p>
                      <code>CNAME @ → {subdomain}</code>
                    </div>
                    <button type="button" className="eyf-button eyf-button--ghost" onClick={handleVerifyDns} disabled={dnsVerifying}>
                      {dnsVerifying ? 'Checking...' : 'Verify DNS'}
                    </button>
                    {dnsResult ? (
                      <p style={{ fontSize: '0.875rem', color: dnsResult.error ? 'var(--error, #f87171)' : 'var(--mint, #62f3d4)' }}>
                        {dnsResult.error || (dnsResult.verified ? 'DNS verified!' : 'DNS not yet propagated. Try again in a few minutes.')}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <h3 style={{ margin: 0 }}>Purchase a custom domain</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                  Search for an available domain. Purchase is processed via Stripe.
                </p>
                <DomainSearchWidget websiteId={website.id} onPurchased={() => window.location.reload()} />
              </>
            )}
          </div>
        ) : null}

        {/* Settings tab */}
        {activeTab === 'settings' ? (
          <div className="eyf-card eyf-stack">
            <h3 style={{ margin: 0 }}>Global settings</h3>
            <WebsiteGlobalSettings
              settings={website.globalSettings || {}}
              onSave={saveSettings}
              saving={settingsSaving}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
