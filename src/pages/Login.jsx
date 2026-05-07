import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';

export default function Login() {
  const navigate = useNavigate();
  const { login: setAuthToken, authToken } = useWarehouse();
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [username, setUsername] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (authToken) navigate('/');
  }, [authToken, navigate]);

  // Clean up legacy remembered identifiers from previous versions
  useEffect(() => {
    localStorage.removeItem('sw_remembered_username');
    localStorage.removeItem('sw_remembered_email');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (mode === 'forgot') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recoveryEmail)) {
          setError('Please enter a valid email address.');
          setIsLoading(false);
          return;
        }
        const res = await fetch('/api/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: recoveryEmail })
        });
        const data = await res.json();
        if (res.ok) {
          setOtpCode(data.otp_code || '');
          setSuccessMsg('Reset code generated. Enter it below to set your new password.');
          setMode('reset');
        } else { setError(data.detail || 'Failed to send reset code.'); }
        setIsLoading(false);
        return;
      }

      if (mode === 'reset') {
        const res = await fetch('/api/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: recoveryEmail, code: resetCode, new_password: newPassword })
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

      // Login
      if (!username.trim()) {
        setError('Please enter your username.');
        setIsLoading(false);
        return;
      }
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token, data.user);
        if (data.user?.must_change_password) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Invalid username or password.');
      }
    } catch { setError('Cannot connect to server. Please ensure the backend is running.'); }
    setIsLoading(false);
  };

  return (
    <div className="login-page center-layout">
      {/* ─── Form Panel ─── */}
      <div className="login-form-panel">
        <div className="login-form-container">

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>SmartWarehouse</span>
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>PT. Kawan Lama Group</span>
            </div>
          </div>

          <div className="login-form-header">
            {mode !== 'login' && (
              <h2>
                {mode === 'forgot' ? 'Reset password' : 'Enter verification code'}
              </h2>
            )}
            <p>
              {mode === 'login'
                ? 'Sign in to access the monitoring dashboard.'
                : mode === 'forgot'
                ? 'Enter your registered recovery email to receive a reset code.'
                : 'Enter the code and your new password.'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="login-alert login-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="login-alert login-alert-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {successMsg}
            </div>
          )}

          {/* OTP Code Display */}
          {mode === 'reset' && otpCode && (
            <div className="login-alert login-alert-demo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem', opacity: 0.7 }}>Verification Code</div>
                <span style={{ fontFamily: '"Fira Code", monospace', fontWeight: '800', fontSize: '1.25rem', letterSpacing: '0.2em' }}>{otpCode}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'login' && (
              <div className="login-field">
                <label htmlFor="login-username">Username</label>
                <div className="login-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <input
                    id="login-username"
                    type="text"
                    placeholder="e.g. admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="login-field">
                <label htmlFor="login-recovery-email">Recovery Email</label>
                <div className="login-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input
                    id="login-recovery-email"
                    type="email"
                    placeholder="email@kawanlama.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="login-field">
                <div className="login-field-header">
                  <label htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    className="login-link"
                    onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="login-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="login-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div className="login-field">
                  <label htmlFor="reset-code">Verification Code</label>
                  <div className="login-input-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      id="reset-code"
                      type="text"
                      placeholder="000000"
                      value={resetCode}
                      maxLength={6}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      required
                      style={{ textAlign: 'center', letterSpacing: '0.3em', fontWeight: '700', fontFamily: '"Fira Code", monospace' }}
                    />
                  </div>
                </div>
                <div className="login-field">
                  <label htmlFor="reset-newpw">New Password</label>
                  <div className="login-input-wrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input
                      id="reset-newpw"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? (
                <div className="login-spinner" />
              ) : (
                mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset code' : 'Update password'
              )}
            </button>

            {/* Back to login */}
            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                className="login-back"
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); setOtpCode(''); }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back to sign in
              </button>
            )}
          </form>

          {/* Footer */}
          <p className="login-footer">
            Authorized personnel only. Contact IT administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
