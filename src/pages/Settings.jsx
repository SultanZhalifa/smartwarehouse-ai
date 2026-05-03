import React, { useState, useEffect } from 'react';
import { useWarehouse } from '../context/WarehouseContext';

export default function Settings() {
  const { authToken, darkMode, toggleDarkMode, setLogs } = useWarehouse();
  
  const [cameraUrl, setCameraUrl] = useState('0');
  const [threshold, setThreshold] = useState(85);
  const [notifications, setNotifications] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial settings from backend
  useEffect(() => {
    fetch('/api/settings', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.cameraUrl) setCameraUrl(data.cameraUrl);
        if (data.threshold) setThreshold(data.threshold);
        if (data.notifications !== undefined) setNotifications(data.notifications);
        // darkMode is handled globally by Context
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch settings", err);
        setIsLoading(false);
      });
  }, [authToken]);

  const handleSave = async () => {
    // Validate camera URL
    if (cameraUrl !== '0' && cameraUrl !== '1' && !cameraUrl.match(/^(rtsp|http|https):\/\//) && !cameraUrl.match(/\.(mp4|avi|mov|mkv)$/i)) {
      setToastMsg('⚠️ Camera source must be 0, 1, an RTSP/HTTP URL, or a video file path.');
      setTimeout(() => setToastMsg(''), 5000);
      return;
    }

    setIsSaving(true);
    setToastMsg('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ cameraUrl, threshold, notifications, darkMode })
      });

      if (response.ok) {
        const data = await response.json();
        setToastMsg(data.message || 'Settings saved successfully.');
        setTimeout(() => setToastMsg(''), 4000);
      } else {
        setToastMsg('⚠️ Failed to save settings. Please try again.');
        setTimeout(() => setToastMsg(''), 4000);
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      setToastMsg('⚠️ Server unreachable. Please check your connection.');
      setTimeout(() => setToastMsg(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-transition" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div className="skeleton" style={{ height: 32, width: 160, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 16, width: 320 }} />
        </div>
        <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="skeleton skeleton-circle" />
            <div className="skeleton" style={{ height: 22, width: 200 }} />
          </div>
          <div className="skeleton" style={{ height: 48, width: '100%', borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 6, width: '100%', borderRadius: 4 }} />
          <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="skeleton skeleton-circle" />
            <div className="skeleton" style={{ height: 22, width: 150 }} />
          </div>
          {[1,2].map(i => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div className="skeleton" style={{ height: 16, width: 160, marginBottom: 6 }} /><div className="skeleton" style={{ height: 12, width: 260 }} /></div>
              <div className="skeleton" style={{ height: 28, width: 50, borderRadius: 20 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      
      {toastMsg && (
        <div style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', 
          backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '1rem 1.5rem', 
          borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1000,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{toastMsg}</span>
        </div>
      )}

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Manage your system preferences and global configurations.</p>
      </div>

      <div style={{ 
        backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '2.5rem', 
        border: '1px solid var(--border-color)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', gap: '2.5rem'
      }}>
        
        {/* System Settings Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
              System Configuration
            </h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.75rem', paddingLeft: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Camera Source URL</label>
              <input 
                type="text" 
                value={cameraUrl}
                onChange={(e) => setCameraUrl(e.target.value)}
                style={{ 
                  width: '100%', padding: '0.875rem 1.25rem', borderRadius: '12px', 
                  border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.95rem', color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-primary)', transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }} 
                onFocus={(e) => { e.target.style.borderColor = 'var(--text-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--bg-tertiary)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.02)'; }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', opacity: 0.8 }}>
                Use <code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.125rem 0.375rem', borderRadius: 4, fontSize: '0.7rem' }}>0</code> for default webcam, or paste an RTSP/HTTP stream URL or local <code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.125rem 0.375rem', borderRadius: 4, fontSize: '0.7rem' }}>.mp4</code> file path.
              </p>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                  AI Confidence Threshold
                </label>
                <span style={{ backgroundColor: 'var(--bg-primary)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                  {threshold}%
                </span>
              </div>
              <input 
                type="range" 
                min="50" max="99" 
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-primary)', height: '6px', borderRadius: '4px' }} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: '500' }}>
                <span>Lenient (50%)</span>
                <span>Strict (99%)</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', width: '100%' }}></div>

        {/* Preferences Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
              Preferences
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingLeft: '1rem' }}>
            
            {/* Toggle 1 */}
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' }}
              onClick={() => setNotifications(!notifications)}
            >
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Push Notifications</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Receive alerts when critical hazards are detected.</p>
              </div>
              <div 
                style={{
                  width: '50px', height: '28px', backgroundColor: notifications ? 'var(--accent-primary)' : 'var(--border-color)',
                  borderRadius: '20px', position: 'relative', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{
                  width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%',
                  position: 'absolute', top: '2px', left: notifications ? '24px' : '2px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}></div>
              </div>
            </div>

            {/* Toggle 2 */}
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem 0' }}
              onClick={() => toggleDarkMode(!darkMode)}
            >
              <div>
                <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Dark Mode</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Enable dark theme across the entire dashboard.</p>
              </div>
              <div 
                style={{
                  width: '50px', height: '28px', backgroundColor: darkMode ? 'var(--accent-primary)' : 'var(--border-color)',
                  borderRadius: '20px', position: 'relative', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{
                  width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%',
                  position: 'absolute', top: '2px', left: darkMode ? '24px' : '2px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}></div>
              </div>
            </div>

          </div>
        </div>

        <div style={{ paddingTop: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            style={{ 
              padding: '0.875rem 2.5rem', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-secondary)', 
              border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', transition: 'all 0.2s ease',
              opacity: isSaving ? 0.7 : 1, transform: isSaving ? 'scale(0.98)' : 'scale(1)'
            }}
            onMouseOver={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(0)')}
            onMouseDown={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(0) scale(0.98)')}
            onMouseUp={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px) scale(1)')}
          >
            {isSaving ? (
              <span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            )}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>

      {/* System Architecture Section */}
      <div style={{ 
        backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '2.5rem', 
        border: '1px solid var(--border-color)', marginTop: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            System Architecture
          </h3>
        </div>

        {/* Architecture Flow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '1.5rem 0' }}>
          {[
            { name: 'Camera/Video', sub: 'OpenCV', color: '#6366f1', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
            { name: 'YOLO11 AI', sub: 'Inference', color: '#ef4444', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
            { name: 'FastAPI', sub: 'Backend', color: '#059669', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' },
            { name: 'SQLite', sub: 'Database', color: '#0ea5e9', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
            { name: 'WebSocket', sub: 'Real-time', color: '#f59e0b', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
            { name: 'React', sub: 'Dashboard', color: '#3b82f6', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
          ].map((item, i, arr) => (
            <React.Fragment key={i}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
                padding: '1rem 1.25rem', borderRadius: '14px', backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)', minWidth: '100px',
                transition: 'all 0.3s ease'
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 4px 12px ${item.color}20`; }}
                onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}></path></svg>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: '500', color: 'var(--text-secondary)' }}>{item.sub}</span>
              </div>
              {i < arr.length - 1 && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4, flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Tech Specs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            { label: 'Frontend Framework', value: 'React 19 + Vite 8' },
            { label: 'Backend Framework', value: 'FastAPI + Uvicorn' },
            { label: 'AI Model', value: 'YOLO11-Nano (Ultralytics)' },
            { label: 'Computer Vision', value: 'OpenCV 4 + NumPy' },
            { label: 'Database', value: 'SQLite3 (Local)' },
            { label: 'Real-time Protocol', value: 'WebSocket (Bi-directional)' },
            { label: 'Charting Library', value: 'Recharts 3' },
            { label: 'Report Export', value: 'jsPDF + html2canvas' },
          ].map((spec, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{spec.label}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Section */}
      <div style={{ 
        backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '2.5rem', 
        border: '1px solid var(--border-color)', marginTop: '2rem',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 10px 15px -3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
            Development Team
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          {[
            { name: 'Sultan', role: 'Scrum Master', color: '#3b82f6', initials: 'SZ' },
            { name: 'Fathir', role: 'Backend & AI Lead', color: '#ef4444', initials: 'FF' },
            { name: 'Risly', role: 'Frontend Dev', color: '#8b5cf6', initials: 'RM' },
            { name: 'Mishaandalusia', role: 'UI/UX Designer', color: '#f59e0b', initials: 'MS' },
          ].map((member, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
              padding: '1.5rem 1rem', borderRadius: '16px', backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)', transition: 'all 0.3s ease'
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = member.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${member.color}, ${member.color}88)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em'
              }}>
                {member.initials}
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{member.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontWeight: '500' }}>{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version & Uptime */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
        backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', padding: '1.25rem 1.75rem', 
        border: '1px solid var(--border-color)', marginTop: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ 
            fontSize: '0.7rem', fontWeight: '700', padding: '0.25rem 0.625rem', borderRadius: '6px',
            backgroundColor: 'rgba(34,197,94,0.1)', color: '#22c55e', letterSpacing: '0.05em'
          }}>v1.0.0</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SmartWarehouse Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Build: <strong style={{ color: 'var(--text-primary)' }}>cae9db1</strong></span>
          <span>Stack: <strong style={{ color: 'var(--text-primary)' }}>React 19 + FastAPI</strong></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
            All systems operational
          </span>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ 
        backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '2rem 2.5rem', 
        border: '1px solid rgba(239,68,68,0.2)', marginTop: '2rem',
        boxShadow: '0 4px 6px -1px rgba(239,68,68,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ef4444', margin: 0 }}>
            Danger Zone
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Clear Detection Logs</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Permanently delete all detection history from the database.</p>
            </div>
            <button style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600',
              backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
              cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
              onClick={async () => { 
                if(!confirm('⚠️ Are you sure?\n\nThis will permanently delete ALL detection logs from the database. This action cannot be undone.')) return;
                try {
                  const res = await fetch('/api/logs', { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }});
                  const data = await res.json();
                  if (res.ok) {
                    setLogs([]);
                    setToastMsg('✅ ' + (data.message || 'All logs cleared.'));
                  } else {
                    setToastMsg('⚠️ ' + (data.detail || 'Failed to clear logs.'));
                  }
                } catch { setToastMsg('⚠️ Server error. Could not clear logs.'); }
                setTimeout(() => setToastMsg(''), 4000);
              }}
            >
              Clear Logs
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Reset All Settings</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Restore camera URL, threshold, and preferences to factory defaults.</p>
            </div>
            <button style={{
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600',
              backgroundColor: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
              cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ef4444'; }}
              onClick={async () => { 
                if(!confirm('Reset all settings to factory defaults?\n\nCamera URL → 0\nThreshold → 85%\nNotifications → On\nDark Mode → Off')) return;
                try {
                  const res = await fetch('/api/settings/reset', { method: 'POST', headers: { 'Authorization': `Bearer ${authToken}` }});
                  const data = await res.json();
                  if (res.ok) {
                    setCameraUrl('0'); setThreshold(85); setNotifications(true);
                    toggleDarkMode(false);
                    setToastMsg('✅ ' + (data.message || 'Settings restored to defaults.'));
                  } else {
                    setToastMsg('⚠️ ' + (data.detail || 'Failed to reset settings.'));
                  }
                } catch { setToastMsg('⚠️ Server error. Could not reset settings.'); }
                setTimeout(() => setToastMsg(''), 4000);
              }}
            >
              Reset Settings
            </button>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
