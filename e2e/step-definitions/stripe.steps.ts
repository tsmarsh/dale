import { When } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';

When<DaleWorld>('I send a POST to the Stripe webhook without a tenant parameter', async function () {
  const response = await fetch(this.config.stripeWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'test' }),
  });

  this.lastResponse = {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  };
});

When<DaleWorld>(
  'I send a POST to the Stripe webhook with tenant {string} and bad signature',
  async function (tenant: string) {
    const url = `${this.config.stripeWebhookUrl}?tenant=${tenant}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'bad-signature',
      },
      body: JSON.stringify({ type: 'test' }),
    });

    this.lastResponse = {
      status: response.status,
      body: await response.text(),
      headers: response.headers,
    };
  },
);
