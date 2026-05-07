import React, { useState } from 'react';

const ZONES = [
  { id: 'A', label: 'Zone A', x: 5, y: 5, w: 44, h: 43, desc: 'Main Warehouse - Primary Storage', camera: true },
  { id: 'B', label: 'Zone B', x: 51, y: 5, w: 44, h: 43, desc: 'Storage Area - Secondary Goods', camera: true },
  { id: 'C', label: 'Zone C', x: 5, y: 52, w: 44, h: 43, desc: 'Loading Dock - Entry/Exit Point', camera: true },
  { id: 'D', label: 'Zone D', x: 51, y: 52, w: 44, h: 43, desc: 'Entrance Gate - Access Control', camera: true },
];

export default function WarehouseZoneMap({ zoneData = [], recentLogs = [] }) {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const getZoneIntensity = (zoneId) => {
    const zone = zoneData.find(z => z.zone === `Zone ${zoneId}`);
    return zone ? zone.intensity : 0;
  };

  const getZoneColor = (zoneId) => {
    const intensity = getZoneIntensity(zoneId);
    if (intensity > 70) return { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#ef4444' };
    if (intensity > 40) return { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#f59e0b' };
    return { bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', text: '#22c55e' };
  };

  const getZoneLogs = (zoneId) => {
    return recentLogs.filter(log => log.location && log.location.includes(`Zone ${zoneId}`)).slice(0, 3);
  };

  const getStatusLabel = (intensity) => {
    if (intensity > 70) return 'HIGH ALERT';
    if (intensity > 40) return 'MODERATE';
    return 'CLEAR';
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Warehouse Zone Map</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Interactive floor plan with real-time threat visualization.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', fontWeight: '600' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#22c55e' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span> CLEAR
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#f59e0b' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span> MODERATE
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#ef4444' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span> HIGH ALERT
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedZone ? '2fr 1fr' : '1fr', gap: '1.5rem', transition: 'all 0.3s ease' }}>
        
        {/* SVG Floor Plan */}
        <div style={{ 
          position: 'relative', backgroundColor: 'var(--bg-primary)', borderRadius: '16px', 
          border: '1px solid var(--border-color)', padding: '1.5rem', minHeight: '360px'
        }}>
          <svg viewBox="0 0 100 100" width="100%" style={{ borderRadius: '12px' }}>
            {/* Grid lines */}
            {[...Array(11)].map((_, i) => (
              <React.Fragment key={`grid-${i}`}>
                <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="var(--border-color)" strokeWidth="0.15" strokeDasharray="1,1" opacity="0.5" />
                <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="var(--border-color)" strokeWidth="0.15" strokeDasharray="1,1" opacity="0.5" />
              </React.Fragment>
            ))}

            {/* Warehouse outer wall */}
            <rect x="3" y="3" width="94" height="94" rx="2" fill="none" stroke="var(--text-secondary)" strokeWidth="0.5" strokeDasharray="2,1" opacity="0.4" />

            {/* Zone Blocks */}
            {ZONES.map(zone => {
              const colors = getZoneColor(zone.id);
              const intensity = getZoneIntensity(zone.id);
              const isHovered = hoveredZone === zone.id;
              const isSelected = selectedZone === zone.id;

              return (
                <g 
                  key={zone.id}
                  onMouseEnter={() => setHoveredZone(zone.id)} 
                  onMouseLeave={() => setHoveredZone(null)}
                  onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Zone fill */}
                  <rect 
                    x={zone.x} y={zone.y} width={zone.w} height={zone.h} rx="1.5"
                    fill={colors.bg}
                    stroke={colors.border}
                    strokeWidth={isHovered || isSelected ? "0.6" : "0.3"}
                    opacity={isHovered || isSelected ? 1 : 0.8}
                    style={{ transition: 'all 0.3s ease' }}
                  />

                  {/* Pulse ring for high alert */}
                  {intensity > 70 && (
                    <circle cx={zone.x + zone.w / 2} cy={zone.y + zone.h / 2} r="6" 
                      fill="none" stroke="#ef4444" strokeWidth="0.3" opacity="0.5">
                      <animate attributeName="r" from="4" to="10" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Zone label */}
                  <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 - 4} textAnchor="middle" 
                    fill={colors.text} fontSize="4" fontWeight="700" fontFamily="Inter, sans-serif">
                    {zone.label}
                  </text>

                  {/* Status */}
                  <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 2} textAnchor="middle" 
                    fill="var(--text-secondary)" fontSize="2" fontWeight="500" fontFamily="Inter, sans-serif">
                    {getStatusLabel(intensity)}
                  </text>

                  {/* Intensity % */}
                  <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 6} textAnchor="middle" 
                    fill="var(--text-secondary)" fontSize="2" fontFamily="Inter, sans-serif" opacity="0.7">
                    {intensity}% Activity
                  </text>

                  {/* Camera icon */}
                  {zone.camera && (
                    <g transform={`translate(${zone.x + zone.w - 5}, ${zone.y + 2})`}>
                      <circle cx="1.5" cy="1.5" r="2" fill={colors.border} opacity="0.2" />
                      <circle cx="1.5" cy="1.5" r="0.8" fill={colors.border} />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Center crosshair */}
            <line x1="50" y1="48" x2="50" y2="52" stroke="var(--text-secondary)" strokeWidth="0.2" opacity="0.3" />
            <line x1="48" y1="50" x2="52" y2="50" stroke="var(--text-secondary)" strokeWidth="0.2" opacity="0.3" />
          </svg>
        </div>

        {/* Zone Detail Panel (slides in when zone is selected) */}
        {selectedZone && (
          <div style={{ 
            backgroundColor: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)',
            padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                Zone {selectedZone}
              </h4>
              <button onClick={() => setSelectedZone(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                fontSize: '1.25rem', lineHeight: 1
              }}>x</button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              {ZONES.find(z => z.id === selectedZone)?.desc}
            </p>

            {/* Threat Level */}
            <div style={{ 
              padding: '0.75rem', borderRadius: '10px', 
              backgroundColor: getZoneColor(selectedZone).bg,
              border: `1px solid ${getZoneColor(selectedZone).border}30`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Threat Level</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: getZoneColor(selectedZone).text }}>
                  {getStatusLabel(getZoneIntensity(selectedZone))}
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${getZoneIntensity(selectedZone)}%`, height: '100%', 
                  backgroundColor: getZoneColor(selectedZone).border,
                  borderRadius: '3px', transition: 'width 0.5s ease'
                }}></div>
              </div>
            </div>

            {/* Camera Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Camera</span>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: '600', 
                padding: '0.2rem 0.5rem', borderRadius: '6px',
                backgroundColor: ZONES.find(z => z.id === selectedZone)?.camera ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)',
                color: ZONES.find(z => z.id === selectedZone)?.camera ? '#22c55e' : 'var(--text-secondary)'
              }}>
                {ZONES.find(z => z.id === selectedZone)?.camera ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Recent Detections in this Zone */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Recent Detections</span>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {getZoneLogs(selectedZone).length > 0 ? getZoneLogs(selectedZone).map(log => (
                  <div key={log.id} style={{
                    padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem'
                  }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.type}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{log.time}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0.5rem 0' }}>No recent detections.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
