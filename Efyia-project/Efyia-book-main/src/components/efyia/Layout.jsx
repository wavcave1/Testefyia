import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Toast } from './ui';
import { bookingsApi, bookingMessagesApi } from '../../lib/api';

function MessagesFab() {
  const { currentUser } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const returnPath = useRef(null);

  const isOpen = location.pathname === '/messages';

  const dashboardPath =
    currentUser?.role === 'ADMIN' ? '/dashboard/admin'
    : currentUser?.role === 'OWNER' ? '/dashboard/studio'
    : '/dashboard/client';

  const fetchUnread = useCallback(() => {
    if (!currentUser) return;
    bookingsApi.list().then((data) => {
      const list = Array.isArray(data) ? data : [];
      const seen = JSON.parse(localStorage.getItem('efyia_msg_seen') || '{}');
      let count = 0;
      Promise.all(
        list.map((b) =>
          bookingMessagesApi.list(b.id).then((msgs) => {
            const total = Array.isArray(msgs) ? msgs.length : 0;
            const lastSeen = seen[b.id] ?? 0;
            if (total > lastSeen) count += total - lastSeen;
          }).catch(() => {}),
        ),
      ).then(() => setUnread(count));
    }).catch(() => {});
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    bookingsApi.list().then((data) => {
      const list = Array.isArray(data) ? data : [];
      Promise.all(
        list.map((b) =>
          bookingMessagesApi.list(b.id).then((msgs) => {
            const total = Array.isArray(msgs) ? msgs.length : 0;
            return [b.id, total];
          }).catch(() => [b.id, 0]),
        ),
      ).then((entries) => {
        localStorage.setItem('efyia_msg_seen', JSON.stringify(Object.fromEntries(entries)));
        setUnread(0);
      });
    }).catch(() => {});
  }, [isOpen]);

  useEffect(() => { fetchUnread(); }, [fetchUnread]);

  if (!currentUser) return null;

  const handleClick = () => {
    if (isOpen) {
      navigate(returnPath.current || dashboardPath);
      returnPath.current = null;
    } else {
      returnPath.current = location.pathname;
      navigate('/messages');
    }
  };

  return (
    <button
      type="button"
      className={`eyf-msg-fab${isOpen ? ' eyf-msg-fab--open' : ''}`}
      aria-label={isOpen ? 'Close messages' : 'Open messages'}
      onClick={handleClick}
    >
      {isOpen ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {!isOpen && unread > 0 && (
        <span className="eyf-msg-fab__badge" aria-label={`${unread} unread messages`}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="eyf-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

function Footer() {
  return (
    <footer className="eyf-footer">
      <div className="eyf-footer__grid">
        <div className="eyf-footer__brand">
          <strong className="eyf-footer__brand-name">Efyia <em>Book</em></strong>
          <p>The go to studio booking marketplace.</p>
        </div>
        <div className="eyf-footer__col">
          <span className="eyf-footer__col-heading">Platform</span>
          <a href="/discover">Find Studios</a>
          <a href="/signup">List Your Studio</a>
        </div>
        <div className="eyf-footer__col">
          <span className="eyf-footer__col-heading">Company</span>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="mailto:support@efyia.com">Support</a>
        </div>
      </div>
      <div className="eyf-footer__bottom">
        <span className="eyf-muted">© {new Date().getFullYear()} Efyia Book. All rights reserved.</span>
        <div className="eyf-footer__links">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, toast, setToast } = useAppContext();

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(id);
  }, [setToast, toast]);

  const dashboardPath =
    currentUser?.role === 'ADMIN'
      ? '/dashboard/admin'
      : currentUser?.role === 'OWNER'
        ? '/dashboard/studio'
        : '/dashboard/client';

  // Hide discovery nav links for studio owners on their own dashboard
  const isOwnerDashboard =
    currentUser?.role === 'OWNER' &&
    location.pathname.startsWith('/dashboard/studio');

  return (
    <div className="eyf-shell">
      <header className="eyf-nav">
        <div className="eyf-nav__left">
          <button type="button" className="eyf-brand" onClick={() => navigate('/')}>
            <span className="eyf-brand__mark">●</span>
            <span>Efyia <em>Book</em></span>
          </button>
          {!isOwnerDashboard ? (
            <nav className="eyf-nav__links">
              <NavLink to="/discover">Find Studios</NavLink>
            </nav>
          ) : null}
        </div>
        <div className="eyf-nav__actions">
          <ThemeToggle />
          {currentUser ? (
            <>
              <span className="eyf-muted">{currentUser.name}</span>
              <button
                type="button"
                className="eyf-button eyf-button--secondary"
                onClick={() => navigate(dashboardPath)}
              >
                Dashboard
              </button>
              <button type="button" className="eyf-button eyf-button--ghost" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink className="eyf-button eyf-button--ghost" to="/login">
                Log in
              </NavLink>
              <NavLink className="eyf-button eyf-button--secondary eyf-nav__list-cta" to="/signup" style={{ fontSize: '0.875rem' }}>
                List your studio
              </NavLink>
              <NavLink className="eyf-button" to="/signup">
                Get started
              </NavLink>
            </>
          )}
        </div>
      </header>
      <main className="eyf-main">
        <Outlet />
      </main>
      <Footer />
      <MessagesFab />
      <Toast message={toast} onClose={() => setToast('')} />
    </div>
  );
}
