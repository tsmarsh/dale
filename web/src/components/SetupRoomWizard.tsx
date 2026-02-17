import { useState } from 'react';
import { api } from '../api/client';
import type { OnboardResponse, CreateRoomRequest } from '../api/types';

interface SetupRoomWizardProps {
  hasTenant: boolean;
  onComplete: () => void;
}

export function SetupRoomWizard({ hasTenant, onComplete }: SetupRoomWizardProps) {
  const [step, setStep] = useState(hasTenant ? 2 : 0);
  const [displayName, setDisplayName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [roomName, setRoomName] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [paypalPaymentLink, setPaypalPaymentLink] = useState('');
  const [priceDescription, setPriceDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      if (!hasTenant) {
        await api.post<OnboardResponse>('/api/tenant/onboard', {
          displayName,
          telegramBotToken: botToken,
        });
      }

      const roomReq: CreateRoomRequest = { name: roomName };
      if (paymentLink) roomReq.paymentLink = paymentLink;
      if (paypalPaymentLink) roomReq.paypalPaymentLink = paypalPaymentLink;
      if (priceDescription) roomReq.priceDescription = priceDescription;

      await api.post('/api/rooms', roomReq);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    // Step 0: Display name
    <div key="name">
      <h3>Step 1: Your display name</h3>
      <div className="form-group">
        <input
          type="text"
          placeholder="Your creator name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <button className="btn-primary" onClick={() => setStep(1)} disabled={!displayName}>
        Next
      </button>
    </div>,
    // Step 1: Bot token
    <div key="telegram">
      <h3>Step 2: Telegram Bot Token</h3>
      <p>Get this from <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a> on Telegram.</p>
      <div className="form-group">
        <input
          type="text"
          placeholder="123456:ABC-DEF..."
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn-secondary" onClick={() => setStep(0)}>Back</button>
        <button className="btn-primary" onClick={() => setStep(2)} disabled={!botToken}>Next</button>
      </div>
    </div>,
    // Step 2: Room details
    <div key="room">
      <h3>{hasTenant ? 'Create a Room' : 'Step 3: Create your first room'}</h3>
      <div className="form-group">
        <label>Room name:</label>
        <input
          type="text"
          placeholder="My Premium Room"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Stripe payment link (optional):</label>
        <input
          type="text"
          placeholder="https://buy.stripe.com/..."
          value={paymentLink}
          onChange={(e) => setPaymentLink(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>PayPal payment link (optional):</label>
        <input
          type="text"
          placeholder="https://paypal.com/..."
          value={paypalPaymentLink}
          onChange={(e) => setPaypalPaymentLink(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Price description (optional):</label>
        <input
          type="text"
          placeholder="$9.99/month"
          value={priceDescription}
          onChange={(e) => setPriceDescription(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!hasTenant && <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>}
        <button className="btn-primary" onClick={handleSubmit} disabled={!roomName || submitting}>
          {submitting ? 'Creating...' : 'Create Room'}
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>,
  ];

  return <div>{steps[step]}</div>;
}
