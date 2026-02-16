import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../client.js';
import { createWebhookSecretMapping, getTenantByWebhookSecret } from '../webhook-secrets.js';

const ddbMock = mockClient(docClient);
const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('createWebhookSecretMapping', () => {
  it('writes webhook secret record', async () => {
    ddbMock.on(PutCommand).resolves({});

    await createWebhookSecretMapping(TABLE, 'secret-123', 'tenant-1');

    const call = ddbMock.commandCalls(PutCommand)[0];
    const item = call.args[0].input.Item!;
    expect(item.pk).toBe('WHSECRET#secret-123');
    expect(item.sk).toBe('TENANT');
    expect(item.tenantId).toBe('tenant-1');
  });
});

describe('getTenantByWebhookSecret', () => {
  it('returns tenantId when found', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { pk: 'WHSECRET#secret-123', sk: 'TENANT', tenantId: 'tenant-1' },
    });

    const result = await getTenantByWebhookSecret(TABLE, 'secret-123');
    expect(result).toBe('tenant-1');
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getTenantByWebhookSecret(TABLE, 'unknown');
    expect(result).toBeNull();
  });
});
