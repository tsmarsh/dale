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
    paypalWebhookUrl: string;
  },
): Promise<{ statusCode: number; body: string }> {
  let parsed: {
    displayName: string;
    telegramBotToken: string;
    stripeSecretKey?: string;
    stripeWebhookSecret?: string;
    paypalClientId?: string;
    paypalClientSecret?: string;
    paypalWebhookId?: string;
  };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!parsed.displayName || !parsed.telegramBotToken) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const hasStripe = !!(parsed.stripeSecretKey && parsed.stripeWebhookSecret);
  const hasPayPal = !!(parsed.paypalClientId && parsed.paypalClientSecret && parsed.paypalWebhookId);

  if (!hasStripe && !hasPayPal) {
    return { statusCode: 400, body: JSON.stringify({ error: 'At least one payment provider (Stripe or PayPal) is required' }) };
  }

  const tenantId = deps.generateId();
  const webhookSecret = deps.generateSecret();

  // Store secrets in SSM
  const secrets: Record<string, string> = {
    'telegram-bot-token': parsed.telegramBotToken,
    'telegram-webhook-secret': webhookSecret,
  };
  if (hasStripe) {
    secrets['stripe-secret-key'] = parsed.stripeSecretKey!;
    secrets['stripe-webhook-secret'] = parsed.stripeWebhookSecret!;
  }
  if (hasPayPal) {
    secrets['paypal-client-id'] = parsed.paypalClientId!;
    secrets['paypal-client-secret'] = parsed.paypalClientSecret!;
    secrets['paypal-webhook-id'] = parsed.paypalWebhookId!;
  }
  await deps.storeSecrets(tenantId, secrets);

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

  const response: Record<string, unknown> = {
    tenantId,
    webhookRegistered,
  };
  if (hasStripe) {
    response.stripeWebhookUrl = `${deps.stripeWebhookUrl}?tenant=${tenantId}`;
  }
  if (hasPayPal) {
    response.paypalWebhookUrl = `${deps.paypalWebhookUrl}?tenant=${tenantId}`;
  }

  return {
    statusCode: 201,
    body: JSON.stringify(response),
  };
}
