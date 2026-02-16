import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../client.js';
import { getTenantByStripeCustomer, createUserRoomMapping } from '../stripe-mappings.js';

const ddbMock = mockClient(docClient);
const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('getTenantByStripeCustomer', () => {
  it('queries GSI1 and returns stripe mapping', async () => {
    const mapping = {
      pk: 'TENANT#t1',
      sk: 'STRIPECUST#cus_abc',
      tenantId: 't1',
      stripeCustomerId: 'cus_abc',
      telegramUserId: 123,
    };
    ddbMock.on(QueryCommand).resolves({ Items: [mapping] });

    const result = await getTenantByStripeCustomer(TABLE, 'cus_abc');
    expect(result).toEqual(mapping);

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe('GSI1');
    expect(call.args[0].input.ExpressionAttributeValues![':pk']).toBe('STRIPECUST#cus_abc');
  });

  it('returns null when not found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const result = await getTenantByStripeCustomer(TABLE, 'cus_unknown');
    expect(result).toBeNull();
  });
});

describe('createUserRoomMapping', () => {
  it('sends transact write with user, userroom, and stripe records', async () => {
    ddbMock.on(TransactWriteCommand).resolves({});

    await createUserRoomMapping(TABLE, 't1', 123, 'r1', 'cus_abc', 'sub_xyz');

    const call = ddbMock.commandCalls(TransactWriteCommand)[0];
    const items = call.args[0].input.TransactItems!;
    expect(items).toHaveLength(3);

    const userItem = items[0].Put!.Item!;
    expect(userItem.pk).toBe('TENANT#t1');
    expect(userItem.sk).toBe('USER#123');

    const userRoomItem = items[1].Put!.Item!;
    expect(userRoomItem.pk).toBe('TENANT#t1');
    expect(userRoomItem.sk).toBe('USERROOM#123#ROOM#r1');
    expect(userRoomItem.subscriptionStatus).toBe('active');
    expect(userRoomItem.GSI1pk).toBe('TGUSER#123');

    const stripeItem = items[2].Put!.Item!;
    expect(stripeItem.pk).toBe('TENANT#t1');
    expect(stripeItem.sk).toBe('STRIPECUST#cus_abc');
    expect(stripeItem.GSI1pk).toBe('STRIPECUST#cus_abc');
  });
});
