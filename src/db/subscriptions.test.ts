import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  GetCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  docClient,
  getUserProfile,
  getTelegramUserIdByStripeCustomer,
  createUserMapping,
  updateSubscriptionStatus,
} from './subscriptions.js';

const ddbMock = mockClient(docClient);

const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('getUserProfile', () => {
  it('returns profile when found', async () => {
    const profile = {
      pk: 'USER#123',
      sk: 'PROFILE',
      telegramUserId: 123,
      subscriptionStatus: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    ddbMock.on(GetCommand).resolves({ Item: profile });

    const result = await getUserProfile(TABLE, 123);
    expect(result).toEqual(profile);

    const call = ddbMock.commandCalls(GetCommand)[0];
    expect(call.args[0].input).toEqual({
      TableName: TABLE,
      Key: { pk: 'USER#123', sk: 'PROFILE' },
    });
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getUserProfile(TABLE, 999);
    expect(result).toBeNull();
  });
});

describe('getTelegramUserIdByStripeCustomer', () => {
  it('returns telegramUserId when mapping exists', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: 'STRIPE#cus_abc',
        sk: 'MAPPING',
        stripeCustomerId: 'cus_abc',
        telegramUserId: 456,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    });

    const result = await getTelegramUserIdByStripeCustomer(TABLE, 'cus_abc');
    expect(result).toBe(456);
  });

  it('returns null when no mapping exists', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getTelegramUserIdByStripeCustomer(TABLE, 'cus_unknown');
    expect(result).toBeNull();
  });
});

describe('createUserMapping', () => {
  it('sends transact write with user and stripe records', async () => {
    ddbMock.on(TransactWriteCommand).resolves({});

    await createUserMapping(TABLE, 123, 'cus_abc', 'sub_xyz');

    const call = ddbMock.commandCalls(TransactWriteCommand)[0];
    const items = call.args[0].input.TransactItems!;
    expect(items).toHaveLength(2);

    const userItem = items[0].Put!.Item!;
    expect(userItem.pk).toBe('USER#123');
    expect(userItem.sk).toBe('PROFILE');
    expect(userItem.telegramUserId).toBe(123);
    expect(userItem.stripeCustomerId).toBe('cus_abc');
    expect(userItem.stripeSubscriptionId).toBe('sub_xyz');
    expect(userItem.subscriptionStatus).toBe('active');

    const stripeItem = items[1].Put!.Item!;
    expect(stripeItem.pk).toBe('STRIPE#cus_abc');
    expect(stripeItem.sk).toBe('MAPPING');
    expect(stripeItem.telegramUserId).toBe(123);
  });
});

describe('updateSubscriptionStatus', () => {
  it('updates status without subscriptionId', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updateSubscriptionStatus(TABLE, 123, 'past_due');

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    const input = call.args[0].input;
    expect(input.Key).toEqual({ pk: 'USER#123', sk: 'PROFILE' });
    expect(input.ExpressionAttributeValues![':status']).toBe('past_due');
    expect(input.UpdateExpression).not.toContain('#subId');
  });

  it('updates status with subscriptionId', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updateSubscriptionStatus(TABLE, 123, 'active', 'sub_new');

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    const input = call.args[0].input;
    expect(input.ExpressionAttributeValues![':subId']).toBe('sub_new');
    expect(input.UpdateExpression).toContain('#subId');
  });
});
