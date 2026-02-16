import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface E2EConfig {
  adminApiUrl: string;
  telegramWebhookUrl: string;
  stripeWebhookUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  webDistributionUrl: string;
  tableName: string;
  region: string;
}

function getDir(): string {
  try {
    return dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
}

function loadCdkOutputs(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(getDir(), '../cdk-outputs.json'), 'utf-8');
    const outputs = JSON.parse(raw);
    const stackKey = Object.keys(outputs)[0];
    return outputs[stackKey] ?? {};
  } catch {
    return {};
  }
}

export function loadConfig(): E2EConfig {
  const cdkOutputs = loadCdkOutputs();

  function get(envVar: string, cdkKey: string): string {
    const value = process.env[envVar] ?? cdkOutputs[cdkKey];
    if (!value) {
      throw new Error(`Missing config: set ${envVar} or ensure ${cdkKey} exists in cdk-outputs.json`);
    }
    return value;
  }

  return {
    adminApiUrl: get('E2E_ADMIN_API_URL', 'AdminApiUrl'),
    telegramWebhookUrl: get('E2E_TELEGRAM_WEBHOOK_URL', 'TelegramWebhookUrl'),
    stripeWebhookUrl: get('E2E_STRIPE_WEBHOOK_URL', 'StripeWebhookUrl'),
    userPoolId: get('E2E_USER_POOL_ID', 'UserPoolId'),
    userPoolClientId: get('E2E_USER_POOL_CLIENT_ID', 'UserPoolClientId'),
    webDistributionUrl: get('E2E_WEB_DISTRIBUTION_URL', 'WebDistributionUrl'),
    tableName: get('E2E_TABLE_NAME', 'TableName'),
    region: process.env.E2E_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  };
}
