import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

/* ─── Inline SVG Icon Components ─── */
const Icons = {
  target: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  barChart: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  ),
  checkCircle: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  search: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  cpu: (color) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>
  ),
  zap: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  award: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
  ),
  maximize: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
  ),
  // Animal icons
  snake: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19c0-3 2-5 5-5h4c3 0 5-2 5-5V7"/><path d="M18 4l2 3-2 3"/><circle cx="6" cy="19" r="1" fill={color || 'currentColor'}/></svg>
  ),
  cat: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c4.97 0 9-3.58 9-8V5l-4 2-5-3-5 3-4-2v9c0 4.42 4.03 8 9 8z"/><circle cx="9.5" cy="11" r="1" fill={color || 'currentColor'}/><circle cx="14.5" cy="11" r="1" fill={color || 'currentColor'}/><path d="M10 16c.5.5 1.5 1 2 1s1.5-.5 2-1"/></svg>
  ),
  lizard: (color) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 8c-2 0-3 1-3 3v2c0 1-1 2-3 2H9"/><path d="M6 15c-1.5 0-3 .5-3 2s1.5 2 3 2"/><circle cx="19" cy="5" r="2"/><path d="M9 15l-3 4"/><path d="M9 15l3 4"/></svg>
  ),
};

/* ─── Count-Up Animation Hook ─── */
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const animRef = useRef(null);
  const prevTarget = useRef(0);

  useEffect(() => {
    // Only animate if target actually changed to a valid number
    if (target === prevTarget.current || typeof target !== 'number' || target <= 0) return;
    prevTarget.current = target;

    // Small delay to ensure component is mounted
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(parseFloat((eased * target).toFixed(2)));
        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        }
      };
      animRef.current = requestAnimationFrame(animate);
    }, 50);

    return () => {
      clearTimeout(timeout);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration]);

  return count;
}

/* ─── Animated Metric Card ─── */
function MetricCard({ label, targetValue, desc, color, iconFn }) {
  const displayValue = useCountUp(targetValue);
  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>{label}</span>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {iconFn(color)}
        </div>
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '800', color, letterSpacing: '-0.025em', lineHeight: 1 }}>{displayValue}%</div>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{desc}</span>
    </div>
  );
}


export default function AIPerformance() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState(null);

  useEffect(() => {
    fetch('/api/model-info')
      .then(res => res.json())
      .then(data => {
        setModelInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
        <div className="skeleton" style={{ height: 32, width: 280 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton-card" style={{ minHeight: 120 }}><div className="skeleton" style={{ height: 60 }} /></div>)}
        </div>
        <div className="skeleton-card" style={{ minHeight: 300 }}><div className="skeleton" style={{ height: 260 }} /></div>
      </div>
    );
  }

  if (error || !modelInfo || modelInfo.status === 'no_model') {
    return (
      <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '400px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: '600' }}>No AI Model Loaded</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 400 }}>
          The YOLO model is not currently loaded. Please ensure <code>warehouse_pest.pt</code> or <code>yolo11n.pt</code> is available in the backend directory.
        </p>
      </div>
    );
  }

  const training = modelInfo.training;
  const metrics = training?.final_metrics;
  const artifacts = modelInfo.artifacts || [];

  const metricCards = metrics ? [
    { label: 'mAP@50', targetValue: metrics.mAP50, desc: 'Mean Average Precision', color: '#22c55e', iconFn: Icons.target },
    { label: 'mAP@50-95', targetValue: metrics.mAP50_95, desc: 'Strict mAP', color: '#3b82f6', iconFn: Icons.barChart },
    { label: 'Precision', targetValue: metrics.precision, desc: 'True Positive Rate', color: '#a855f7', iconFn: Icons.checkCircle },
    { label: 'Recall', targetValue: metrics.recall, desc: 'Detection Coverage', color: '#f59e0b', iconFn: Icons.search },
  ] : [];

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>AI Model Performance</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Custom-trained YOLO11 model metrics and training analytics</p>
      </div>

      {/* Model Info Banner */}
      <div className="card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icons.cpu('#ffffff')}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)' }}>{modelInfo.model_file || 'YOLO Model'}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {modelInfo.framework} &middot; {modelInfo.base_model} &middot; {modelInfo.num_classes} classes &middot; {modelInfo.model_size_mb} MB
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {modelInfo.class_names?.map((cls, i) => (
            <span key={i} style={{
              padding: '0.375rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700',
              backgroundColor: cls === 'snake' ? 'var(--alert-danger-bg)' : cls === 'cat' ? 'var(--alert-warning-bg)' : 'rgba(34,197,94,0.15)',
              color: cls === 'snake' ? 'var(--alert-danger)' : cls === 'cat' ? 'var(--alert-warning)' : '#22c55e',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>{cls}</span>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {metricCards.map((m, i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      )}

      {/* Training Info Bar */}
      {training && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              {Icons.zap()}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>{training.epochs_trained}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Epochs Trained</div>
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              {Icons.award()}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>Epoch {training.best_epoch}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Best mAP@50</div>
            </div>
          </div>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
              {Icons.maximize()}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>{modelInfo.input_resolution}px</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Training Resolution</div>
            </div>
          </div>
        </div>
      )}

      {/* Training Curves */}
      {training?.training_curve && (
        <div className="grid-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* mAP Curve */}
          <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>mAP Over Training</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={training.training_curve} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mapGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="map95Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="epoch" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="mAP50" name="mAP@50" stroke="#22c55e" fill="url(#mapGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="mAP50_95" name="mAP@50-95" stroke="#3b82f6" fill="url(#map95Grad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Loss Curve */}
          <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Validation Loss</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={training.training_curve} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis dataKey="epoch" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="val_box_loss" name="Box Loss" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="val_cls_loss" name="Class Loss" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Training Artifacts Gallery */}
      {artifacts.length > 0 && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Training Artifacts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {artifacts.map((a) => (
              <button
                key={a.key}
                onClick={() => setActiveArtifact(activeArtifact === a.key ? null : a.key)}
                style={{
                  padding: '0.75rem', borderRadius: '12px',
                  border: activeArtifact === a.key ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                  backgroundColor: activeArtifact === a.key ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{a.label}</span>
              </button>
            ))}
          </div>
          
          {/* Artifact Viewer */}
          {activeArtifact && (
            <div style={{ marginTop: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: '#0a0a0a' }}>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {artifacts.find(a => a.key === activeArtifact)?.label}
                </span>
                <button onClick={() => setActiveArtifact(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <img
                src={`/api/training-artifacts/${activeArtifact}`}
                alt={activeArtifact}
                style={{ width: '100%', display: 'block', maxHeight: '600px', objectFit: 'contain', padding: '1rem', backgroundColor: '#ffffff' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Risk Classification Reference */}
      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Detection Class Mapping</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[
            { cls: 'Snake', risk: 'DANGER', color: 'var(--alert-danger)', bg: 'var(--alert-danger-bg)', action: 'Immediate zone evacuation', iconFn: Icons.snake },
            { cls: 'Cat', risk: 'WARNING', color: 'var(--alert-warning)', bg: 'var(--alert-warning-bg)', action: 'Contamination alert + cleanup', iconFn: Icons.cat },
            { cls: 'Gecko / Lizard', risk: 'MONITOR', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', action: 'Log entry + inspect zone', iconFn: Icons.lizard },
          ].map((item, i) => (
            <div key={i} style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: item.bg, border: `1px solid ${item.color}22`, display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.iconFn(item.color)}
              </div>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{item.cls}</div>
                <span style={{ fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '6px', backgroundColor: item.color, color: '#fff' }}>{item.risk}</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0', lineHeight: 1.4 }}>{item.action}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
