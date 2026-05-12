import React from 'react';

const RISK_COLORS = {
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};
const RISK_BGS = {
  danger: 'rgba(239,68,68,0.08)',
  warning: 'rgba(245,158,11,0.08)',
  info: 'rgba(59,130,246,0.08)',
};

/**
 * AlertsPanel — sticky right column showing recent detection alerts
 * Props: logs, t
 */
export default function AlertsPanel({ logs, t }) {
  const [alertFilter, setAlertFilter] = React.useState('all');
  const [newAlertIds, setNewAlertIds] = React.useState(new Set());

  const filteredLogs = logs.filter(l => alertFilter === 'all' || l.risk === alertFilter);

  const getShareText = (log) => encodeURIComponent(
    `Laporan Keamanan Gudang\n\nSistem baru saja mendeteksi adanya aktivitas atau objek di area pantauan.\n\nTipe Deteksi: ${log.type}\nTingkat Risiko: ${log.risk.toUpperCase()}\nLokasi: ${log.location}\nWaktu Kejadian: ${log.time}\n\nMohon segera lakukan pengecekan pada dashboard Smart Warehouse.`
  );

  const filterButtons = [
    { key: 'all', label: t.liveMonitor.all, icon: null },
    { key: 'danger', label: t.liveMonitor.danger, color: '#ef4444', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    { key: 'warning', label: t.liveMonitor.warning, color: '#f59e0b', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { key: 'info', label: t.liveMonitor.info, color: '#3b82f6', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> },
  ];

  return (
    <div className="card alerts-panel">
      {/* Header */}
      <div className="alerts-header">
        <div className="panel-icon" style={{ padding: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <h3 className="panel-title" style={{ flex: 1 }}>{t.liveMonitor.recentAlerts}</h3>
        <span className="count-badge">{filteredLogs.length}</span>
      </div>

      {/* Filter bar */}
      <div className="alerts-filter-bar">
        {filterButtons.map(({ key, label, icon, color }) => (
          <button
            key={key}
            onClick={() => setAlertFilter(key)}
            className="filter-chip"
            style={{
              backgroundColor: alertFilter === key ? (color || 'var(--text-primary)') : 'var(--bg-tertiary)',
              color: alertFilter === key ? '#fff' : (color || 'var(--text-secondary)'),
              border: alertFilter === key ? `1px solid ${color || 'var(--text-primary)'}` : '1px solid var(--border-color)',
            }}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="alerts-list custom-scrollbar">
        {filteredLogs.map((log) => {
          const isNew = newAlertIds.has(log.id);
          const riskColor = RISK_COLORS[log.risk] || '#3b82f6';
          const riskBg = RISK_BGS[log.risk] || 'rgba(59,130,246,0.08)';
          const riskLabel = log.risk === 'danger' ? t.liveMonitor.hazard : log.risk === 'warning' ? t.liveMonitor.warning.toUpperCase() : t.liveMonitor.monitoring;

          return (
            <div
              key={log.id}
              className="alert-item"
              style={{
                backgroundColor: isNew ? riskBg : 'var(--bg-primary)',
                border: isNew ? `1px solid ${riskColor}` : '1px solid var(--border-color)',
                borderLeft: `3px solid ${riskColor}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="alert-item-header">
                  <h4 className="alert-type">{log.type}</h4>
                  <span className="risk-chip" style={{ backgroundColor: riskBg, color: riskColor, border: `1px solid ${riskColor}40` }}>
                    {riskLabel}
                  </span>
                  {log.confidence && <span className="alert-confidence">{log.confidence}</span>}
                </div>
                <p className="alert-location">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {log.location}
                </p>
              </div>
              <div className="alert-item-meta">
                <span className="alert-time">{log.time}</span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    onClick={() => window.open(`https://t.me/share/url?url=http://localhost:5173&text=${getShareText(log)}`, '_blank')}
                    className="share-btn" style={{ borderColor: '#0088cc', color: '#0088cc' }}
                    title={t.liveMonitor.shareTelegram}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0088cc'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#0088cc'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"/></svg>
                  </button>
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${getShareText(log)}`, '_blank')}
                    className="share-btn" style={{ borderColor: '#25d366', color: '#25d366' }}
                    title={t.liveMonitor.shareWhatsApp}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#25d366'; e.currentTarget.style.color = 'white'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#25d366'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="alerts-empty" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', opacity: 0.8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.75rem', opacity: 0.5 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {alertFilter === 'all' ? t.liveMonitor.noRecentAlerts : t.liveMonitor.noFilterAlerts?.replace('{filter}', alertFilter)}
          </div>
        )}
      </div>
    </div>
  );
}
