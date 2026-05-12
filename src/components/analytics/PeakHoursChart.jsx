import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../lib/apiClient';

const RISK_COLOR = (count, max) => {
  const pct = count / Math.max(max, 1);
  if (pct > 0.6) return '#ef4444';
  if (pct > 0.3) return '#f59e0b';
  return '#22c55e';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.value || 0;
  return (
    <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '0.625rem 0.875rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{label}</p>
      <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>{count} deteksi</p>
    </div>
  );
};

export default function PeakHoursChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getJson('/analytics/peak-hours')
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton" style={{ height: 24, width: 220 }} />
        <div className="skeleton" style={{ height: 180, width: '100%' }} />
      </div>
    );
  }
  if (!data) return null;

  const maxCount = Math.max(...(data.hourly?.map(h => h.count) || [1]), 1);
  const nightRisk = data.night_risk_pct || 0;

  return (
    <div className="card" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="panel-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <h3 className="panel-title">Analisis Jam Puncak Risiko</h3>
            <p className="panel-subtitle">Prediktif — {data.period_days} hari terakhir</p>
          </div>
        </div>

        {/* Night risk badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', borderRadius: '10px',
          backgroundColor: nightRisk > 50 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${nightRisk > 50 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
          fontSize: '0.8rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: '700', color: nightRisk > 50 ? '#ef4444' : '#f59e0b' }}>
              {nightRisk}% Malam Hari
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>18:00 – 06:00</div>
          </div>
        </div>
      </div>

      {/* Top 3 Peak Hours */}
      {data.peak_hours?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {data.peak_hours.map((p, i) => {
            const colors = ['#ef4444', '#f59e0b', '#22c55e'];
            const bgs = ['rgba(239,68,68,0.08)', 'rgba(245,158,11,0.08)', 'rgba(34,197,94,0.08)'];
            const borders = ['rgba(239,68,68,0.2)', 'rgba(245,158,11,0.2)', 'rgba(34,197,94,0.2)'];
            const ranks = ['01', '02', '03'];
            const labels = ['Paling Berbahaya', 'Kedua', 'Ketiga'];
            return (
              <div key={i} style={{
                padding: '1rem', borderRadius: '12px', textAlign: 'center',
                backgroundColor: bgs[i], border: `1px solid ${borders[i]}`,
              }}>
                <div style={{ fontWeight: '900', fontSize: '0.95rem', color: i === 0 ? HEX.danger : i === 1 ? HEX.warning : HEX.success, letterSpacing: '-0.05em', opacity: 0.6 }}>{ranks[i]}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: colors[i], letterSpacing: '-0.025em' }}>{p.hour}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '0.2rem' }}>{labels[i]}</div>
                <div style={{ fontSize: '0.75rem', color: colors[i], fontWeight: '700', marginTop: '0.25rem' }}>{p.count} deteksi</div>
              </div>
            );
          })}
          {data.peak_hours.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', backgroundColor: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              Belum cukup data historis untuk prediksi jam puncak.
            </div>
          )}
        </div>
      )}

      {/* 24-hour bar chart */}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data.hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={7}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
            tickFormatter={(v) => v.startsWith('0') || v === '06:00' || v === '12:00' || v === '18:00' || v === '23:00' ? v : ''}
            interval={0}
          />
          <YAxis tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.hourly?.map((entry, index) => (
              <Cell key={index} fill={RISK_COLOR(entry.count, maxCount)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
        {[['#ef4444', 'Risiko Tinggi'], ['#f59e0b', 'Sedang'], ['#22c55e', 'Rendah']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Zone peaks */}
      {data.zone_peaks?.length > 0 && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Prediksi Risiko Per Zona
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {data.zone_peaks.map((z) => {
              const rColor = z.risk_score > 60 ? '#ef4444' : z.risk_score > 30 ? '#f59e0b' : '#22c55e';
              return (
                <div key={z.zone} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', minWidth: 70 }}>{z.zone}</span>
                  <div style={{ flex: 1, height: 8, backgroundColor: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${z.risk_score}%`, backgroundColor: rColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: rColor, minWidth: 48, textAlign: 'right' }}>
                    Peak {z.peak_hour}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', minWidth: 50, textAlign: 'right' }}>
                    {z.total_30d} total
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
