import React, { useState, useEffect } from 'react';
import { useWarehouse } from '../context/WarehouseContext';
import { useToast } from '../components/ToastNotification';
import { useT } from '../hooks/useT';
import LogsTable from '../components/logs/LogsTable';
import SnapshotModal from '../components/logs/SnapshotModal';
import api from '../lib/apiClient';

/* ─── Animated search placeholder hook ─── */
function useTypingPlaceholder(phrases) {
  const [text, setText] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursor(v => !v), 530);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const phrase = phrases[phraseIdx];
    let timer;
    if (deleting) {
      if (text === '') { setDeleting(false); setPhraseIdx(i => (i + 1) % phrases.length); return; }
      timer = setTimeout(() => setText(phrase.substring(0, text.length - 1)), 25 + Math.random() * 15);
    } else {
      if (text === phrase) { timer = setTimeout(() => setDeleting(true), 2800); return; }
      let speed = 60 + Math.random() * 50;
      if (phrase[text.length] === ' ') speed += 40;
      if (Math.random() < 0.08) speed += 120;
      timer = setTimeout(() => setText(phrase.substring(0, text.length + 1)), speed);
    }
    return () => clearTimeout(timer);
  }, [text, deleting, phraseIdx]);

  return text + (cursor ? '|' : '');
}

export default function DetectionLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [snapshotModal, setSnapshotModal] = useState(null);
  const { logs: allLogs, logsLoaded } = useWarehouse();
  const { addToast } = useToast();
  const t = useT();

  const placeholder = useTypingPlaceholder([
    "Search 'Snake'...", "Filter by 'Zone A'...", "Try 'Cat' or 'Gecko'...",
    "Search 'danger'...", "Find 'Lizard'...",
  ]);

  const RISK_FILTERS = [
    { key: 'all', label: t.detectionLogs.allDetections },
    { key: 'danger', label: t.detectionLogs.hazard },
    { key: 'warning', label: t.detectionLogs.contamination },
    { key: 'info', label: t.detectionLogs.monitoring },
  ];

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // /export/logs auth uses ?token= query param (can't send headers on blob downloads)
      const token = localStorage.getItem('sw_token') || '';
      const res = await fetch(`/api/export/logs?token=${token}`);
      if (!res.ok) throw new Error('Export failed');
      const csvText = await res.text();
      const today = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvText);
      a.download = `warehouse-logs-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast(t.detectionLogs.exportSuccess, 'info');
    } catch {
      addToast(t.detectionLogs.exportFailed, 'danger');
    } finally { setIsExporting(false); }
  };

  const filteredLogs = allLogs.filter(log => {
    const matchSearch = log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (activeFilter === 'all' || log.risk === activeFilter);
  });

  const counts = {
    total: allLogs.length,
    danger: allLogs.filter(l => l.risk === 'danger').length,
    warning: allLogs.filter(l => l.risk === 'warning').length,
    info: allLogs.filter(l => l.risk === 'info').length,
  };

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: t.detectionLogs.totalDetections, value: counts.total, color: 'var(--text-primary)' },
          { label: t.detectionLogs.hazardEvents, value: counts.danger, color: '#ef4444' },
          { label: t.detectionLogs.contamination, value: counts.warning, color: '#f59e0b' },
          { label: t.detectionLogs.monitoring, value: counts.info, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            <span style={{ fontSize: '1.75rem', fontWeight: '700', color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '500px' }}>

        {/* Header & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{t.detectionLogs.detectionHistory}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t.detectionLogs.comprehensiveLog}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '280px', flex: '1 1 auto' }}>
              <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                placeholder={searchTerm ? '' : placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                onFocus={(e) => { e.target.style.borderColor = 'var(--text-secondary)'; e.target.style.boxShadow = '0 0 0 3px var(--bg-tertiary)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.02)'; }}
              />
            </div>
            <button onClick={handleExportCSV} disabled={isExporting} className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {t.detectionLogs.exportCSV}
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {RISK_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer', color: activeFilter === f.key ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeFilter === f.key ? '2px solid var(--text-primary)' : '2px solid transparent', transition: 'all 0.2s ease', marginBottom: '-1px' }}
            >
              {f.label}
              {f.key !== 'all' && (
                <span style={{ marginLeft: '0.375rem', fontSize: '0.7rem', padding: '0.1rem 0.375rem', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)' }}>
                  {f.key === 'danger' ? counts.danger : f.key === 'warning' ? counts.warning : counts.info}
                </span>
              )}
            </button>
          ))}
        </div>

        <LogsTable
          logs={filteredLogs}
          loading={!logsLoaded}
          onSnapshotClick={setSnapshotModal}
          t={t}
        />

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 0.25rem' }}>
          <span>{t.detectionLogs.showing} {filteredLogs.length} {t.detectionLogs.of} {counts.total} {t.detectionLogs.records}</span>
          <span>{t.detectionLogs.lastUpdated} {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <SnapshotModal src={snapshotModal} onClose={() => setSnapshotModal(null)} />
    </div>
  );
}
