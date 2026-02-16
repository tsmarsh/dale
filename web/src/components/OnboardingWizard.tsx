import { useState } from 'react';
import { api } from '../api/client';
import type { OnboardRequest, OnboardResponse } from '../api/types';

interface OnboardingWizardProps {
  onComplete: (result: OnboardResponse) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardRequest>({
    displayName: '',
    telegramBotToken: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof OnboardRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<OnboardResponse>('/api/tenant/onboard', form);
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    <div key="name">
      <h3>Step 1: Your display name</h3>
      <input
        type="text"
        placeholder="Your creator name"
        value={form.displayName}
        onChange={(e) => updateField('displayName', e.target.value)}
        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
      />
      <button onClick={() => setStep(1)} disabled={!form.displayName} style={{ marginTop: '1rem' }}>
        Next
      </button>
    </div>,
    <div key="telegram">
      <h3>Step 2: Telegram Bot Token</h3>
      <p>Get this from <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> on Telegram.</p>
      <input
        type="text"
        placeholder="123456:ABC-DEF..."
        value={form.telegramBotToken}
        onChange={(e) => updateField('telegramBotToken', e.target.value)}
        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
      />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setStep(0)}>Back</button>
        <button onClick={() => setStep(2)} disabled={!form.telegramBotToken}>Next</button>
      </div>
    </div>,
    <div key="stripe">
      <h3>Step 3: Stripe credentials</h3>
      <label>
        Secret key:
        <input
          type="text"
          placeholder="sk_live_..."
          value={form.stripeSecretKey}
          onChange={(e) => updateField('stripeSecretKey', e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', marginBottom: '0.5rem' }}
        />
      </label>
      <label>
        Webhook signing secret:
        <input
          type="text"
          placeholder="whsec_..."
          value={form.stripeWebhookSecret}
          onChange={(e) => updateField('stripeWebhookSecret', e.target.value)}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
        />
      </label>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => setStep(1)}>Back</button>
        <button onClick={handleSubmit} disabled={!form.stripeSecretKey || !form.stripeWebhookSecret || submitting}>
          {submitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
      {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
    </div>,
  ];

  return <div>{steps[step]}</div>;
}
