import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';
import CommandPalette from '../components/CommandPalette';
import { useT } from '../hooks/useT';

const ROLE_BADGE_COLORS = {
  admin:    { bg: 'rgba(239, 68, 68, 0.15)', fg: '#dc2626', label: 'Admin' },
  manager:  { bg: 'rgba(59, 130, 246, 0.15)', fg: '#2563eb', label: 'Manager' },
  operator: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#059669', label: 'Operator' },
};

export default function DashboardLayout() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const { alerts, logout, authToken, user, hasRole, darkMode, toggleDarkMode } = useWarehouse();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authToken) {
      navigate('/login');
      return;
    }
    if (user?.must_change_password) {
      navigate('/change-password');
    }
  }, [authToken, user, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = (e) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  const badge = ROLE_BADGE_COLORS[user?.role] || { bg: 'var(--bg-tertiary)', fg: 'var(--text-secondary)', label: user?.role || '—' };

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

  // Typing animation for search hint — rotates through suggestions
  const searchHints = t.search.hints;
  const [hintText, setHintText] = useState(t.search.hints[0]);
  const [hintPhraseIdx, setHintPhraseIdx] = useState(0);
  const [hintDeleting, setHintDeleting] = useState(false);
  const [hintCursorVisible, setHintCursorVisible] = useState(true);

  useEffect(() => {
    const cursorBlink = setInterval(() => setHintCursorVisible(v => !v), 530);
    return () => clearInterval(cursorBlink);
  }, []);

  useEffect(() => {
    let timer;
    const phrase = searchHints[hintPhraseIdx];
    if (hintDeleting) {
      if (hintText === '') {
        setHintDeleting(false);
        setHintPhraseIdx(i => (i + 1) % searchHints.length);
      } else {
        timer = setTimeout(() => setHintText(phrase.substring(0, hintText.length - 1)), 28);
      }
    } else {
      if (hintText === phrase) {
        timer = setTimeout(() => setHintDeleting(true), 2200);
      } else {
        const next = phrase[hintText.length];
        const speed = next === ' ' ? 90 : 55 + Math.random() * 35;
        timer = setTimeout(() => setHintText(phrase.substring(0, hintText.length + 1)), speed);
      }
    }
    return () => clearTimeout(timer);
  }, [hintText, hintDeleting, hintPhraseIdx]);

  return (
    <div className="app-container">
      <CommandPalette />

      {/* Real-Time Toast Notifications */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map((alert) => (
          <div key={alert.id} style={{
            backgroundColor: alert.risk === 'danger' ? 'var(--alert-danger-bg)' : 'var(--alert-warning-bg)',
            border: `1px solid ${alert.risk === 'danger' ? 'var(--alert-danger)' : 'var(--alert-warning)'}`,
            padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            animation: 'toastSlideIn 0.4s cubic-bezier(0.21, 1.02, 0.73, 1)',
            display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '300px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: alert.risk === 'danger' ? 'var(--alert-danger)' : 'var(--alert-warning)' }}>
              {alert.risk === 'danger' ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              )}
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '700' }}>{alert.type} Detected!</h4>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{alert.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '2rem', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Paw.webp" alt="Paw Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.03em' }}>SmartWarehouse</span>
        </div>

        {/* Nav — scrollable middle section */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto' }}>
          {/* Main */}
          <p style={{ fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.12em', color: 'var(--text-secondary)', opacity: 0.5, margin: '0 0 0.4rem 0.6rem', textTransform: 'uppercase' }}>{t.nav.main}</p>
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-9h6"/></svg>
            {t.nav.liveMonitor}
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            {t.nav.detectionLogs}
          </NavLink>
          <NavLink to="/ask-ai" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"} style={{ position: 'relative' }}>
            <img src="/ask ai.svg" alt="Ask AI" style={{ width: 18, height: 18, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
            Ask AI
            <span style={{ fontSize: '0.55rem', fontWeight: '800', backgroundColor: '#3b82f6', color: '#fff', padding: '0.1rem 0.35rem', borderRadius: '99px', marginLeft: 'auto', letterSpacing: '0.03em' }}>NEW</span>
          </NavLink>

          {/* Analytics — only admin/manager */}
          {hasRole && hasRole('admin', 'manager') && (<>
            <p style={{ fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.12em', color: 'var(--text-secondary)', opacity: 0.5, margin: '1rem 0 0.4rem 0.6rem', textTransform: 'uppercase' }}>{t.nav.analytics}</p>
            <NavLink to="/analysis" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              {t.nav.riskAnalysis}
            </NavLink>
            <NavLink to="/ai-performance" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              {t.nav.aiPerformance}
            </NavLink>
          </>)}

          {/* Admin */}
          {hasRole && hasRole('admin') && (<>
            <p style={{ fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.12em', color: 'var(--text-secondary)', opacity: 0.5, margin: '1rem 0 0.4rem 0.6rem', textTransform: 'uppercase' }}>{t.nav.admin}</p>
            <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {t.nav.userManagement}
            </NavLink>
          </>)}

          {hasRole && hasRole('admin', 'manager') && (
            <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              {t.nav.settings}
            </NavLink>
          )}
        </nav>

        {/* Bottom: user info + sign out */}
        {user && (
          <div style={{ flexShrink: 0, paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: badge.bg, color: badge.fg, fontWeight: '800', fontSize: '0.8rem', flexShrink: 0 }}>
                {(user.name || user.username || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || user.username}</p>
                <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: '700', color: badge.fg, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{badge.label}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', borderRadius: '8px',
                backgroundColor: 'transparent', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {t.nav.signOut}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-nav" style={{ padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', height: '80px', backgroundColor: 'var(--glass-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>{t.header.title}</h2>
              <p style={{ fontSize: '0.8125rem', fontWeight: '500', color: 'var(--text-secondary)', margin: '0.125rem 0 0 0' }}>{t.header.subtitle}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Command palette trigger */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
              title={`Quick search (${isMac ? '⌘' : 'Ctrl'}+K)`}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)', borderRadius: '8px',
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span style={{ minWidth: '120px', display: 'inline-block', textAlign: 'left' }}>
                {hintText}
                <span style={{
                  display: 'inline-block', width: '1px',
                  opacity: hintCursorVisible ? 1 : 0,
                  marginLeft: '1px', color: 'var(--accent-primary)',
                  transition: 'opacity 0.05s',
                }}>|</span>
              </span>
              <span style={{
                fontSize: '0.7rem', padding: '0.1rem 0.35rem',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                borderRadius: '4px', fontFamily: 'SFMono-Regular, Consolas, monospace',
                color: 'var(--text-secondary)',
              }}>{isMac ? '⌘K' : 'Ctrl+K'}</span>
            </button>

            {/* Dark mode toggle */}
            <button
              onClick={() => toggleDarkMode(!darkMode)}
              title={darkMode ? t.header.lightMode : t.header.darkMode}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px',
                backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer',
                transition: 'all 0.2s ease', flexShrink: 0,
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
            >
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>

            {/* User info + role badge */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.375rem 0.75rem 0.375rem 0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: badge.bg, color: badge.fg, fontWeight: '700', fontSize: '0.75rem' }}>
                  {(user.name || user.username || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: 'var(--text-primary)' }}>{user.name || user.username}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: '600', color: badge.fg, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{badge.label}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{currentTime}</span>
            </div>

          </div>
        </header>

        {/* Dynamic Page Content Rendered Here */}
        <div className="dashboard-content">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
