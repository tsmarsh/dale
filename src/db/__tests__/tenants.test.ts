import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../client.js';
import { createTenant, getTenantById, getTenantByCognitoSub, updateTenant } from '../tenants.js';

const ddbMock = mockClient(docClient);
const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('createTenant', () => {
  it('writes tenant record with correct keys', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await createTenant(TABLE, {
      tenantId: 'tenant-1',
      cognitoSub: 'sub-123',
      displayName: 'Test Creator',
    });

    expect(result.pk).toBe('TENANT#tenant-1');
    expect(result.sk).toBe('METADATA');
    expect(result.GSI1pk).toBe('COGNITO#sub-123');
    expect(result.GSI1sk).toBe('TENANT');
    expect(result.displayName).toBe('Test Creator');

    const call = ddbMock.commandCalls(PutCommand)[0];
    expect(call.args[0].input.TableName).toBe(TABLE);
  });
});

describe('getTenantById', () => {
  it('returns tenant when found', async () => {
    const tenant = {
      pk: 'TENANT#tenant-1',
      sk: 'METADATA',
      tenantId: 'tenant-1',
      cognitoSub: 'sub-123',
      displayName: 'Test',
    };
    ddbMock.on(GetCommand).resolves({ Item: tenant });

    const result = await getTenantById(TABLE, 'tenant-1');
    expect(result).toEqual(tenant);
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getTenantById(TABLE, 'missing');
    expect(result).toBeNull();
  });
});

describe('getTenantByCognitoSub', () => {
  it('queries GSI1 and returns tenant', async () => {
    const tenant = {
      pk: 'TENANT#tenant-1',
      sk: 'METADATA',
      tenantId: 'tenant-1',
      cognitoSub: 'sub-123',
    };
    ddbMock.on(QueryCommand).resolves({ Items: [tenant] });

    const result = await getTenantByCognitoSub(TABLE, 'sub-123');
    expect(result).toEqual(tenant);

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe('GSI1');
    expect(call.args[0].input.ExpressionAttributeValues![':pk']).toBe('COGNITO#sub-123');
  });

  it('returns null when not found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const result = await getTenantByCognitoSub(TABLE, 'missing');
    expect(result).toBeNull();
  });
});

describe('updateTenant', () => {
  it('updates displayName', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updateTenant(TABLE, 'tenant-1', { displayName: 'New Name' });

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    const input = call.args[0].input;
    expect(input.Key).toEqual({ pk: 'TENANT#tenant-1', sk: 'METADATA' });
    expect(input.ExpressionAttributeValues![':displayName']).toBe('New Name');
  });
});
