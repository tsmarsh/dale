import { useState, useEffect } from 'react';
import { useTenant } from '../hooks/useTenant';
import { api } from '../api/client';
import type { InviteResponse, AdminUser } from '../api/types';

export function SettingsPage() {
  const { tenant, loading, reload } = useTenant();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const result = await api.get<AdminUser[]>('/api/admin/users');
      setUsers(result);
    } catch {
      // ignore — endpoint may not be available
    } finally {
      setLoadingUsers(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!tenant) return <p>No tenant found.</p>;

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/api/tenant', { displayName: displayName || tenant!.displayName });
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterWebhook() {
    setRegistering(true);
    try {
      const result = await api.post<{ registered: boolean }>('/api/tenant/register-webhook');
      setWebhookStatus(result.registered ? 'Webhook registered successfully' : 'Webhook registration failed');
    } catch {
      setWebhookStatus('Failed to register webhook');
    } finally {
      setRegistering(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteStatus(null);
    try {
      const result = await api.post<InviteResponse>('/api/admin/invite', { email: inviteEmail });
      setInviteStatus(`Invited ${result.email}`);
      setInviteEmail('');
      await loadUsers();
    } catch (err: any) {
      setInviteStatus(err.message ?? 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  }

  return (
    <div>
      <h1>Settings</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Profile</h2>
        <p>Tenant ID: <code>{tenant.tenantId}</code></p>
        <div className="form-group">
          <label>Display Name:</label>
          <input
            type="text"
            value={displayName || tenant.displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Telegram Webhook</h2>
        <p>Re-register your bot's webhook with the platform.</p>
        <button className="btn-primary" onClick={handleRegisterWebhook} disabled={registering}>
          {registering ? 'Registering...' : 'Register Webhook'}
        </button>
        {webhookStatus && <p style={{ marginTop: '0.5rem' }}>{webhookStatus}</p>}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Invite User</h2>
        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={inviting}>
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
        {inviteStatus && <p style={{ marginTop: '0.5rem' }}>{inviteStatus}</p>}
      </section>

      <section>
        <h2>Platform Users</h2>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email}>
                  <td style={{ padding: '0.5rem' }}>{u.email}</td>
                  <td style={{ padding: '0.5rem' }}>{u.status}</td>
                  <td style={{ padding: '0.5rem' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
