import React, { useState, useEffect, useRef } from 'react';
import { useWarehouse } from '../context/WarehouseContext';
import { useToast } from '../components/ToastNotification';
import CameraGrid from '../components/CameraGrid';
import StatCards from '../components/monitor/StatCards';
import VideoFeedPanel from '../components/monitor/VideoFeedPanel';
import AlertsPanel from '../components/monitor/AlertsPanel';
import EnvironmentPanel from '../components/monitor/EnvironmentPanel';
import { useT } from '../hooks/useT';
import api from '../lib/apiClient';

export default function LiveMonitor() {
  const { logs: allLogs } = useWarehouse();
  const { addToast } = useToast();
  const t = useT();

  const [status, setStatus] = useState('Loading...');
  const [aiData, setAiData] = useState({ speed: 'Idle', model: 'YOLO11' });
  const [activeZones, setActiveZones] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const prevLogCountRef = useRef(allLogs.length);
  const isCameraOnRef = useRef(false);

  // ── Toggle Zone A camera ──────────────────────────────────────
  const toggleCamera = async (turnOn) => {
    try {
      const res = await api.post('/cameras/zone-a/toggle', { state: turnOn });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Server error');
      }
      setIsCameraOn(turnOn);
      isCameraOnRef.current = turnOn;
    } catch (err) {
      console.error('Failed to toggle camera', err);
      addToast(turnOn ? t.liveMonitor.failedStart : t.liveMonitor.failedStop, 'danger');
    }
  };

  // ── Sync Zone A state from server ────────────────────────────
  useEffect(() => {
    const syncZoneA = async () => {
      try {
        const zones = await api.getJson('/cameras');
        const a = zones.find(z => z.id === 'zone-a');
        if (a) {
          const live = a.status === 'live';
          setIsCameraOn(live);
          isCameraOnRef.current = live;
        }
      } catch { /* ignore */ }
    };
    syncZoneA();
    const interval = setInterval(syncZoneA, 4000);
    return () => clearInterval(interval);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isCameraOnRef.current) {
        navigator.sendBeacon?.(
          '/api/cameras/zone-a/toggle',
          new Blob([JSON.stringify({ state: false })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isCameraOnRef.current) toggleCamera(false);
    };
  }, []);

  // ── Poll system status ────────────────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await api.getJson('/status');
        setStatus(data.status || 'Active');
        setAiData({
          speed: (data.ai_performance?.inference_time || 0) > 0
            ? data.ai_performance.inference_time + 'ms'
            : 'Idle',
          model: data.ai_performance?.model || 'YOLO11',
        });
        setActiveZones(data.active_zones || []);
      } catch { setStatus('Offline'); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Toast on new detection (dedup + cooldown) ────────────────
  const lastToastTimeRef = React.useRef({}); // risk -> timestamp
  useEffect(() => {
    if (allLogs.length > prevLogCountRef.current && prevLogCountRef.current > 0) {
      const newLog = allLogs[0];
      const toastType = newLog.risk === 'danger' ? 'danger' : newLog.risk === 'warning' ? 'warning' : 'info';
      const now = Date.now();
      const cooldown = toastType === 'danger' ? 8000 : 12000; // danger: 8s, warning/info: 12s
      const lastTime = lastToastTimeRef.current[toastType] || 0;

      // Only show toast if enough time has passed since last toast of same risk level
      if (now - lastTime > cooldown) {
        lastToastTimeRef.current[toastType] = now;
        addToast(
          `${newLog.type} detected at ${newLog.location} (${newLog.confidence})`,
          toastType
        );
        setLastUpdated(new Date());
      }
    }
    prevLogCountRef.current = allLogs.length;
  }, [allLogs.length]);


  const logs = allLogs.slice(0, 50);

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <StatCards
        status={status}
        activeZones={activeZones}
        totalLogs={allLogs.length}
        aiData={aiData}
        lastUpdated={lastUpdated}
        t={t}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Top Row: Video Feed & Alerts */}
        <div className="grid-layout" style={{ alignItems: 'stretch' }}>
          <VideoFeedPanel
            isCameraOn={isCameraOn}
            status={status}
            onToggle={toggleCamera}
            t={t}
          />
          <AlertsPanel logs={logs} t={t} />
        </div>

        {/* Bottom Row: Multi-zone grid & Environment */}
        <div className="grid-layout" style={{ alignItems: 'start' }}>
          <CameraGrid />
          <EnvironmentPanel />
        </div>
      </div>
    </div>
  );
}
