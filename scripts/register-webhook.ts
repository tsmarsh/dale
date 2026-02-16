#!/usr/bin/env npx tsx

/**
 * Register Telegram webhook.
 * Usage: npx tsx scripts/register-webhook.ts <functionUrl> <botToken> <secretToken>
 */

const [functionUrl, botToken, secretToken] = process.argv.slice(2);

if (!functionUrl || !botToken || !secretToken) {
  console.error('Usage: npx tsx scripts/register-webhook.ts <functionUrl> <botToken> <secretToken>');
  process.exit(1);
}

const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: functionUrl,
    secret_token: secretToken,
    allowed_updates: ['message'],
  }),
});

const result = await response.json();
console.log('setWebhook response:', JSON.stringify(result, null, 2));

if (!result.ok) {
  console.error('Failed to set webhook');
  process.exit(1);
}

console.log('Webhook registered successfully!');
