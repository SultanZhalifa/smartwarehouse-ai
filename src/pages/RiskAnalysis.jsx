import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useWarehouse } from '../context/WarehouseContext';
import WarehouseZoneMap from '../components/WarehouseZoneMap';
import { useToast } from '../components/ToastNotification';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export default function RiskAnalysis() {
  const { authToken, logs: recentLogs } = useWarehouse();
  const { addToast } = useToast();
  const [trendData, setTrendData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeRange, setActiveRange] = useState('weekly');
  const [trendLoading, setTrendLoading] = useState(false);
  const reportRef = useRef(null);

  const fetchAnalytics = (range = 'weekly', isInitial = false) => {
    if (!authToken) return;
    if (!isInitial) setTrendLoading(true);

    let retries = 0;
    const maxRetries = 3;

    const doFetch = () => {
      fetch(`/api/analytics?time_range=${range}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
        .then(res => {
          if (!res.ok) throw new Error('Server error');
          return res.json();
        })
        .then(data => {
          if (data.detail) throw new Error(data.detail);
          setTrendData(data.trend);
          setDistributionData(data.distribution);
          setZoneData(data.zone_activity);
          setLoading(false);
          setTrendLoading(false);
          setFetchError(false);
        })
        .catch(err => {
          console.error("Error fetching analytics:", err);
          retries++;
          if (retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000;
            setTimeout(doFetch, delay);
          } else {
            setLoading(false);
            setTrendLoading(false);
            setFetchError(true);
          }
        });
    };

    doFetch();
  };

  useEffect(() => {
    fetchAnalytics('weekly', true);
  }, [authToken]);

  const handleRangeChange = (range) => {
    setActiveRange(range);
    fetchAnalytics(range);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#111111',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      if (pdfHeight > pageHeight) {
        let position = 0;
        let remaining = canvas.height;
        const pageCanvasHeight = (pageHeight * canvas.width) / pdfWidth;
        
        while (remaining > 0) {
          const sliceHeight = Math.min(remaining, pageCanvasHeight);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, position, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          
          const pageImg = pageCanvas.toDataURL('image/jpeg', 0.85);
          const slicePdfH = (sliceHeight * pdfWidth) / canvas.width;
          
          if (position > 0) pdf.addPage();
          pdf.addImage(pageImg, 'JPEG', 0, 0, pdfWidth, slicePdfH);
          
          position += sliceHeight;
          remaining -= sliceHeight;
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
      
      // Use data URI to download with proper filename
      const pdfBase64 = pdf.output('datauristring');
      const a = document.createElement('a');
      a.href = pdfBase64;
      a.download = `SmartWarehouse-ExecutiveSummary-${new Date().toISOString().slice(0,10)}.pdf`;
      a.click();
      addToast('PDF report exported successfully!', 'info');
    } catch (err) {
      console.error('PDF Export failed:', err);
      addToast('Failed to generate PDF. Please try again.', 'danger');
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ height: 32, width: 250 }} />
          <div className="skeleton" style={{ height: 40, width: 160, borderRadius: 10 }} />
        </div>
        <div className="skeleton-card">
          <div className="skeleton skeleton-text" style={{ width: '90%' }} />
          <div className="skeleton skeleton-text medium" />
          <div className="skeleton skeleton-text short" />
        </div>
        <div className="skeleton-card">
          <div className="skeleton skeleton-title" />
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50, flex: 1 }} />)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="skeleton-card" style={{ minHeight: 200 }}><div className="skeleton" style={{ height: '100%', minHeight: 160 }} /></div>
          <div className="skeleton-card" style={{ minHeight: 200 }}><div className="skeleton" style={{ height: '100%', minHeight: 160 }} /></div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '400px', textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Failed to load analytics</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>The server may be temporarily unavailable.</p>
        <button className="btn" onClick={() => { setLoading(true); setFetchError(false); fetchAnalytics('weekly', true); }} style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', fontWeight: '600', marginTop: '0.5rem' }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      
      {/* Header with PDF Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Executive Summary</h2>
        </div>
        <button 
          onClick={handleExportPDF} 
          disabled={exporting}
          className="btn"
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)',
            border: 'none', fontWeight: '600', padding: '0.625rem 1.25rem',
            opacity: exporting ? 0.6 : 1, cursor: exporting ? 'wait' : 'pointer'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exporting ? 'Generating PDF...' : 'Download Report'}
        </button>
      </div>

      {/* Report Content (captured for PDF) */}
      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

        {/* Executive Summary Text */}
        <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <p>
            This <strong>Bio-Hazard & Pest Detection</strong> report provides a comprehensive risk mitigation analysis for PT. Kawan Lama's large-scale warehouse operations. By leveraging an automated AI surveillance system (YOLO Object Detection), we monitor the integrity of goods and ensure the safety of workers from wild animal disturbances that escape manual monitoring. 
          </p>
          <p style={{ marginTop: '0.75rem' }}>
            The system categorizes detections into <strong>High Risk (Safety/Bio-Hazards)</strong> such as Snakes, and <strong>Medium Risk (Contamination)</strong> such as Cats and Geckos. The analytics below reflect real-time intelligence gathered across all warehouse zones, seamlessly triggering the Rapid Response Protocols defined at the end of this report.
          </p>
        </div>

        {/* Risk Matrix Table */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Risk Assessment Matrix</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Threat Type</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Severity</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Likelihood</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Risk Score</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>Response</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Snake', cat: 'Bio-Hazard', severity: 'Critical', likelihood: 'Low', score: 'HIGH', scoreColor: '#ef4444', response: 'Evacuate zone immediately' },
                  { type: 'Cat', cat: 'Contamination', severity: 'Moderate', likelihood: 'High', score: 'MEDIUM', scoreColor: '#f59e0b', response: 'Log & dispatch cleanup' },
                  { type: 'Gecko/Lizard', cat: 'Contamination', severity: 'Low', likelihood: 'High', score: 'LOW', scoreColor: '#22c55e', response: 'Monitor & log entry' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{row.type}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.cat}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.severity}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{row.likelihood}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '6px',
                        backgroundColor: `${row.scoreColor}20`, color: row.scoreColor
                      }}>{row.score}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{row.response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-layout" style={{ gridTemplateColumns: '1fr 1fr' }}>
          
          {/* Detection Trend Chart with Range Toggle */}
          <div className="card" style={{ height: '420px', display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                Detection Trend
              </h3>
              <div style={{ 
                display: 'flex', gap: '2px', backgroundColor: 'var(--bg-primary)', 
                borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)'
              }}>
                {[
                  { key: 'daily', label: 'Daily' },
                  { key: 'weekly', label: 'Weekly' },
                  { key: 'monthly', label: 'Monthly' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleRangeChange(opt.key)}
                    disabled={trendLoading}
                    style={{
                      padding: '0.375rem 0.875rem',
                      fontSize: '0.75rem',
                      fontWeight: activeRange === opt.key ? '700' : '500',
                      color: activeRange === opt.key ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      backgroundColor: activeRange === opt.key ? 'var(--text-primary)' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: trendLoading ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {trendLoading && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: 'var(--bg-secondary)', opacity: 0.8, borderRadius: '8px', zIndex: 2
                }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Loading...</span>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.5} />
                  <XAxis 
                    dataKey="name" axisLine={false} tickLine={false} 
                    tick={{ fontSize: activeRange === 'monthly' ? 9 : 12, fill: 'var(--text-secondary)' }} 
                    dy={10}
                    interval={activeRange === 'monthly' ? 2 : activeRange === 'daily' ? 1 : 0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
                  <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px', color: 'var(--text-secondary)' }} />
                  <Bar dataKey="Gecko" stackId="a" fill="var(--alert-success)" radius={[0, 0, 4, 4]} barSize={activeRange === 'monthly' ? 12 : 28} />
                  <Bar dataKey="Cat" stackId="a" fill="var(--alert-warning)" />
                  <Bar dataKey="Snake" stackId="a" fill="var(--alert-danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Distribution Chart */}
          <div className="card" style={{ height: '420px', display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>Risk Distribution</h3>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={90}
                    outerRadius={130}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' }} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Warehouse Zone Map */}
        <WarehouseZoneMap zoneData={zoneData} recentLogs={recentLogs} />
        
        {/* Mitigation Protocol */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Rapid Response Protocols</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            
            {/* Snake Protocol */}
            <div style={{ 
              padding: '1.5rem', borderLeft: '4px solid var(--alert-danger)', 
              backgroundColor: 'var(--bg-primary)', borderRadius: '12px',
              border: '1px solid var(--border-color)', borderLeftWidth: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--alert-danger-bg)', borderRadius: '8px', color: 'var(--alert-danger)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Bio-Hazard (Snakes)</h4>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>1.</strong> Immediately halt all operations in the affected zone.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>2.</strong> Sound the area alarm and activate zone lockdown.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>3.</strong> Notify the animal control unit and on-site supervisor.</p>
                <p style={{ margin: '0' }}><strong>4.</strong> Do not attempt manual removal. Wait for professional handler.</p>
              </div>
            </div>

            {/* Cat Protocol */}
            <div style={{ 
              padding: '1.5rem', borderLeft: '4px solid var(--alert-warning)', 
              backgroundColor: 'var(--bg-primary)', borderRadius: '12px',
              border: '1px solid var(--border-color)', borderLeftWidth: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--alert-warning-bg)', borderRadius: '8px', color: 'var(--alert-warning)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Contamination (Cats)</h4>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>1.</strong> Log the entry point and timestamp of detection.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>2.</strong> Dispatch maintenance crew to the affected zone.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>3.</strong> Inspect for potential goods contamination or damage.</p>
                <p style={{ margin: '0' }}><strong>4.</strong> Clean and sanitize the area before resuming operations.</p>
              </div>
            </div>

            {/* Gecko Protocol */}
            <div style={{ 
              padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)', 
              backgroundColor: 'var(--bg-primary)', borderRadius: '12px',
              border: '1px solid var(--border-color)', borderLeftWidth: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Monitoring (Geckos)</h4>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>1.</strong> Record the detection event in the monitoring log.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>2.</strong> Identify and seal the entry point if possible.</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>3.</strong> Schedule periodic inspection of the zone.</p>
                <p style={{ margin: '0' }}><strong>4.</strong> No immediate operational disruption required.</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
