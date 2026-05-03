import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';

export default function Login() {
  const navigate = useNavigate();
  const { login: setAuthToken, authToken } = useWarehouse();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Live detection log state
  const [detectionLogs, setDetectionLogs] = useState([]);
  const [systemOnline, setSystemOnline] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (authToken) navigate('/');
  }, [authToken, navigate]);

  useEffect(() => {
    const saved = localStorage.getItem('sw_remembered_email');
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  // Fetch real detection logs every 5 seconds
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/public/latest-detections');
        if (res.ok) {
          const data = await res.json();
          setDetectionLogs(data);
          setSystemOnline(true);
        } else { setSystemOnline(false); }
      } catch { setSystemOnline(false); }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setSuccessMsg('');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          setOtpCode(data.otp_code || '');
          setSuccessMsg(data.message);
          setMode('reset');
        } else { setError(data.detail || 'Failed to send reset code.'); }
        setIsLoading(false);
        return;
      }

      if (mode === 'reset') {
        const res = await fetch('/api/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code: resetCode, new_password: newPassword })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMsg(data.message);
          setResetCode(''); setNewPassword(''); setOtpCode('');
          setMode('login');
        } else { setError(data.detail || 'Reset failed.'); }
        setIsLoading(false);
        return;
      }

      const endpoint = mode === 'signup' ? '/api/register' : '/api/login';
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (mode === 'signup') {
          setSuccessMsg(data.message); setMode('login'); setPassword('');
        } else {
          if (rememberMe) localStorage.setItem('sw_remembered_email', email);
          else localStorage.removeItem('sw_remembered_email');
          setAuthToken(data.token); navigate('/');
        }
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Authentication failed.');
      }
    } catch { setError('Cannot connect to server.'); }
    setIsLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '0.875rem 1rem', borderRadius: '10px',
    border: '1.5px solid transparent', outline: 'none', fontSize: '0.9rem',
    color: '#1e293b', backgroundColor: '#f1f5f9', transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  };

  const focusInput = (e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.backgroundColor = '#fff'; e.target.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'; };
  const blurInput = (e) => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = '#f1f5f9'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#f8fafc'
    }}>

      {/* ─── Left: Branding ─── */}
      <div style={{
        flex: '0 0 50%', backgroundColor: '#0f1115', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', padding: '3.5rem', position: 'relative', overflow: 'hidden'
      }}>
        {/* Subtle gradient orb */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-15%', width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)', pointerEvents: 'none'
        }} />
        
        {/* Top: wordmark */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.02em' }}>
            SmartWarehouse
          </span>
        </div>

        {/* Center: headline */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '460px' }}>
          <h1 style={{
            fontSize: '3.5rem', fontWeight: '800', color: '#f8fafc', lineHeight: 1.1,
            letterSpacing: '-0.04em', marginBottom: '1.5rem'
          }}>
            Intelligent<br />surveillance,<br />simplified.
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '2rem', fontWeight: '400' }}>
            AI-powered pest detection for modern warehouses. Real-time monitoring, smart alerts, and actionable insights — all in one platform.
          </p>

          {/* Animal Detection Log Terminal */}
          <div style={{
            backgroundColor: '#151b2b', border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px', padding: '1.25rem', marginBottom: '2.5rem',
            maxWidth: '440px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '1rem', letterSpacing: '-0.02em' }}>Animal Detection Log</span>
              <span style={{ backgroundColor: systemOnline ? '#064e3b' : '#7f1d1d', color: systemOnline ? '#34d399' : '#fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: systemOnline ? '#34d399' : '#fca5a5', animation: 'pulse 2s infinite' }} /> {systemOnline ? 'SYSTEM ACTIVE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{ fontFamily: '"Fira Code", "Courier New", monospace', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {detectionLogs.length > 0 ? (
                detectionLogs.map((log, i) => (
                  <div key={i}>
                    <span style={{ color: '#475569', marginRight: '16px' }}>{log.time}</span>
                    <span style={{ color: log.risk === 'danger' ? '#fca5a5' : log.risk === 'warning' ? '#fcd34d' : '#86efac' }}>
                      {log.type} detected
                    </span>
                    <span style={{ color: '#475569' }}> — {log.risk}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>No detections recorded yet.</div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom: credits */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>© 2026 PT. Kawan Lama</span>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Powered by YOLO11</span>
        </div>
      </div>

      {/* ─── Right: Form ─── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        background: 'radial-gradient(circle at top right, #fff7ed 0%, #fafaf9 40%, #f8fafc 100%)',
        position: 'relative'
      }}>
        {/* Soft blur element in background */}
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, background: '#fffbeb', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />

        <div style={{
          width: '100%', maxWidth: '420px', backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: '2.5rem', zIndex: 1,
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08), 0 0 20px rgba(0,0,0,0.03)',
          border: '1px solid rgba(255,255,255,0.8)'
        }}>

          {/* iOS-style Tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '20px', padding: '4px', marginBottom: '2rem' }}>
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccessMsg(''); }}
                  style={{
                    flex: 1, padding: '0.625rem 1rem', borderRadius: '16px', border: 'none',
                    backgroundColor: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? '#0f172a' : '#64748b',
                    fontWeight: mode === m ? '600' : '500', fontSize: '0.875rem',
                    boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit'
                  }}
                >{m === 'login' ? 'Log in' : 'Sign up'}</button>
              ))}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Forgot password' : 'Reset password'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {mode === 'login' ? 'Enter your credentials to continue.' : mode === 'signup' ? 'Get started with SmartWarehouse.' : mode === 'forgot' ? "Enter your email to receive a reset code." : 'Enter the verification code and new password.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '0.875rem 1rem', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', padding: '0.875rem 1rem', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #bbf7d0' }}>
              {successMsg}
            </div>
          )}
          {mode === 'reset' && otpCode && (
            <div style={{ backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '12px', fontSize: '0.875rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', color: '#0f172a' }}>
              <span style={{ color: '#64748b' }}>Your code: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '1.125rem', letterSpacing: '0.2em' }}>{otpCode}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0f172a' }}>Email</label>
              <input type="email" placeholder="manager@kawanlama.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required disabled={mode === 'reset'}
                style={{ ...inputStyle, backgroundColor: mode === 'reset' ? '#e2e8f0' : '#f1f5f9' }}
                onFocus={focusInput} onBlur={blurInput}
              />
            </div>

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#0f172a' }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                      style={{ fontSize: '0.8125rem', color: '#2563eb', background: 'none', border: 'none', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}
                    >Forgot password?</button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem'
                  }}>
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0f172a' }}>Verification code</label>
                  <input type="text" placeholder="000000" value={resetCode} maxLength={6}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} required
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontWeight: '700', fontSize: '1.25rem', fontFamily: 'monospace' }}
                    onFocus={focusInput} onBlur={blurInput}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.5rem', color: '#0f172a' }}>New password</label>
                  <input type="password" placeholder="Min 6 characters" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} required
                    style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                  />
                </div>
              </>
            )}

            {/* iOS-style Remember Me */}
            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: '500' }}>Remember me</span>
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    backgroundColor: rememberMe ? '#1d4ed8' : '#cbd5e1',
                    position: 'relative', cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff',
                    position: 'absolute', top: 2, left: rememberMe ? 22 : 2,
                    transition: 'left 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }} />
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button type="submit" disabled={isLoading}
              style={{
                width: '100%', padding: '0.875rem', marginTop: '0.5rem',
                backgroundColor: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '0.9375rem', fontWeight: '600', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.2s ease', opacity: isLoading ? 0.7 : 1, fontFamily: 'inherit',
                boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)'
              }}
              onMouseOver={(e) => { if (!isLoading) { e.currentTarget.style.backgroundColor = '#1e40af'; e.currentTarget.style.transform = 'translateY(-1px)'; }}}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(0)'; }}
              onMouseDown={(e) => { if (!isLoading) e.currentTarget.style.transform = 'translateY(1px)'; }}
            >
              {isLoading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.5s linear infinite' }} />
              ) : (
                mode === 'login' ? 'Continue' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset code' : 'Update password'
              )}
            </button>

            {(mode === 'forgot' || mode === 'reset') && (
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); setOtpCode(''); }}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'transparent', color: '#64748b', border: 'none', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}
              >← Back to log in</button>
            )}
          </form>



          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
