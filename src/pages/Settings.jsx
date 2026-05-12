import React, { useState, useEffect } from 'react';
import { useWarehouse } from '../context/WarehouseContext';
import { useToast } from '../components/ToastNotification';
import { useT } from '../hooks/useT';
import CameraSettings from '../components/settings/CameraSettings';
import PreferencesSettings from '../components/settings/PreferencesSettings';
import DangerZone from '../components/settings/DangerZone';
import api from '../lib/apiClient';

/* ─── System Architecture section (static info, kept inline for clarity) ─── */
const ARCH_ITEMS = [
  { name: 'Camera/Video', sub: 'OpenCV', color: '#6366f1', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { name: 'YOLO11 AI', sub: 'Inference', color: '#ef4444', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { name: 'FastAPI', sub: 'Backend', color: '#059669', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
  { name: 'SQLite', sub: 'Database', color: '#0ea5e9', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
  { name: 'WebSocket', sub: 'Real-time', color: '#f59e0b', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { name: 'React', sub: 'Dashboard', color: '#3b82f6', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];
const TEAM = [
  { name: 'Sultan', role: 'Scrum Master', color: '#3b82f6', initials: 'SZ' },
  { name: 'Fathir', role: 'Backend & AI Lead', color: '#ef4444', initials: 'FF' },
  { name: 'Risly', role: 'Frontend Dev', color: '#8b5cf6', initials: 'RM' },
  { name: 'Misha', role: 'UI/UX Designer', color: '#f59e0b', initials: 'MS' },
];

export default function Settings() {
  const { authToken, darkMode, toggleDarkMode, setLogs, language, changeLanguage } = useWarehouse();
  const t = useT();
  const { addToast } = useToast();

  const [cameraUrl, setCameraUrl] = useState('0');
  const [cameraZone, setCameraZone] = useState('Zone A');
  const [threshold, setThreshold] = useState(50);
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getJson('/settings')
      .then(data => {
        if (data.cameraUrl) setCameraUrl(data.cameraUrl);
        if (data.cameraZone) setCameraZone(data.cameraZone);
        if (data.threshold) setThreshold(data.threshold);
        if (data.notifications !== undefined) setNotifications(data.notifications);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (cameraUrl !== '0' && cameraUrl !== '1' && !cameraUrl.match(/^(rtsp|http|https):\/\//) && !cameraUrl.match(/\.(mp4|avi|mov|mkv)$/i)) {
      addToast(t.settings.invalidCamera, 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await api.postJson('/settings', { cameraUrl, cameraZone, threshold, notifications, darkMode });
      addToast(res.message || t.settings.saveSuccess, 'success');
    } catch (err) {
      addToast(err.message || t.settings.saveFailed, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-transition" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="skeleton" style={{ height: 32, width: 160, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 320 }} />
        </div>
        <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48, width: '100%', borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>

      {/* Page title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>{t.settings.title}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{t.settings.subtitle}</p>
      </div>

      {/* Main settings card */}
      <div className="settings-card">
        <CameraSettings
          cameraUrl={cameraUrl} cameraZone={cameraZone} threshold={threshold}
          onUrlChange={setCameraUrl} onZoneChange={setCameraZone} onThresholdChange={setThreshold}
          t={t}
        />
        <div className="settings-divider" />
        <PreferencesSettings
          notifications={notifications} darkMode={darkMode} language={language}
          onNotifToggle={() => setNotifications(v => !v)}
          onDarkToggle={toggleDarkMode}
          onLangChange={changeLanguage}
          t={t}
        />

        {/* Save button */}
        <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button
            onClick={handleSave} disabled={isSaving}
            className="save-btn"
            style={{ opacity: isSaving ? 0.7 : 1, transform: isSaving ? 'scale(0.98)' : 'scale(1)' }}
            onMouseOver={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isSaving && <span className="save-spinner" />}
            {isSaving ? t.settings.saving : t.settings.saveSettings}
          </button>
        </div>
      </div>

      {/* System Architecture */}
      <div className="settings-card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div className="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <h3 className="section-title">{t.settings.systemArchitecture}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '1.5rem 0' }}>
          {ARCH_ITEMS.map((item, i, arr) => (
            <React.Fragment key={i}>
              <div
                className="arch-node"
                onMouseOver={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 4px 12px ${item.color}20`; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{item.sub}</span>
              </div>
              {i < arr.length - 1 && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            ['Frontend Framework', 'React 19 + Vite 8'], ['Backend Framework', 'FastAPI + Uvicorn'],
            ['AI Model', 'YOLO11-Nano (Ultralytics)'], ['Computer Vision', 'OpenCV 4 + NumPy'],
            ['Database', 'SQLite3 (Local)'], ['Real-time Protocol', 'WebSocket (Bi-directional)'],
            ['Charting Library', 'Recharts 3'], ['Report Export', 'jsPDF + html2canvas'],
          ].map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="settings-card" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div className="section-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 className="section-title">Development Team</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {TEAM.map((m, i) => (
            <div key={i} className="team-card"
              onMouseOver={e => { e.currentTarget.style.borderColor = m.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${m.color}, ${m.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                {m.initials}
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{m.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontWeight: '500' }}>{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version footer */}
      <div className="version-bar" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="version-badge">v2.0.0</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SmartWarehouse Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Build: <strong style={{ color: 'var(--text-primary)' }}>a5d6943</strong></span>
          <span>Stack: <strong style={{ color: 'var(--text-primary)' }}>React 19 + FastAPI</strong></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            All systems operational
          </span>
        </div>
      </div>

      <DangerZone
        authToken={authToken}
        setLogs={setLogs}
        setToastMsg={setToastMsg}
        onResetSuccess={() => { setCameraUrl('0'); setThreshold(50); setNotifications(true); }}
      />

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
