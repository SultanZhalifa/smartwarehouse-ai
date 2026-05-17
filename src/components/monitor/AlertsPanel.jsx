import React from 'react';

const MAX_DISPLAY = 20; // Max alerts shown in the panel at once

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
 * AlertsPanel — sticky right column showing recent detection alerts.
 * Shows at most MAX_DISPLAY alerts with a fixed-height scrollable list.
 * Props: logs, t
 */
export default function AlertsPanel({ logs, t }) {
  const [alertFilter, setAlertFilter] = React.useState('all');
  const [dismissed, setDismissed] = React.useState(new Set()); // IDs of cleared alerts
  const listRef = React.useRef(null);

  // Filter out dismissed alerts, then apply risk filter
  const activeLogs = logs.filter(l => !dismissed.has(l.id));
  const filteredLogs = activeLogs
    .filter(l => alertFilter === 'all' || l.risk === alertFilter)
    .slice(0, MAX_DISPLAY); // Hard cap: never render more than MAX_DISPLAY items

  const handleClearAll = () => {
    setDismissed(new Set(activeLogs.map(l => l.id)));
  };

  const handleDismissOne = (id) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const getShareText = (log) => encodeURIComponent(
    `Laporan Keamanan Gudang\n\nDeteksi: ${log.type}\nRisiko: ${log.risk.toUpperCase()}\nLokasi: ${log.location}\nWaktu: ${log.time}\n\nCek dashboard SmartGuard AI segera.`
  );

  const filterButtons = [
    { key: 'all',     label: t.liveMonitor.all,     color: null },
    { key: 'danger',  label: t.liveMonitor.danger,   color: '#ef4444' },
    { key: 'warning', label: t.liveMonitor.warning,  color: '#f59e0b' },
    { key: 'info',    label: t.liveMonitor.info,     color: '#3b82f6' },
  ];

  return (
    <div
      className="card alerts-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem 1.25rem 0.75rem',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32, height: 32,
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>

        <h3 style={{ flex: 1, margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {t.liveMonitor.recentAlerts}
        </h3>

        {/* Live count badge */}
        {filteredLogs.length > 0 && (
          <span
            style={{
              background: alertFilter === 'danger' ? '#ef4444' : alertFilter === 'warning' ? '#f59e0b' : 'var(--accent-primary)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 999,
              minWidth: 22,
              textAlign: 'center',
            }}
          >
            {filteredLogs.length}{activeLogs.length > MAX_DISPLAY ? '+' : ''}
          </span>
        )}

        {/* Clear All button */}
        {activeLogs.length > 0 && (
          <button
            onClick={handleClearAll}
            title="Clear all alerts"
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              padding: '3px 8px',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Clear
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: 'flex',
          gap: '0.375rem',
          padding: '0 1.25rem 0.75rem',
          flexShrink: 0,
        }}
      >
        {filterButtons.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setAlertFilter(key)}
            style={{
              flex: 1,
              padding: '4px 0',
              border: `1px solid ${alertFilter === key ? (color || 'var(--text-primary)') : 'var(--border-color)'}`,
              borderRadius: 6,
              background: alertFilter === key ? (color || 'var(--text-primary)') : 'var(--bg-tertiary)',
              color: alertFilter === key ? '#fff' : (color || 'var(--text-secondary)'),
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Scrollable list — FIXED height, never grows ── */}
      <div
        ref={listRef}
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minHeight: 0,
          maxHeight: 420, // Hard CSS cap — panel won't grow past this
        }}
      >
        {filteredLogs.map((log) => {
          const riskColor = RISK_COLORS[log.risk] || '#3b82f6';
          const riskBg    = RISK_BGS[log.risk]    || 'rgba(59,130,246,0.08)';
          const riskLabel =
            log.risk === 'danger'  ? 'HAZARD' :
            log.risk === 'warning' ? 'WARNING' : 'INFO';

          return (
            <div
              key={log.id}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                borderLeft: `3px solid ${riskColor}`,
                background: 'var(--bg-primary)',
                padding: '0.6rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.2s',
                flexShrink: 0,
              }}
            >
              {/* Left content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    {log.type}
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px',
                      borderRadius: 4, letterSpacing: '0.05em',
                      background: riskBg, color: riskColor,
                    }}
                  >
                    {riskLabel}
                  </span>
                  {log.confidence && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {log.confidence}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {log.location}
                </div>
              </div>

              {/* Right: time + share + dismiss */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {log.time}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Telegram */}
                  <button
                    onClick={() => window.open(`https://t.me/share/url?url=http://localhost:5173&text=${getShareText(log)}`, '_blank')}
                    title="Share via Telegram"
                    style={shareBtn('#0088cc')}
                    onMouseOver={e => Object.assign(e.currentTarget.style, shareBtnHover('#0088cc'))}
                    onMouseOut={e => Object.assign(e.currentTarget.style, shareBtn('#0088cc'))}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z"/></svg>
                  </button>
                  {/* WhatsApp */}
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${getShareText(log)}`, '_blank')}
                    title="Share via WhatsApp"
                    style={shareBtn('#25d366')}
                    onMouseOver={e => Object.assign(e.currentTarget.style, shareBtnHover('#25d366'))}
                    onMouseOut={e => Object.assign(e.currentTarget.style, shareBtn('#25d366'))}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
                  </button>
                  {/* Dismiss × */}
                  <button
                    onClick={() => handleDismissOne(log.id)}
                    title="Dismiss"
                    style={{
                      ...shareBtn('#999'),
                      fontSize: '0.75rem',
                      lineHeight: 1,
                    }}
                    onMouseOver={e => Object.assign(e.currentTarget.style, shareBtnHover('#ef4444'))}
                    onMouseOut={e => Object.assign(e.currentTarget.style, shareBtn('#999'))}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredLogs.length === 0 && (
          <div
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '3rem 1rem',
              color: 'var(--text-secondary)', fontSize: '0.85rem', opacity: 0.7,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, opacity: 0.5 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {dismissed.size > 0
              ? 'Alerts cleared. New detections will appear here.'
              : (alertFilter === 'all' ? t.liveMonitor.noRecentAlerts : `No ${alertFilter} alerts`)}
          </div>
        )}
      </div>

      {/* ── Footer: overflow count ── */}
      {activeLogs.filter(l => alertFilter === 'all' || l.risk === alertFilter).length > MAX_DISPLAY && (
        <div
          style={{
            padding: '0.5rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          Showing {MAX_DISPLAY} most recent — view all in{' '}
          <a href="/detection-logs" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
            Detection Logs
          </a>
        </div>
      )}
    </div>
  );
}

// ── Style helpers ──
function shareBtn(color) {
  return {
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 5,
    color,
    width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.15s',
  };
}

function shareBtnHover(color) {
  return {
    background: color,
    border: `1px solid ${color}`,
    color: '#fff',
  };
}
