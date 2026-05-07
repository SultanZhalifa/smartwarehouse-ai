import React, { useState, useEffect, useCallback } from 'react';
import { useWarehouse } from '../context/WarehouseContext';

const ROLE_OPTIONS = [
  { value: 'admin',    label: 'Admin' },
  { value: 'manager',  label: 'Manager' },
  { value: 'operator', label: 'Operator' },
];

const ROLE_COLOR = {
  admin:    '#dc2626',
  manager:  '#2563eb',
  operator: '#059669',
};

export default function UserManagement() {
  const { authToken, user: currentUser } = useWarehouse();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetResult, setResetResult] = useState(null); // { username, temp_password }
  const [inviteResult, setInviteResult] = useState(null); // { invite_link }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const apiFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...(options.headers || {}),
      },
    });
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      throw new Error((data && data.detail) || `Request failed (${res.status})`);
    }
    return data;
  }, [authToken]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/api/users');
      setUsers(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' });
      showToast(`User ${u.username} deleted.`);
      loadUsers();
    } catch (e) {
      showToast(`Error: ${e.message}`);
    }
  };

  const handleResetPassword = async (u) => {
    if (!window.confirm(`Reset password for "${u.username}"? They will be forced to set a new one on next login.`)) return;
    try {
      const data = await apiFetch(`/api/users/${u.id}/reset-password`, { method: 'POST' });
      setResetResult({ username: u.username, temp_password: data.temp_password });
      loadUsers();
    } catch (e) {
      showToast(`Error: ${e.message}`);
    }
  };

  return (
    <div className="page-transition" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '2rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '1rem 1.5rem',
          borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          fontSize: '0.875rem', fontWeight: '500', zIndex: 1000,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>{toast}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Manage warehouse staff accounts, roles, and access.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setShowInvite(true)} style={btnSecondary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            Invite via Link
          </button>
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--alert-danger-bg)', color: 'var(--alert-danger)', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: '600' }}>
          {error}
        </div>
      )}

      <div style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: '20px',
        border: '1px solid var(--border-color)', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <th style={th}>Username</th>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Role</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span className="spinner-sm" />
                    <span>Loading users…</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && !error && (
              <tr>
                <td colSpan={6} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <div>
                      <p style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>No users yet</p>
                      <p style={{ fontSize: '0.8125rem', margin: 0, maxWidth: '320px' }}>Click <strong>Add User</strong> or <strong>Invite User</strong> above to get started.</p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {!loading && users.map(u => {
              const isSelf = currentUser && u.username === currentUser.username;
              return (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={td}>
                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{u.username}</span>
                    {isSelf && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '999px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: '600' }}>YOU</span>}
                  </td>
                  <td style={td}>{u.name}</td>
                  <td style={{ ...td, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                  <td style={td}>
                    <span style={{
                      display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '999px',
                      fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em',
                      backgroundColor: `${ROLE_COLOR[u.role]}20`, color: ROLE_COLOR[u.role],
                    }}>{u.role}</span>
                  </td>
                  <td style={td}>
                    {u.must_change_password ? (
                      <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '600' }}>Pending password change</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: '600' }}>Active</span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingUser(u)} style={btnGhost} title="Edit">Edit</button>
                      <button onClick={() => handleResetPassword(u)} style={btnGhost} title="Reset Password">Reset PW</button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={isSelf}
                        style={{ ...btnGhostDanger, opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                        title={isSelf ? "You can't delete your own account" : "Delete"}
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reset password result modal */}
      {resetResult && (
        <Modal onClose={() => { setResetResult(null); }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Temporary password generated</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Share this temporary password with <strong>{resetResult.username}</strong>. They will be required to change it on next login.
          </p>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <code style={{ fontFamily: '"Fira Code", monospace', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{resetResult.temp_password}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(resetResult.temp_password); showToast('Copied!'); }}
              style={btnGhost}
            >Copy</button>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setResetResult(null)} style={btnPrimary}>Done</button>
          </div>
        </Modal>
      )}

      {/* Invite result modal */}
      {inviteResult && (
        <Modal onClose={() => setInviteResult(null)}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Invitation link generated</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Share this link with the new user. It is valid for 3 days.
          </p>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <code style={{ fontFamily: '"Fira Code", monospace', fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{inviteResult.invite_link}</code>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteResult.invite_link); showToast('Copied!'); }}
              style={btnGhost}
            >Copy</button>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setInviteResult(null)} style={btnPrimary}>Done</button>
          </div>
        </Modal>
      )}

      {/* Create User modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={async (form) => {
            try {
              await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(form) });
              showToast(`User ${form.username} created.`);
              setShowCreate(false);
              loadUsers();
            } catch (e) {
              throw e;
            }
          }}
        />
      )}

      {/* Invite User modal */}
      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onInvite={async (form) => {
            try {
              const data = await apiFetch('/api/invite-user', { method: 'POST', body: JSON.stringify(form) });
              setShowInvite(false);
              setInviteResult({ invite_link: data.invite_link });
            } catch (e) {
              throw e;
            }
          }}
        />
      )}

      {/* Edit User modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isSelf={currentUser && editingUser.username === currentUser.username}
          onClose={() => setEditingUser(null)}
          onSave={async (patch) => {
            try {
              await apiFetch(`/api/users/${editingUser.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
              showToast('User updated.');
              setEditingUser(null);
              loadUsers();
            } catch (e) {
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───
function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '2rem',
        maxWidth: '500px', width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
        border: '1px solid var(--border-color)',
      }}>{children}</div>
    </div>
  );
}

function CreateUserModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ username: '', name: '', email: '', role: 'operator', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      await onCreate(form);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Add new user</h3>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Username" value={form.username} onChange={v => setForm({ ...form, username: v })} required />
        <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
        <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
        <SelectField label="Role" value={form.role} onChange={v => setForm({ ...form, role: v })} options={ROLE_OPTIONS} />
        <Field label="Initial Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
        {err && <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--alert-danger-bg)', color: 'var(--alert-danger)', fontSize: '0.85rem' }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? 'Creating…' : 'Create user'}</button>
        </div>
      </form>
    </Modal>
  );
}

function InviteUserModal({ onClose, onInvite }) {
  const [form, setForm] = useState({ username: '', email: '', role: 'operator' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    try {
      await onInvite(form);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Invite via link</h3>
      <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Generate a one-time setup link. The user will pick their own password when accepting.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Username" value={form.username} onChange={v => setForm({ ...form, username: v })} required />
        <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
        <SelectField label="Role" value={form.role} onChange={v => setForm({ ...form, role: v })} options={ROLE_OPTIONS} />
        {err && <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--alert-danger-bg)', color: 'var(--alert-danger)', fontSize: '0.85rem' }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? 'Generating…' : 'Generate link'}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, isSelf, onClose, onSave }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErr('');
    const patch = {};
    if (form.name !== user.name) patch.name = form.name;
    if (form.email !== user.email) patch.email = form.email;
    if (form.role !== user.role) patch.role = form.role;
    if (Object.keys(patch).length === 0) {
      setErr('No changes to save.');
      setSubmitting(false);
      return;
    }
    try {
      await onSave(patch);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Edit user — {user.username}</h3>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
        <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
        <SelectField label="Role" value={form.role} onChange={v => setForm({ ...form, role: v })} options={ROLE_OPTIONS} disabled={isSelf} hint={isSelf ? "You can't change your own role." : null} />
        {err && <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--alert-danger-bg)', color: 'var(--alert-danger)', fontSize: '0.85rem' }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} style={btnGhost}>Cancel</button>
          <button type="submit" disabled={submitting} style={btnPrimary}>{submitting ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  );
}

function Field({ label, type = 'text', value, onChange, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        style={{
          width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
          border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.9rem',
          color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, disabled, hint }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
          border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.9rem',
          color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)',
          boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0 0' }}>{hint}</p>}
    </div>
  );
}

// ─── Style constants ───
const th = {
  padding: '1rem 1.25rem', textAlign: 'left',
  fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--text-secondary)',
};
const td = { padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' };

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.625rem 1.25rem', backgroundColor: 'var(--text-primary)',
  color: 'var(--bg-primary)', border: 'none', borderRadius: '10px',
  fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
};
const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
  padding: '0.625rem 1.25rem', backgroundColor: 'transparent',
  color: 'var(--text-primary)', border: '1px solid var(--border-color)',
  borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
};
const btnGhost = {
  padding: '0.4rem 0.75rem', backgroundColor: 'transparent',
  color: 'var(--text-primary)', border: '1px solid var(--border-color)',
  borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
};
const btnGhostDanger = {
  padding: '0.4rem 0.75rem', backgroundColor: 'transparent',
  color: 'var(--alert-danger)', border: '1px solid var(--alert-danger)',
  borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
};
