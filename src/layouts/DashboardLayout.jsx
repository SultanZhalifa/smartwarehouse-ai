import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';

const ROLE_BADGE_COLORS = {
  admin:    { bg: 'rgba(239, 68, 68, 0.15)', fg: '#dc2626', label: 'Admin' },
  manager:  { bg: 'rgba(59, 130, 246, 0.15)', fg: '#2563eb', label: 'Manager' },
  operator: { bg: 'rgba(16, 185, 129, 0.15)', fg: '#059669', label: 'Operator' },
};

export default function DashboardLayout() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const { alerts, logout, authToken, user, hasRole } = useWarehouse();
  const navigate = useNavigate();

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

  return (
    <div className="app-container">
      {/* Real-Time Toast Notifications */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map((alert) => (
          <div key={alert.id} style={{
            backgroundColor: alert.risk === 'danger' ? 'var(--alert-danger-bg)' : 'var(--alert-warning-bg)',
            border: `1px solid ${alert.risk === 'danger' ? 'var(--alert-danger)' : 'var(--alert-warning)'}`,
            padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.3s ease-out', display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '300px'
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
      <aside className="sidebar">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '3rem' }}>
          <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Paw.webp" alt="Paw Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.03em' }}>SmartWarehouse</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h4l2-9 5 18 3-9h6"/></svg>
            Live Monitor
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Detection Logs
          </NavLink>
          {hasRole && hasRole('admin', 'manager') && (
            <NavLink to="/analysis" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Risk Analysis
            </NavLink>
          )}
          {hasRole && hasRole('admin') && (
            <NavLink to="/users" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              User Management
            </NavLink>
          )}
          {hasRole && hasRole('admin', 'manager') && (
            <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-link active" : "nav-link inactive"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </NavLink>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-nav" style={{ padding: '0 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', height: '80px', backgroundColor: 'var(--glass-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>Bio-Hazard Detection</h2>
              <p style={{ fontSize: '0.8125rem', fontWeight: '500', color: 'var(--text-secondary)', margin: '0.125rem 0 0 0' }}>PT. Kawan Lama Surveillance</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

            <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: '600', transition: 'all 0.2s ease' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--alert-danger-bg)'; e.currentTarget.style.color = 'var(--alert-danger)'; e.currentTarget.style.borderColor = 'transparent'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic Page Content Rendered Here */}
        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
