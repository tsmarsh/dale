import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/tenants.js', () => ({
  getTenantById: vi.fn(),
  createTenant: vi.fn(),
  updateTenant: vi.fn(),
}));

vi.mock('../../db/webhook-secrets.js', () => ({
  createWebhookSecretMapping: vi.fn(),
}));

import { handleGetTenant, handleUpdateTenant, handleOnboard } from '../routes/tenant.js';
import { getTenantById } from '../../db/tenants.js';

const mockedGetTenant = vi.mocked(getTenantById);

const TABLE = 'dale-test-table';
const AUTH = { cognitoSub: 'sub-123', tenantId: 'tenant-1' };

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
  it('creates tenant and returns tenantId', async () => {
    const mockStoreSecrets = vi.fn();
    const mockCreateWebhookSecretMapping = vi.fn();
    const mockSetWebhook = vi.fn().mockResolvedValue(true);

    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({
      displayName: 'New Creator',
      telegramBotToken: '123:ABC',
      stripeSecretKey: 'sk_test',
      stripeWebhookSecret: 'whsec_test',
    }), {
      generateId: () => 'new-tenant-id',
      generateSecret: () => 'webhook-secret',
      storeSecrets: mockStoreSecrets,
      createWebhookSecretMapping: mockCreateWebhookSecretMapping,
      setWebhook: mockSetWebhook,
      telegramWebhookUrl: 'https://tg.example.com',
      stripeWebhookUrl: 'https://stripe.example.com',
    });

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.tenantId).toBe('new-tenant-id');
    expect(body.webhookRegistered).toBe(true);
    expect(body.stripeWebhookUrl).toBe('https://stripe.example.com?tenant=new-tenant-id');

    expect(mockStoreSecrets).toHaveBeenCalledWith('new-tenant-id', {
      'telegram-bot-token': '123:ABC',
      'telegram-webhook-secret': 'webhook-secret',
      'stripe-secret-key': 'sk_test',
      'stripe-webhook-secret': 'whsec_test',
    });
  });

  it('returns 400 for missing fields', async () => {
    const result = await handleOnboard(TABLE, 'sub-123', JSON.stringify({ displayName: 'Test' }), {
      generateId: () => 'id',
      generateSecret: () => 'secret',
      storeSecrets: vi.fn(),
      createWebhookSecretMapping: vi.fn(),
      setWebhook: vi.fn(),
      telegramWebhookUrl: '',
      stripeWebhookUrl: '',
    });
    expect(result.statusCode).toBe(400);
  });
});
