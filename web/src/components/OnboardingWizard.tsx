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
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof OnboardRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const hasStripe = !!(form.stripeSecretKey && form.stripeWebhookSecret);
  const hasPayPal = !!(form.paypalClientId && form.paypalClientSecret && form.paypalWebhookId);
  const canSubmit = form.displayName && form.telegramBotToken && (hasStripe || hasPayPal);

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
      <div className="form-group">
        <input
          type="text"
          placeholder="Your creator name"
          value={form.displayName}
          onChange={(e) => updateField('displayName', e.target.value)}
        />
      </div>
      <button className="btn-primary" onClick={() => setStep(1)} disabled={!form.displayName}>
        Next
      </button>
    </div>,
    <div key="telegram">
      <h3>Step 2: Telegram Bot Token</h3>
      <p>Get this from <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> on Telegram.</p>
      <div className="form-group">
        <input
          type="text"
          placeholder="123456:ABC-DEF..."
          value={form.telegramBotToken}
          onChange={(e) => updateField('telegramBotToken', e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
        <button className="btn-primary" onClick={() => setStep(2)} disabled={!form.telegramBotToken}>Next</button>
      </div>
    </div>,
    <div key="stripe">
      <h3>Step 3: Stripe credentials (optional)</h3>
      <p>Skip this if you only want to use PayPal.</p>
      <div className="form-group">
        <label>Secret key:</label>
        <input
          type="text"
          placeholder="sk_live_..."
          value={form.stripeSecretKey ?? ''}
          onChange={(e) => updateField('stripeSecretKey', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Webhook signing secret:</label>
        <input
          type="text"
          placeholder="whsec_..."
          value={form.stripeWebhookSecret ?? ''}
          onChange={(e) => updateField('stripeWebhookSecret', e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
        <button className="btn-secondary" onClick={() => setStep(3)}>Skip</button>
        <button className="btn-primary" onClick={() => setStep(3)} disabled={!!(form.stripeSecretKey && !form.stripeWebhookSecret)}>Next</button>
      </div>
    </div>,
    <div key="paypal">
      <h3>Step 4: PayPal credentials (optional)</h3>
      <p>Skip this if you only want to use Stripe.</p>
      <div className="form-group">
        <label>Client ID:</label>
        <input
          type="text"
          placeholder="PayPal client ID"
          value={form.paypalClientId ?? ''}
          onChange={(e) => updateField('paypalClientId', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Client secret:</label>
        <input
          type="text"
          placeholder="PayPal client secret"
          value={form.paypalClientSecret ?? ''}
          onChange={(e) => updateField('paypalClientSecret', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Webhook ID:</label>
        <input
          type="text"
          placeholder="PayPal webhook ID"
          value={form.paypalWebhookId ?? ''}
          onChange={(e) => updateField('paypalWebhookId', e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
        <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? 'Creating...' : 'Create Account'}
        </button>
      </div>
      {!canSubmit && <p className="error-text">At least one payment provider (Stripe or PayPal) is required.</p>}
      {error && <p className="error-text">{error}</p>}
    </div>,
  ];

  return <div>{steps[step]}</div>;
}
