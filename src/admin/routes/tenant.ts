import { getTenantById, createTenant, updateTenant } from '../../db/tenants.js';
import type { AuthContext } from '../middleware/auth.js';

export async function handleGetTenant(
  tableName: string,
  auth: AuthContext,
): Promise<{ statusCode: number; body: string }> {
  const tenant = await getTenantById(tableName, auth.tenantId);
  if (!tenant) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Tenant not found' }) };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      tenantId: tenant.tenantId,
      displayName: tenant.displayName,
      createdAt: tenant.createdAt,
    }),
  };
}

export async function handleUpdateTenant(
  tableName: string,
  auth: AuthContext,
  body: string,
): Promise<{ statusCode: number; body: string }> {
  let parsed: { displayName?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  await updateTenant(tableName, auth.tenantId, { displayName: parsed.displayName });
  return { statusCode: 200, body: JSON.stringify({ updated: true }) };
}

export async function handleOnboard(
  tableName: string,
  cognitoSub: string,
  body: string,
  deps: {
    generateId: () => string;
    generateSecret: () => string;
    storeSecrets: (tenantId: string, secrets: Record<string, string>) => Promise<void>;
    createWebhookSecretMapping: (tableName: string, secret: string, tenantId: string) => Promise<void>;
    setWebhook: (botToken: string, webhookUrl: string, secretToken: string) => Promise<boolean>;
    telegramWebhookUrl: string;
    stripeWebhookUrl: string;
  },
): Promise<{ statusCode: number; body: string }> {
  let parsed: { displayName: string; telegramBotToken: string; stripeSecretKey: string; stripeWebhookSecret: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!parsed.displayName || !parsed.telegramBotToken || !parsed.stripeSecretKey || !parsed.stripeWebhookSecret) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const tenantId = deps.generateId();
  const webhookSecret = deps.generateSecret();

  // Store secrets in SSM
  await deps.storeSecrets(tenantId, {
    'telegram-bot-token': parsed.telegramBotToken,
    'telegram-webhook-secret': webhookSecret,
    'stripe-secret-key': parsed.stripeSecretKey,
    'stripe-webhook-secret': parsed.stripeWebhookSecret,
  });

  // Write tenant + webhook secret records
  await createTenant(tableName, {
    tenantId,
    cognitoSub,
    displayName: parsed.displayName,
  });

  await deps.createWebhookSecretMapping(tableName, webhookSecret, tenantId);

  // Register Telegram webhook
  const webhookRegistered = await deps.setWebhook(
    parsed.telegramBotToken,
    deps.telegramWebhookUrl,
    webhookSecret,
  );

  return {
    statusCode: 201,
    body: JSON.stringify({
      tenantId,
      webhookRegistered,
      stripeWebhookUrl: `${deps.stripeWebhookUrl}?tenant=${tenantId}`,
    }),
  };
}
