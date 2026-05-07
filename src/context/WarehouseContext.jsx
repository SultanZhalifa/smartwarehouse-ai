import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const WarehouseContext = createContext();

export function useWarehouse() {
  return useContext(WarehouseContext);
}

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem('sw_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function WarehouseProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem('sw_token'));
  const [user, setUser] = useState(loadStoredUser);

  const login = useCallback((token, userData) => {
    const tokenData = { token, expires: Date.now() + 86400000 }; // 24h
    localStorage.setItem('sw_token', token);
    localStorage.setItem('sw_token_meta', JSON.stringify(tokenData));
    if (userData) {
      localStorage.setItem('sw_user', JSON.stringify(userData));
      setUser(userData);
    }
    setAuthToken(token);
  }, []);

  const logout = useCallback(() => {
    const token = localStorage.getItem('sw_token');
    if (token) {
      fetch('/api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('sw_token');
    localStorage.removeItem('sw_token_meta');
    localStorage.removeItem('sw_user');
    setAuthToken(null);
    setUser(null);
    setLogs([]);
    setLogsLoaded(false);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...patch };
      localStorage.setItem('sw_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const hasRole = useCallback((...roles) => {
    return user && roles.includes(user.role);
  }, [user]);

  // On mount: check token expiry locally, then verify with server
  useEffect(() => {
    const token = localStorage.getItem('sw_token');
    const meta = localStorage.getItem('sw_token_meta');
    if (!token) return;

    if (meta) {
      try {
        const parsed = JSON.parse(meta);
        if (Date.now() > parsed.expires) {
          logout();
          return;
        }
      } catch { /* ignore */ }
    }

    fetch('/api/verify-token', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) {
          logout();
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data && data.user) {
          updateUser({ username: data.user.username, role: data.user.role });
        }
      })
      .catch(() => {
        console.warn('Could not verify token — server may be offline.');
      });
  }, [logout, updateUser]);

  // Setup WebSocket when authenticated
  useEffect(() => {
    if (!authToken) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname;
    const wsPort = window.location.port === '5173' ? '8000' : window.location.port;
    const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}/api/ws/alerts`;

    let ws;
    let reconnectTimer;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => { reconnectAttempts = 0; };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const alertId = data.id || Date.now() + Math.random();
          const newAlert = { ...data, id: alertId };

          setAlerts(prev => [...prev, newAlert]);
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== alertId));
          }, 5000);

          setLogs(prev => [newAlert, ...prev]);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectAttempts++;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => { ws.close(); };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [authToken]);

  // Initial Data Fetch
  useEffect(() => {
    if (!authToken) return;

    fetch('/api/logs', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        setLogs(data);
        setLogsLoaded(true);
      })
      .catch(() => {
        setLogsLoaded(true);
      });

    fetch('/api/settings', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Settings unavailable');
        return res.json();
      })
      .then(data => {
        if (data && data.darkMode !== undefined) {
          setDarkMode(data.darkMode);
          document.body.classList.toggle('dark-mode', data.darkMode);
        }
      })
      .catch(() => { /* ignore — backend may be offline */ });
  }, [authToken]);

  const toggleDarkMode = (isDark) => {
    setDarkMode(isDark);
    document.body.classList.toggle('dark-mode', isDark);
  };

  return (
    <WarehouseContext.Provider value={{
      alerts, logs, setLogs, logsLoaded,
      darkMode, toggleDarkMode,
      authToken, user, login, logout, updateUser, hasRole,
    }}>
      {children}
    </WarehouseContext.Provider>
  );
}
