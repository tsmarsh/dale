import type { PlatformConfig } from './types.js';

let cachedConfig: PlatformConfig | null = null;

export function getPlatformConfig(): PlatformConfig {
  if (cachedConfig) return cachedConfig;

  const tableName = process.env.TABLE_NAME;
  if (!tableName) throw new Error('TABLE_NAME env var is required');

  const telegramWebhookUrl = process.env.TELEGRAM_WEBHOOK_URL ?? '';
  const stripeWebhookUrl = process.env.STRIPE_WEBHOOK_URL ?? '';
  const paypalWebhookUrl = process.env.PAYPAL_WEBHOOK_URL ?? '';

  cachedConfig = { tableName, telegramWebhookUrl, stripeWebhookUrl, paypalWebhookUrl };
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
