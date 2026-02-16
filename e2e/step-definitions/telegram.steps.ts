import { When } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';

When<DaleWorld>('I send a POST to the Telegram webhook without a secret', async function () {
  const response = await fetch(this.config.telegramWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ update_id: 1 }),
  });

  this.lastResponse = {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  };
});

When<DaleWorld>(
  'I send a POST to the Telegram webhook with secret {string}',
  async function (secret: string) {
    const response = await fetch(this.config.telegramWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-bot-api-secret-token': secret,
      },
      body: JSON.stringify({ update_id: 1 }),
    });

    this.lastResponse = {
      status: response.status,
      body: await response.text(),
      headers: response.headers,
    };
  },
);
