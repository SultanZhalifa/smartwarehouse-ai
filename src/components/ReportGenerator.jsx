import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import api from '../lib/apiClient';

/* ─── Color helpers ─── */
const HEX = { danger: '#dc2626', warning: '#d97706', success: '#059669', primary: '#0f172a', secondary: '#64748b', border: '#e2e8f0' };
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};
const setColor = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setTextColor(r, g, b); };
const setFill = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setFillColor(r, g, b); };
const setDraw = (doc, hex) => { const [r, g, b] = hexToRgb(hex); doc.setDrawColor(r, g, b); };

export default function ReportGenerator({ onSuccess }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      // ── Fetch all data in parallel ──
      const [analytics, logs, modelInfo, peakHours] = await Promise.all([
        api.getJson('/analytics?time_range=weekly'),
        api.getJson('/logs'),
        api.getJson('/model-info'),
        api.getJson('/analytics/peak-hours'),
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210, PH = 297;
      const ML = 20, MR = 20;
      const CW = PW - ML - MR;
      let y = 0;

      // ════════════════════════════════
      // PAGE 1 — COVER
      // ════════════════════════════════

      // Cover gradient header
      setFill(doc, '#0f172a');
      doc.rect(0, 0, PW, 80, 'F');

      // Decorative circle
      doc.setFillColor(255, 255, 255, 0.05);
      doc.circle(190, -10, 50, 'F');
      doc.circle(10, 90, 30, 'F');

      // Logo area
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(ML, 18, 14, 14, 3, 3, 'F');
      setColor(doc, '#ffffff');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('AI', ML + 7, 26.5, { align: 'center' });

      // Title
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      setColor(doc, '#ffffff');
      doc.text('Smart Warehouse', ML + 18, 27);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      setColor(doc, '#94a3b8');
      doc.text('Bio-Hazard & Pest Detection System', ML + 18, 34);

      // Report title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      setColor(doc, '#ffffff');
      doc.text('Incident Security', ML, 56);
      doc.text('Report', ML, 67);

      // Date badge
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setFontSize(9);
      setColor(doc, '#94a3b8');
      doc.text(`Generated: ${dateStr}  •  ${now.toLocaleTimeString('id-ID')}`, ML, 76);

      y = 95;

      // ── Executive Summary box ──
      setFill(doc, '#f8fafc');
      setDraw(doc, '#e2e8f0');
      doc.roundedRect(ML, y, CW, 42, 4, 4, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, HEX.primary);
      doc.text('Executive Summary', ML + 6, y + 9);

      const totalLogs = logs.length || 0;
      const dangerCount = logs.filter(l => l.risk === 'danger').length;
      const warningCount = logs.filter(l => l.risk === 'warning').length;
      const infoCount = logs.filter(l => l.risk === 'info').length;
      const overallRisk = dangerCount > 2 ? 'TINGGI' : dangerCount > 0 ? 'SEDANG' : 'RENDAH';
      const riskColor = dangerCount > 2 ? HEX.danger : dangerCount > 0 ? HEX.warning : HEX.success;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      setColor(doc, HEX.secondary);
      const execText = `Laporan ini mencakup analisis komprehensif sistem deteksi bio-hazard & hama di gudang PT. Kawan Lama. Sistem AI YOLO11 telah memantau ${totalLogs} insiden deteksi, dengan ${dangerCount} kasus Bio-Hazard kritis yang memerlukan penanganan segera.`;
      const execLines = doc.splitTextToSize(execText, CW - 12);
      doc.text(execLines, ML + 6, y + 16);

      // Risk level badge
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(doc, riskColor);
      doc.text(`LEVEL RISIKO KESELURUHAN: ${overallRisk}`, ML + 6, y + 36);

      y += 52;

      // ── KPI Cards row ──
      const kpis = [
        { label: 'Total Deteksi', value: String(totalLogs), color: HEX.primary },
        { label: 'Bio-Hazard', value: String(dangerCount), color: HEX.danger },
        { label: 'Kontaminasi', value: String(warningCount), color: HEX.warning },
        { label: 'Monitoring', value: String(infoCount), color: HEX.success },
      ];
      const cardW = (CW - 9) / 4;
      kpis.forEach((kpi, i) => {
        const cx = ML + i * (cardW + 3);
        setFill(doc, '#ffffff');
        setDraw(doc, HEX.border);
        doc.roundedRect(cx, y, cardW, 26, 3, 3, 'FD');
        // Top color bar
        setFill(doc, kpi.color);
        doc.roundedRect(cx, y, cardW, 4, 3, 3, 'F');
        doc.rect(cx, y + 1, cardW, 3, 'F'); // square bottom corners

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        setColor(doc, kpi.color);
        doc.text(kpi.value, cx + cardW / 2, y + 17, { align: 'center' });

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        setColor(doc, HEX.secondary);
        doc.text(kpi.label, cx + cardW / 2, y + 22.5, { align: 'center' });
      });
      y += 34;

      // ── Risk Distribution ──
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      setColor(doc, HEX.primary);
      doc.text('Distribusi Risiko', ML, y + 7);
      y += 12;

      const distBars = [
        { label: 'Bio-Hazard (Snake)', count: dangerCount, color: HEX.danger },
        { label: 'Kontaminasi (Cat)', count: warningCount, color: HEX.warning },
        { label: 'Monitoring (Gecko/Lizard)', count: infoCount, color: HEX.success },
      ];
      const maxCount = Math.max(...distBars.map(d => d.count), 1);
      distBars.forEach((bar) => {
        const barW = Math.max(2, (bar.count / maxCount) * (CW - 60));
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        setColor(doc, HEX.secondary);
        doc.text(bar.label, ML, y + 4);

        setFill(doc, '#f1f5f9');
        doc.roundedRect(ML + 58, y - 0.5, CW - 60, 7, 2, 2, 'F');
        setFill(doc, bar.color);
        doc.roundedRect(ML + 58, y - 0.5, barW, 7, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        setColor(doc, bar.color);
        doc.text(String(bar.count), PW - MR - 1, y + 4, { align: 'right' });
        y += 11;
      });
      y += 8;

      // ── Hottest Zones ──
      if (analytics.zone_activity?.length) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        setColor(doc, HEX.primary);
        doc.text('Aktivitas Per Zona (30 Hari)', ML, y + 7);
        y += 13;

        const zones = [...analytics.zone_activity].sort((a, b) => b.intensity - a.intensity);
        zones.slice(0, 5).forEach((z, idx) => {
          const zBarW = Math.max(2, (z.intensity / 100) * (CW - 55));
          const zColor = z.intensity > 60 ? HEX.danger : z.intensity > 30 ? HEX.warning : HEX.success;
          const medal = ['#1', '#2', '#3', '#4', '#5'][idx];

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          setColor(doc, HEX.secondary);
          doc.text(`${medal} ${z.zone}`, ML, y + 4);

          setFill(doc, '#f1f5f9');
          doc.roundedRect(ML + 45, y - 0.5, CW - 48, 7, 2, 2, 'F');
          setFill(doc, zColor);
          doc.roundedRect(ML + 45, y - 0.5, zBarW, 7, 2, 2, 'F');

          doc.setFont('helvetica', 'bold');
          setColor(doc, zColor);
          doc.text(`${z.intensity}%`, PW - MR - 1, y + 4, { align: 'right' });
          y += 11;
        });
        y += 8;
      }

      // ════════════════════════════════
      // PAGE 2
      // ════════════════════════════════
      doc.addPage();
      y = 20;

      // ── AI Model Info ──
      setFill(doc, '#0f172a');
      doc.rect(0, 0, PW, 14, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setColor(doc, '#94a3b8');
      doc.text('Smart Warehouse  •  AI Incident Report', ML, 9);
      doc.text(`Hal. 2  •  ${dateStr}`, PW - MR, 9, { align: 'right' });

      y = 24;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      setColor(doc, HEX.primary);
      doc.text('AI Model Information', ML, y);
      y += 8;

      if (modelInfo) {
        const modelRows = [
          ['Model File', modelInfo.model_file || 'warehouse_pest.pt'],
          ['Framework', modelInfo.framework || 'Ultralytics YOLO11'],
          ['Input Resolution', modelInfo.input_size || '640px'],
          ['Classes', (modelInfo.classes || ['Snake', 'Cat', 'Gecko', 'Lizard']).join(', ')],
          ['Epochs Trained', String(modelInfo.epochs_trained || 50)],
          ['mAP@50', modelInfo.map50 != null ? `${(modelInfo.map50 * 100).toFixed(1)}%` : 'N/A'],
        ];
        modelRows.forEach(([k, v], idx) => {
          setFill(doc, idx % 2 === 0 ? '#f8fafc' : '#ffffff');
          doc.rect(ML, y, CW, 8, 'F');
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          setColor(doc, HEX.secondary);
          doc.text(k, ML + 3, y + 5.5);
          doc.setFont('helvetica', 'normal');
          setColor(doc, HEX.primary);
          doc.text(String(v), ML + 55, y + 5.5);
          y += 8;
        });
        setDraw(doc, HEX.border);
        doc.rect(ML, y - modelRows.length * 8, CW, modelRows.length * 8);
      }
      y += 10;

      // ── Peak Hours ──
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      setColor(doc, HEX.primary);
      doc.text('Analisis Jam Puncak Risiko (Predictive)', ML, y);
      y += 6;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      setColor(doc, HEX.secondary);
      doc.text(`Berdasarkan data ${peakHours.period_days || 30} hari terakhir  •  Deteksi malam hari: ${peakHours.night_risk_pct || 0}%`, ML, y);
      y += 8;

      if (peakHours.peak_hours?.length) {
        const medals = ['#1 Paling Sering', '#2 Kedua', '#3 Ketiga'];
        peakHours.peak_hours.forEach((p, i) => {
          setFill(doc, i === 0 ? '#fef2f2' : i === 1 ? '#fffbeb' : '#f0fdf4');
          setDraw(doc, i === 0 ? '#fecaca' : i === 1 ? '#fde68a' : '#bbf7d0');
          doc.roundedRect(ML + i * (CW / 3 + 1.5), y, CW / 3 - 1, 22, 3, 3, 'FD');
          const cx = ML + i * (CW / 3 + 1.5) + (CW / 3 - 1) / 2;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          setColor(doc, i === 0 ? HEX.danger : i === 1 ? HEX.warning : HEX.success);
          doc.text(p.hour, cx, y + 10, { align: 'center' });
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'normal');
          setColor(doc, HEX.secondary);
          doc.text(medals[i], cx, y + 16, { align: 'center' });
          doc.text(`${p.count} deteksi`, cx, y + 20.5, { align: 'center' });
        });
        y += 28;
      } else {
        doc.setFontSize(9);
        setColor(doc, HEX.secondary);
        doc.text('Belum cukup data historis untuk analisis peak hours.', ML, y + 6);
        y += 14;
      }

      // ── Detection Log Table ──
      y += 4;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      setColor(doc, HEX.primary);
      doc.text('Log Deteksi Terbaru (20 Terakhir)', ML, y);
      y += 8;

      // Table header
      setFill(doc, '#0f172a');
      doc.rect(ML, y, CW, 9, 'F');
      const cols = [
        { label: 'Tipe', x: ML + 3, w: 25 },
        { label: 'Risiko', x: ML + 30, w: 22 },
        { label: 'Lokasi', x: ML + 54, w: 35 },
        { label: 'Tanggal', x: ML + 91, w: 28 },
        { label: 'Waktu', x: ML + 121, w: 23 },
        { label: 'Conf.', x: ML + 146, w: 24 },
      ];
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      setColor(doc, '#ffffff');
      cols.forEach(c => doc.text(c.label, c.x, y + 6));
      y += 9;

      const recentLogs = (logs || []).slice(0, 20);
      if (recentLogs.length === 0) {
        setFill(doc, '#f8fafc');
        doc.rect(ML, y, CW, 10, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        setColor(doc, HEX.secondary);
        doc.text('Belum ada data deteksi', ML + CW / 2, y + 7, { align: 'center' });
        y += 10;
      } else {
        recentLogs.forEach((log, idx) => {
          if (y > PH - 30) { doc.addPage(); y = 20; }
          const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
          setFill(doc, rowBg);
          doc.rect(ML, y, CW, 8, 'F');

          const riskColor = log.risk === 'danger' ? HEX.danger : log.risk === 'warning' ? HEX.warning : HEX.success;
          const riskLabel = log.risk === 'danger' ? 'BIO-HAZARD' : log.risk === 'warning' ? 'KONTAMINASI' : 'MONITORING';

          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          setColor(doc, HEX.primary);
          doc.text(log.type || '', cols[0].x, y + 5.5);

          setColor(doc, riskColor);
          doc.text(riskLabel, cols[1].x, y + 5.5);

          doc.setFont('helvetica', 'normal');
          setColor(doc, HEX.secondary);
          doc.text(log.location || '', cols[2].x, y + 5.5);
          doc.text(log.date || '', cols[3].x, y + 5.5);
          doc.text(log.time || '', cols[4].x, y + 5.5);
          doc.text(log.confidence || '', cols[5].x, y + 5.5);

          // Left risk border
          setFill(doc, riskColor);
          doc.rect(ML, y, 2, 8, 'F');
          y += 8;
        });
      }

      // ── Recommendations ──
      if (y > PH - 60) { doc.addPage(); y = 20; }
      y += 8;
      setFill(doc, '#eff6ff');
      setDraw(doc, '#bfdbfe');
      doc.roundedRect(ML, y, CW, 42, 4, 4, 'FD');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      setColor(doc, '#1d4ed8');
      doc.text('Rekomendasi Tindakan', ML + 6, y + 9);

      const recs = dangerCount > 0
        ? ['Segera aktifkan Protokol Evakuasi untuk zona dengan deteksi Bio-Hazard', 'Koordinasikan dengan tim pest control untuk pembasmian ular', 'Perketat akses masuk gudang terutama pada jam puncak risiko', 'Tingkatkan frekuensi patroli manual 2x lipat sampai ancaman teratasi']
        : ['Pertahankan monitoring kamera 24/7 pada semua zona aktif', 'Lakukan inspeksi fisik mingguan di area paling aktif', 'Pastikan sistem deteksi dikalibrasi setiap 30 hari', 'Dokumentasikan setiap insiden meski level monitoring'];

      recs.forEach((rec, i) => {
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        setColor(doc, '#1d4ed8');
        doc.text(`${i + 1}. ${rec}`, ML + 6, y + 17 + i * 7);
      });
      y += 50;

      // ── Footer ──
      const footerY = PH - 15;
      setDraw(doc, HEX.border);
      doc.line(ML, footerY - 4, PW - MR, footerY - 4);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      setColor(doc, HEX.secondary);
      doc.text('Smart Warehouse AI  •  PT. Kawan Lama Surveillance System  •  Confidential', PW / 2, footerY, { align: 'center' });
      doc.text(`Digenerate otomatis pada ${dateStr} ${now.toLocaleTimeString('id-ID')}`, PW / 2, footerY + 5, { align: 'center' });

      // ── Save ──
      const filename = `Warehouse_Report_${now.toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      onSuccess?.(`Report "${filename}" berhasil digenerate!`);

    } catch (err) {
      console.error('PDF generation failed:', err);
      onSuccess?.('Gagal generate report. Pastikan data tersedia.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={loading}
      className="generate-report-btn"
      style={{ opacity: loading ? 0.7 : 1 }}
      onMouseOver={(e) => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.35)'; } }}
      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,0.25)'; }}
    >
      {loading ? (
        <>
          <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Generating PDF...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Generate PDF Report
        </>
      )}
    </button>
  );
}
