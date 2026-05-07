import React, { useState, useEffect } from 'react';
import { useWarehouse } from '../context/WarehouseContext';
import { useToast } from '../components/ToastNotification';

const RISK_FILTERS = [
  { key: 'all', label: 'All Detections' },
  { key: 'danger', label: 'Hazard' },
  { key: 'warning', label: 'Contamination' },
  { key: 'info', label: 'Monitoring' },
];

export default function DetectionLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const { logs: allLogs, logsLoaded, authToken } = useWarehouse();
  const { addToast } = useToast();
  
  // Enhanced typing animation
  const placeholders = [
    "Search 'Snake'...",
    "Filter by 'Zone A'...",
    "Try 'Cat' or 'Gecko'...",
    "Search 'danger'...",
    "Find 'Lizard'...",
  ];
  const [placeholderText, setPlaceholderText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    let timer;
    const currentPhrase = placeholders[phraseIndex];

    if (isDeleting) {
      if (placeholderText === '') {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % placeholders.length);
        timer = setTimeout(() => {}, 600); // Pause before next phrase
      } else {
        // Fast deletion with slight variation
        const deleteSpeed = 25 + Math.random() * 15;
        timer = setTimeout(() => {
          setPlaceholderText(currentPhrase.substring(0, placeholderText.length - 1));
        }, deleteSpeed);
      }
    } else {
      if (placeholderText === currentPhrase) {
        // Hold the completed phrase longer
        timer = setTimeout(() => setIsDeleting(true), 2800);
      } else {
        // Natural typing: vary speed per character, occasional micro-pauses
        const nextChar = currentPhrase[placeholderText.length];
        let typeSpeed = 60 + Math.random() * 50; // Base: 60-110ms
        
        // Slow down slightly after spaces (like a real typist)
        if (nextChar === ' ' || nextChar === "'") typeSpeed += 40;
        // Occasional micro-pause (simulates thinking)
        if (Math.random() < 0.08) typeSpeed += 120;
        
        timer = setTimeout(() => {
          setPlaceholderText(currentPhrase.substring(0, placeholderText.length + 1));
        }, typeSpeed);
      }
    }

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, phraseIndex]);

  // Build the display placeholder with cursor
  const cursorChar = showCursor ? '|' : '';
  const displayPlaceholder = searchTerm ? '' : (placeholderText + cursorChar);

  const loading = !logsLoaded;

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/logs?token=${authToken}`);
      if (!response.ok) throw new Error('Export failed');
      const csvText = await response.text();
      const today = new Date().toISOString().slice(0,10);
      const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvText);
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `warehouse-logs-${today}.csv`;
      a.click();
      addToast('CSV exported successfully!', 'info');
    } catch (err) {
      console.error('CSV export failed:', err);
      addToast('Failed to export CSV. Please try again.', 'danger');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = allLogs.filter(log => {
    const matchesSearch = log.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || log.risk === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalCount = allLogs.length;
  const dangerCount = allLogs.filter(l => l.risk === 'danger').length;
  const warningCount = allLogs.filter(l => l.risk === 'warning').length;
  const infoCount = allLogs.filter(l => l.risk === 'info').length;

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Detections', value: totalCount, color: 'var(--text-primary)' },
          { label: 'Hazard Events', value: dangerCount, color: '#ef4444' },
          { label: 'Contamination', value: warningCount, color: '#f59e0b' },
          { label: 'Monitoring', value: infoCount, color: '#22c55e' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: stat.color }}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '500px' }}>
        
        {/* Header & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Detection History</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Comprehensive log of all AI-detected entities.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px', flex: '1 1 auto' }}>
              <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input 
                type="text" 
                placeholder={displayPlaceholder || "Search..."} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                  borderRadius: '12px', border: '1px solid var(--border-color)',
                  outline: 'none', fontSize: '0.875rem', color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-primary)', transition: 'all 0.2s ease',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--text-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--bg-tertiary)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
              />
            </div>
            <button onClick={handleExportCSV} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
          {RISK_FILTERS.map(filter => (
            <button 
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              style={{
                padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: '600',
                background: 'none', border: 'none', cursor: 'pointer',
                color: activeFilter === filter.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeFilter === filter.key ? '2px solid var(--text-primary)' : '2px solid transparent',
                transition: 'all 0.2s ease', marginBottom: '-1px',
              }}
            >
              {filter.label}
              {filter.key !== 'all' && (
                <span style={{ 
                  marginLeft: '0.375rem', fontSize: '0.7rem', 
                  padding: '0.1rem 0.375rem', borderRadius: '6px',
                  backgroundColor: 'var(--bg-tertiary)'
                }}>
                  {filter.key === 'danger' ? dangerCount : filter.key === 'warning' ? warningCount : infoCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Data Grid */}
        <div style={{ 
          border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                Loading detection logs...
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Animal Type</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Level</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date & Time</th>
                    <th style={{ padding: '1rem 1.5rem', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr 
                      key={log.id} 
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s ease', cursor: 'pointer' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>{log.type}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={`alert-badge alert-${log.risk}`}>
                          <span className="status-dot"></span>
                          {log.risk === 'danger' ? 'HAZARD' : log.risk === 'info' ? 'MONITORING' : 'CONTAMINATION'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{log.location}</td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{log.date}</span>
                          <span style={{ fontSize: '0.75rem' }}>{log.time}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: log.confidence, backgroundColor: 'var(--accent-primary)', borderRadius: '3px' }}></div>
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>{log.confidence}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                          <svg width="80" height="80" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="60" cy="60" r="55" stroke="var(--border-color)" strokeWidth="2" strokeDasharray="6 4" />
                            <circle cx="60" cy="60" r="35" fill="var(--bg-tertiary)" />
                            <path d="M50 55L55 60L70 45" stroke="var(--text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                            <circle cx="60" cy="55" r="12" stroke="var(--text-secondary)" strokeWidth="1.5" opacity="0.4" />
                            <line x1="69" y1="64" x2="80" y2="75" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
                            <circle cx="42" cy="38" r="3" fill="var(--border-color)" opacity="0.5">
                              <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="82" cy="42" r="2" fill="var(--border-color)" opacity="0.3">
                              <animate attributeName="opacity" values="0.3;0.1;0.3" dur="4s" repeatCount="indefinite" />
                            </circle>
                            <circle cx="38" cy="78" r="2.5" fill="var(--border-color)" opacity="0.4">
                              <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3.5s" repeatCount="indefinite" />
                            </circle>
                          </svg>
                          <div style={{ maxWidth: '300px' }}>
                            <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 0.375rem 0' }}>No detections found</p>
                            <p style={{ fontSize: '0.825rem', margin: 0, lineHeight: 1.5 }}>
                              {searchTerm ? `No results matching "${searchTerm}". Try a different keyword.` : activeFilter !== 'all' ? 'No entries match this filter. Try selecting a different category.' : 'Start the AI camera to begin real-time bio-hazard detection.'}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 0.25rem' }}>
          <span>Showing {filteredLogs.length} of {totalCount} records</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
