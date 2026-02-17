import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../client.js';
import { getTenantByPayPalPayer, createPayPalUserRoomMapping } from '../paypal-mappings.js';

const ddbMock = mockClient(docClient);
const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('getTenantByPayPalPayer', () => {
  it('queries GSI1 and returns paypal mapping', async () => {
    const mapping = {
      pk: 'TENANT#t1',
      sk: 'PAYPALCUST#PP-123',
      tenantId: 't1',
      paypalPayerId: 'PP-123',
      telegramUserId: 123,
    };
    ddbMock.on(QueryCommand).resolves({ Items: [mapping] });

    const result = await getTenantByPayPalPayer(TABLE, 'PP-123');
    expect(result).toEqual(mapping);

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe('GSI1');
    expect(call.args[0].input.ExpressionAttributeValues![':pk']).toBe('PAYPALCUST#PP-123');
  });

  it('returns null when not found', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    const result = await getTenantByPayPalPayer(TABLE, 'PP-unknown');
    expect(result).toBeNull();
  });
});

describe('createPayPalUserRoomMapping', () => {
  it('sends transact write with user, userroom, and paypal records', async () => {
    ddbMock.on(TransactWriteCommand).resolves({});

    await createPayPalUserRoomMapping(TABLE, 't1', 123, 'r1', 'PP-123', 'I-SUB456');

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
    expect(userRoomItem.paypalPayerId).toBe('PP-123');
    expect(userRoomItem.paypalSubscriptionId).toBe('I-SUB456');
    expect(userRoomItem.GSI1pk).toBe('TGUSER#123');

    const paypalItem = items[2].Put!.Item!;
    expect(paypalItem.pk).toBe('TENANT#t1');
    expect(paypalItem.sk).toBe('PAYPALCUST#PP-123');
    expect(paypalItem.GSI1pk).toBe('PAYPALCUST#PP-123');
  });

  it('retries without condition on TransactionCanceledException', async () => {
    const cancelError = new Error('TransactionCanceledException');
    cancelError.name = 'TransactionCanceledException';
    ddbMock.on(TransactWriteCommand).rejectsOnce(cancelError).resolves({});

    await createPayPalUserRoomMapping(TABLE, 't1', 123, 'r1', 'PP-123', 'I-SUB456');

    const calls = ddbMock.commandCalls(TransactWriteCommand);
    expect(calls).toHaveLength(2);
    // Second call should not have ConditionExpression
    const secondItems = calls[1].args[0].input.TransactItems!;
    expect(secondItems[0].Put!.ConditionExpression).toBeUndefined();
  });
});
