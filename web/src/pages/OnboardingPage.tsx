import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWizard } from '../components/OnboardingWizard';
import type { OnboardResponse } from '../api/types';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<OnboardResponse | null>(null);

  function handleComplete(res: OnboardResponse) {
    setResult(res);
  }

  if (result) {
    return (
      <div>
        <h1>Account Created!</h1>
        <p>Your tenant ID: <code>{result.tenantId}</code></p>
        <p>Telegram webhook: {result.webhookRegistered ? 'Registered' : 'Not registered'}</p>
        <p>
          Stripe webhook URL: <code>{result.stripeWebhookUrl}</code><br />
          <small>Add this URL in your Stripe dashboard under Webhooks.</small>
        </p>
        <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Set up your account</h1>
      <OnboardingWizard onComplete={handleComplete} />
    </div>
  );
}
