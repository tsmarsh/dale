import { useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { api } from '../api/client';

export function SettingsPage() {
  const { tenant, loading, reload } = useTenant();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

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

      <section>
        <h2>Telegram Webhook</h2>
        <p>Re-register your bot's webhook with the platform.</p>
        <button className="btn-primary" onClick={handleRegisterWebhook} disabled={registering}>
          {registering ? 'Registering...' : 'Register Webhook'}
        </button>
        {webhookStatus && <p style={{ marginTop: '0.5rem' }}>{webhookStatus}</p>}
      </section>
    </div>
  );
}
