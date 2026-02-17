import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import type { TenantSecrets } from './types.js';

const ssm = new SSMClient({});

interface CacheEntry {
  secrets: TenantSecrets;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getTenantSecrets(tenantId: string): Promise<TenantSecrets> {
  const cached = cache.get(tenantId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.secrets;
  }

  const path = `/dale/tenants/${tenantId}/`;
  const params = new Map<string, string>();

  let nextToken: string | undefined;
  do {
    const result = await ssm.send(
      new GetParametersByPathCommand({
        Path: path,
        WithDecryption: true,
        NextToken: nextToken,
      }),
    );
    for (const param of result.Parameters ?? []) {
      if (param.Name && param.Value) {
        const key = param.Name.replace(path, '');
        params.set(key, param.Value);
      }
    }
    nextToken = result.NextToken;
  } while (nextToken);

  const telegramBotToken = params.get('telegram-bot-token');
  const telegramWebhookSecret = params.get('telegram-webhook-secret');
  const stripeSecretKey = params.get('stripe-secret-key');
  const stripeWebhookSecret = params.get('stripe-webhook-secret');
  const paypalClientId = params.get('paypal-client-id');
  const paypalClientSecret = params.get('paypal-client-secret');
  const paypalWebhookId = params.get('paypal-webhook-id');

  if (!telegramBotToken || !telegramWebhookSecret) {
    throw new Error(`Missing SSM parameters for tenant ${tenantId}`);
  }

  const secrets: TenantSecrets = {
    telegramBotToken,
    telegramWebhookSecret,
    stripeSecretKey: stripeSecretKey || undefined,
    stripeWebhookSecret: stripeWebhookSecret || undefined,
    paypalClientId: paypalClientId || undefined,
    paypalClientSecret: paypalClientSecret || undefined,
    paypalWebhookId: paypalWebhookId || undefined,
  };

  cache.set(tenantId, { secrets, expiresAt: Date.now() + TTL_MS });
  return secrets;
}

export function resetTenantSecretsCache(): void {
  cache.clear();
}
