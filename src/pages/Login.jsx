import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';

export default function Login() {
  const navigate = useNavigate();
  const { login: setAuthToken } = useWarehouse();
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
  const [demoCode, setDemoCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('sw_remembered_email');
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'forgot') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          setDemoCode(data.demo_code || '');
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
          setResetCode(''); setNewPassword(''); setDemoCode('');
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
    width: '100%', padding: '0.875rem 1rem', borderRadius: '8px',
    border: '1px solid #e5e5e5', outline: 'none', fontSize: '0.875rem',
    color: '#0a0a0a', backgroundColor: '#fff', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    fontFamily: 'inherit'
  };

  const focusInput = (e) => { e.target.style.borderColor = '#0a0a0a'; e.target.style.boxShadow = '0 0 0 1px #0a0a0a'; };
  const blurInput = (e) => { e.target.style.borderColor = '#e5e5e5'; e.target.style.boxShadow = 'none'; };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: '#fafafa'
    }}>

      {/* ─── Left: Branding ─── */}
      <div style={{
        flex: '0 0 50%', backgroundColor: '#0a0a0a', display: 'flex', flexDirection: 'column',
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
          <span style={{ fontSize: '1.125rem', fontWeight: '700', color: '#fafafa', letterSpacing: '-0.03em' }}>
            SmartWarehouse
          </span>
        </div>

        {/* Center: headline */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '420px' }}>
          <h1 style={{
            fontSize: '3rem', fontWeight: '800', color: '#fafafa', lineHeight: 1.1,
            letterSpacing: '-0.04em', marginBottom: '1.5rem'
          }}>
            Intelligent<br />surveillance,<br />simplified.
          </h1>
          <p style={{ fontSize: '1.0625rem', color: '#737373', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            AI-powered pest detection for modern warehouses. Real-time monitoring, smart alerts, and actionable insights — all in one platform.
          </p>

          {/* Metrics */}
          <div style={{ display: 'flex', gap: '3rem' }}>
            {[
              { value: '99.2%', label: 'Detection accuracy' },
              { value: '<50ms', label: 'Inference speed' },
              { value: '24/7', label: 'Monitoring' },
            ].map((m, i) => (
              <div key={i}>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fafafa', letterSpacing: '-0.03em' }}>{m.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#525252', fontWeight: '500', marginTop: '0.25rem' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: credits */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#404040' }}>© 2026 PT. Kawan Lama</span>
          <span style={{ fontSize: '0.75rem', color: '#404040' }}>Powered by YOLO11</span>
        </div>
      </div>

      {/* ─── Right: Form ─── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Tabs */}
          {(mode === 'login' || mode === 'signup') && (
            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2.5rem', borderBottom: '1px solid #e5e5e5' }}>
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccessMsg(''); }}
                  style={{
                    padding: '0.625rem 0', marginBottom: '-1px', border: 'none', borderBottom: `2px solid ${mode === m ? '#0a0a0a' : 'transparent'}`,
                    backgroundColor: 'transparent', color: mode === m ? '#0a0a0a' : '#a3a3a3',
                    fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', marginRight: '1.5rem',
                    transition: 'all 0.15s ease', fontFamily: 'inherit'
                  }}
                >{m === 'login' ? 'Log in' : 'Sign up'}</button>
              ))}
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0a0a0a', marginBottom: '0.375rem', letterSpacing: '-0.025em' }}>
              {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Forgot password' : 'Reset password'}
            </h2>
            <p style={{ color: '#737373', fontSize: '0.875rem' }}>
              {mode === 'login' ? 'Enter your credentials to continue.' : mode === 'signup' ? 'Get started with SmartWarehouse.' : mode === 'forgot' ? "Enter your email to receive a reset code." : 'Enter the verification code and new password.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '0.75rem 0.875rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.25rem', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{ backgroundColor: '#f0fdf4', color: '#15803d', padding: '0.75rem 0.875rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.25rem', border: '1px solid #bbf7d0' }}>
              {successMsg}
            </div>
          )}
          {mode === 'reset' && demoCode && (
            <div style={{ backgroundColor: '#fafafa', padding: '0.75rem 0.875rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1.25rem', border: '1px solid #e5e5e5', color: '#0a0a0a' }}>
              <span style={{ color: '#737373' }}>Your code: </span>
              <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '1.125rem', letterSpacing: '0.2em' }}>{demoCode}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem', color: '#0a0a0a' }}>Email</label>
              <input type="email" placeholder="you@company.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required disabled={mode === 'reset'}
                style={{ ...inputStyle, backgroundColor: mode === 'reset' ? '#f5f5f5' : '#fff' }}
                onFocus={focusInput} onBlur={blurInput}
              />
            </div>

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#0a0a0a' }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                      style={{ fontSize: '0.8125rem', color: '#737373', background: 'none', border: 'none', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                    >Forgot password?</button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#a3a3a3', padding: '0.25rem'
                  }}>
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem', color: '#0a0a0a' }}>Verification code</label>
                  <input type="text" placeholder="000000" value={resetCode} maxLength={6}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} required
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.3em', fontWeight: '700', fontSize: '1.25rem', fontFamily: 'monospace' }}
                    onFocus={focusInput} onBlur={blurInput}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', marginBottom: '0.375rem', color: '#0a0a0a' }}>New password</label>
                  <input type="password" placeholder="Min 6 characters" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} required
                    style={inputStyle} onFocus={focusInput} onBlur={blurInput}
                  />
                </div>
              </>
            )}

            {mode === 'login' && (
              <label onClick={() => setRememberMe(!rememberMe)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', color: '#525252', userSelect: 'none' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${rememberMe ? '#0a0a0a' : '#d4d4d4'}`,
                  backgroundColor: rememberMe ? '#0a0a0a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease', flexShrink: 0
                }}>
                  {rememberMe && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                Remember me
              </label>
            )}

            <button type="submit" disabled={isLoading}
              style={{
                width: '100%', padding: '0.875rem', marginTop: '0.5rem',
                backgroundColor: '#0a0a0a', color: '#fafafa', border: 'none', borderRadius: '8px',
                fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem',
                transition: 'all 0.15s ease', opacity: isLoading ? 0.6 : 1, fontFamily: 'inherit'
              }}
              onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = '#262626'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0a0a0a'; }}
            >
              {isLoading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.5s linear infinite' }} />
              ) : (
                mode === 'login' ? 'Continue' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send code' : 'Reset password'
              )}
            </button>

            {(mode === 'forgot' || mode === 'reset') && (
              <button type="button" onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); setDemoCode(''); }}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'transparent', color: '#737373', border: 'none', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}
              >← Back to log in</button>
            )}
          </form>

          {/* Footer */}
          <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.75rem', color: '#a3a3a3' }}>
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
