import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import type { AppConfig } from './types.js';

const ssm = new SSMClient({});
let cachedConfig: AppConfig | null = null;

async function getParameter(name: string): Promise<string> {
  const result = await ssm.send(
    new GetParameterCommand({ Name: name, WithDecryption: true }),
  );
  const value = result.Parameter?.Value;
  if (!value) {
    throw new Error(`SSM parameter ${name} not found or empty`);
  }
  return value;
}

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  const tableName = process.env.TABLE_NAME;
  const paymentLink = process.env.PAYMENT_LINK;
  const telegramBotTokenParam = process.env.TELEGRAM_BOT_TOKEN_PARAM;
  const telegramWebhookSecretParam = process.env.TELEGRAM_WEBHOOK_SECRET_PARAM;
  const stripeSecretKeyParam = process.env.STRIPE_SECRET_KEY_PARAM;
  const stripeWebhookSecretParam = process.env.STRIPE_WEBHOOK_SECRET_PARAM;

  if (!tableName) throw new Error('TABLE_NAME env var is required');
  if (!paymentLink) throw new Error('PAYMENT_LINK env var is required');
  if (!telegramBotTokenParam) throw new Error('TELEGRAM_BOT_TOKEN_PARAM env var is required');
  if (!telegramWebhookSecretParam) throw new Error('TELEGRAM_WEBHOOK_SECRET_PARAM env var is required');
  if (!stripeSecretKeyParam) throw new Error('STRIPE_SECRET_KEY_PARAM env var is required');
  if (!stripeWebhookSecretParam) throw new Error('STRIPE_WEBHOOK_SECRET_PARAM env var is required');

  const [telegramBotToken, telegramWebhookSecret, stripeSecretKey, stripeWebhookSecret] =
    await Promise.all([
      getParameter(telegramBotTokenParam),
      getParameter(telegramWebhookSecretParam),
      getParameter(stripeSecretKeyParam),
      getParameter(stripeWebhookSecretParam),
    ]);

  cachedConfig = {
    tableName,
    paymentLink,
    telegramBotToken,
    telegramWebhookSecret,
    stripeSecretKey,
    stripeWebhookSecret,
  };

  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
