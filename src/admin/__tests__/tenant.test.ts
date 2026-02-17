import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/tenants.js', () => ({
  getTenantById: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
}));

vi.mock('../../db/webhook-secrets.js', () => ({
  createWebhookSecretMapping: vi.fn(),
}));

import { handleGetTenant, handleUpdateTenant, handleOnboard, handleConfigurePayment } from '../routes/tenant.js';
import { getTenantById } from '../../db/tenants.js';

const mockedGetTenant = vi.mocked(getTenantById);

const TABLE = 'dale-test-table';
const AUTH = { cognitoSub: 'sub-123', tenantId: 'tenant-1' };

function makeDeps(overrides: Record<string, unknown> = {}) {
  return {
    generateId: () => 'new-tenant-id',
    generateSecret: () => 'webhook-secret',
    storeSecrets: vi.fn(),
    createWebhookSecretMapping: vi.fn(),
    setWebhook: vi.fn().mockResolvedValue(true),
    registerPayPalWebhook: vi.fn().mockResolvedValue('WH-auto-123'),
    telegramWebhookUrl: 'https://tg.example.com',
    stripeWebhookUrl: 'https://stripe.example.com',
    paypalWebhookUrl: 'https://paypal.example.com',
    paypalBaseUrl: 'https://api-m.sandbox.paypal.com',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleGetTenant', () => {
  it('returns tenant data', async () => {
    mockedGetTenant.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'METADATA',
      tenantId: 'tenant-1',
      cognitoSub: 'sub-123',
      displayName: 'Test Creator',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      GSI1pk: 'COGNITO#sub-123',
      GSI1sk: 'TENANT',
    });

    const result = await handleGetTenant(TABLE, AUTH);
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.tenantId).toBe('tenant-1');
    expect(body.displayName).toBe('Test Creator');
  });

  it('returns 404 when not found', async () => {
    mockedGetTenant.mockResolvedValue(null);
    const result = await handleGetTenant(TABLE, AUTH);
    expect(result.statusCode).toBe(404);
  });
});

describe('handleUpdateTenant', () => {
  it('updates tenant', async () => {
    const result = await handleUpdateTenant(TABLE, AUTH, JSON.stringify({ displayName: 'New' }));
    expect(result.statusCode).toBe(200);
  });

  it('returns 400 for invalid JSON', async () => {
    const result = await handleUpdateTenant(TABLE, AUTH, 'bad');
    expect(result.statusCode).toBe(400);
  });
});

describe('handleOnboard', () => {
  it('creates tenant with Stripe and returns tenantId', async () => {
    const deps = makeDeps();

    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({
      displayName: 'New Creator',
      telegramBotToken: '123:ABC',
      stripeSecretKey: 'sk_test',
      stripeWebhookSecret: 'whsec_test',
    }), deps);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.tenantId).toBe('new-tenant-id');
    expect(body.webhookRegistered).toBe(true);
    expect(body.stripeWebhookUrl).toBe('https://stripe.example.com?tenant=new-tenant-id');
    expect(body.paypalWebhookUrl).toBeUndefined();

    expect(deps.storeSecrets).toHaveBeenCalledWith('new-tenant-id', {
      'telegram-bot-token': '123:ABC',
      'telegram-webhook-secret': 'webhook-secret',
      'stripe-secret-key': 'sk_test',
      'stripe-webhook-secret': 'whsec_test',
    });

    expect(deps.registerPayPalWebhook).not.toHaveBeenCalled();
  });

  it('creates tenant with PayPal only (auto-registers webhook)', async () => {
    const deps = makeDeps();

    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({
      displayName: 'PayPal Creator',
      telegramBotToken: '123:ABC',
      paypalClientId: 'pp-client',
      paypalClientSecret: 'pp-secret',
    }), deps);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.tenantId).toBe('new-tenant-id');
    expect(body.paypalWebhookUrl).toBe('https://paypal.example.com?tenant=new-tenant-id');
    expect(body.stripeWebhookUrl).toBeUndefined();

    expect(deps.registerPayPalWebhook).toHaveBeenCalledWith(
      'https://api-m.sandbox.paypal.com',
      'pp-client',
      'pp-secret',
      'https://paypal.example.com?tenant=new-tenant-id',
      [
        'BILLING.SUBSCRIPTION.ACTIVATED',
        'BILLING.SUBSCRIPTION.CANCELLED',
        'BILLING.SUBSCRIPTION.SUSPENDED',
        'PAYMENT.SALE.COMPLETED',
        'PAYMENT.SALE.DENIED',
      ],
    );

    expect(deps.storeSecrets).toHaveBeenCalledWith('new-tenant-id', {
      'telegram-bot-token': '123:ABC',
      'telegram-webhook-secret': 'webhook-secret',
      'paypal-client-id': 'pp-client',
      'paypal-client-secret': 'pp-secret',
      'paypal-webhook-id': 'WH-auto-123',
    });
  });

  it('creates tenant with both providers', async () => {
    const deps = makeDeps();

    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({
      displayName: 'Both Creator',
      telegramBotToken: '123:ABC',
      stripeSecretKey: 'sk_test',
      stripeWebhookSecret: 'whsec_test',
      paypalClientId: 'pp-client',
      paypalClientSecret: 'pp-secret',
    }), deps);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.stripeWebhookUrl).toBe('https://stripe.example.com?tenant=new-tenant-id');
    expect(body.paypalWebhookUrl).toBe('https://paypal.example.com?tenant=new-tenant-id');

    expect(deps.registerPayPalWebhook).toHaveBeenCalled();
  });

  it('returns 502 when PayPal registration fails', async () => {
    const deps = makeDeps({
      registerPayPalWebhook: vi.fn().mockRejectedValue(new Error('PayPal webhook registration failed: 422')),
    });

    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({
      displayName: 'Fail Creator',
      telegramBotToken: '123:ABC',
      paypalClientId: 'pp-client',
      paypalClientSecret: 'pp-secret',
    }), deps);

    expect(result.statusCode).toBe(502);
    expect(JSON.parse(result.body).error).toContain('PayPal webhook registration failed');
  });

  it('returns 400 for missing fields', async () => {
    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({ displayName: 'Test' }), makeDeps());
    expect(result.statusCode).toBe(400);
  });

  it('creates tenant without payment providers', async () => {
    const deps = makeDeps();
    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({
      displayName: 'No Payment Creator',
      telegramBotToken: '123:ABC',
    }), deps);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.tenantId).toBe('new-tenant-id');
    expect(body.webhookRegistered).toBe(true);
    expect(body.stripeWebhookUrl).toBeUndefined();
    expect(body.paypalWebhookUrl).toBeUndefined();

    expect(deps.storeSecrets).toHaveBeenCalledWith('new-tenant-id', {
      'telegram-bot-token': '123:ABC',
      'telegram-webhook-secret': 'webhook-secret',
    });
    expect(deps.registerPayPalWebhook).not.toHaveBeenCalled();
  });
});

function makePaymentDeps(overrides: Record<string, unknown> = {}) {
  return {
    storeSecrets: vi.fn(),
    registerPayPalWebhook: vi.fn().mockResolvedValue('WH-auto-456'),
    stripeWebhookUrl: 'https://stripe.example.com',
    paypalWebhookUrl: 'https://paypal.example.com',
    paypalBaseUrl: 'https://api-m.sandbox.paypal.com',
    ...overrides,
  };
}

describe('handleConfigurePayment', () => {
  it('configures Stripe credentials', async () => {
    const deps = makePaymentDeps();
    const result = await handleConfigurePayment(AUTH, JSON.stringify({
      stripeSecretKey: 'sk_test',
      stripeWebhookSecret: 'whsec_test',
    }), deps);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.configured).toBe(true);
    expect(body.stripeWebhookUrl).toBe('https://stripe.example.com?tenant=tenant-1');
    expect(body.paypalWebhookUrl).toBeUndefined();

    expect(deps.storeSecrets).toHaveBeenCalledWith('tenant-1', {
      'stripe-secret-key': 'sk_test',
      'stripe-webhook-secret': 'whsec_test',
    });
    expect(deps.registerPayPalWebhook).not.toHaveBeenCalled();
  });

  it('configures PayPal credentials and auto-registers webhook', async () => {
    const deps = makePaymentDeps();
    const result = await handleConfigurePayment(AUTH, JSON.stringify({
      paypalClientId: 'pp-client',
      paypalClientSecret: 'pp-secret',
    }), deps);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.configured).toBe(true);
    expect(body.paypalWebhookUrl).toBe('https://paypal.example.com?tenant=tenant-1');

    expect(deps.registerPayPalWebhook).toHaveBeenCalledWith(
      'https://api-m.sandbox.paypal.com',
      'pp-client',
      'pp-secret',
      'https://paypal.example.com?tenant=tenant-1',
      expect.any(Array),
    );

    expect(deps.storeSecrets).toHaveBeenCalledWith('tenant-1', {
      'paypal-client-id': 'pp-client',
      'paypal-client-secret': 'pp-secret',
      'paypal-webhook-id': 'WH-auto-456',
    });
  });

  it('returns 400 when no provider specified', async () => {
    const result = await handleConfigurePayment(AUTH, JSON.stringify({}), makePaymentDeps());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('At least one payment provider');
  });

  it('returns 400 when Stripe key provided without secret', async () => {
    const result = await handleConfigurePayment(AUTH, JSON.stringify({
      stripeSecretKey: 'sk_test',
    }), makePaymentDeps());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('stripeSecretKey and stripeWebhookSecret');
  });

  it('returns 400 when PayPal client ID provided without secret', async () => {
    const result = await handleConfigurePayment(AUTH, JSON.stringify({
      paypalClientId: 'pp-client',
    }), makePaymentDeps());
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('paypalClientId and paypalClientSecret');
  });

  it('returns 502 when PayPal registration fails', async () => {
    const deps = makePaymentDeps({
      registerPayPalWebhook: vi.fn().mockRejectedValue(new Error('PayPal error')),
    });
    const result = await handleConfigurePayment(AUTH, JSON.stringify({
      paypalClientId: 'pp-client',
      paypalClientSecret: 'pp-secret',
    }), deps);
    expect(result.statusCode).toBe(502);
  });

  it('returns 400 for invalid JSON', async () => {
    const result = await handleConfigurePayment(AUTH, 'bad', makePaymentDeps());
    expect(result.statusCode).toBe(400);
  });
});
