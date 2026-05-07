import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState('');
  
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid invitation link. Missing token.');
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid invitation link.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password })
      });

      const data = await res.json();
      
      if (res.ok) {
        setSuccessMsg('Account setup complete! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      } else {
        setError(data.detail || 'Failed to setup account. The invite may have expired.');
      }
    } catch { 
      setError('Cannot connect to server.'); 
    }
    
    setIsLoading(false);
  };

  return (
    <div className="login-page center-layout">
      <div className="login-form-panel">
        <div className="login-form-container">
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>SmartWarehouse</span>
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>PT. Kawan Lama Group</span>
            </div>
          </div>

          <div className="login-form-header" style={{ textAlign: 'center' }}>
            <p>Welcome! Please complete your account setup to access the Smart Warehouse Dashboard.</p>
          </div>

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

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="name">Full Name</label>
              <div className="login-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!token || isLoading || successMsg}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Create Password</label>
              <div className="login-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!token || isLoading || successMsg}
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

            <div className="login-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="login-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="confirmPassword"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={!token || isLoading || successMsg}
                />
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={!token || isLoading || successMsg}>
              {isLoading ? <div className="login-spinner" /> : 'Complete Setup'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
