import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarehouse } from '../context/WarehouseContext';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { authToken, user, updateUser, logout } = useWarehouse();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authToken) navigate('/login');
  }, [authToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Password change failed.');
      } else {
        setSuccess('Password changed successfully. Redirecting…');
        updateUser({ must_change_password: false });
        setTimeout(() => navigate('/'), 1200);
      }
    } catch {
      setError('Cannot reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isForced = user?.must_change_password;

  return (
    <div className="login-page center-layout">
      <div className="login-form-panel">
        <div className="login-form-container">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Change Password</span>
              <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                {isForced ? 'You must set a new password before continuing.' : 'Update your account password.'}
              </span>
            </div>
          </div>

          {error && (
            <div className="login-alert login-alert-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}
          {success && (
            <div className="login-alert login-alert-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="cp-current">Current Password</label>
              <div className="login-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input id="cp-current" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="cp-new">New Password</label>
              <div className="login-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input id="cp-new" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required autoComplete="new-password" placeholder="Min 6 characters" />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="cp-confirm">Confirm New Password</label>
              <div className="login-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input id="cp-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="Re-enter new password" />
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? <div className="login-spinner" /> : 'Update password'}
            </button>

            {!isForced && (
              <button
                type="button"
                className="login-back"
                onClick={() => navigate('/')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                Back to dashboard
              </button>
            )}
            {isForced && (
              <button
                type="button"
                className="login-back"
                onClick={() => { logout(); navigate('/login'); }}
              >
                Sign out instead
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
