import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

vi.mock('../../db/tenants.js', () => ({
  getTenantByCognitoSub: vi.fn(),
}));

import { extractAuthContext, extractCognitoSub } from '../middleware/auth.js';
import { getTenantByCognitoSub } from '../../db/tenants.js';

const mockedGetTenant = vi.mocked(getTenantByCognitoSub);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeEvent(sub?: string): APIGatewayProxyEventV2 {
  return {
    requestContext: {
      authorizer: sub ? { jwt: { claims: { sub } } } : undefined,
    },
  } as unknown as APIGatewayProxyEventV2;
}

describe('extractCognitoSub', () => {
  it('extracts sub from JWT claims', () => {
    const result = extractCognitoSub(makeEvent('user-123'));
    expect(result).toBe('user-123');
  });

  it('returns null if no claims', () => {
    const result = extractCognitoSub(makeEvent());
    expect(result).toBeNull();
  });
});

describe('extractAuthContext', () => {
  it('returns auth context for existing tenant', async () => {
    mockedGetTenant.mockResolvedValue({
      pk: 'TENANT#t1',
      sk: 'METADATA',
      tenantId: 't1',
      cognitoSub: 'user-123',
      displayName: 'Test',
      createdAt: '',
      updatedAt: '',
      GSI1pk: 'COGNITO#user-123',
      GSI1sk: 'TENANT',
    });

    const result = await extractAuthContext(makeEvent('user-123'), 'table');
    expect(result).toEqual({ cognitoSub: 'user-123', tenantId: 't1' });
  });

  it('returns null if no cognito sub', async () => {
    const result = await extractAuthContext(makeEvent(), 'table');
    expect(result).toBeNull();
  });

  it('returns null if tenant not found', async () => {
    mockedGetTenant.mockResolvedValue(null);
    const result = await extractAuthContext(makeEvent('unknown'), 'table');
    expect(result).toBeNull();
  });
});
