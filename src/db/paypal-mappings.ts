import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './client.js';
import type { PayPalMapping, UserProfile, UserRoom } from '../shared/types.js';

export async function getTenantByPayPalPayer(
  tableName: string,
  paypalPayerId: string,
): Promise<PayPalMapping | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `PAYPALCUST#${paypalPayerId}`,
      },
    }),
  );
  return (result.Items?.[0] as PayPalMapping) ?? null;
}

export async function createPayPalUserRoomMapping(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
  roomId: string,
  paypalPayerId: string,
  paypalSubscriptionId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const userProfile: UserProfile = {
    pk: `TENANT#${tenantId}`,
    sk: `USER#${telegramUserId}`,
    tenantId,
    telegramUserId,
    createdAt: now,
    updatedAt: now,
  };

  const userRoom: UserRoom = {
    pk: `TENANT#${tenantId}`,
    sk: `USERROOM#${telegramUserId}#ROOM#${roomId}`,
    tenantId,
    telegramUserId,
    roomId,
    subscriptionStatus: 'active',
    paypalPayerId,
    paypalSubscriptionId,
    createdAt: now,
    updatedAt: now,
    GSI1pk: `TGUSER#${telegramUserId}`,
    GSI1sk: `TENANT#${tenantId}#ROOM#${roomId}`,
  };

  const paypalMapping: PayPalMapping = {
    pk: `TENANT#${tenantId}`,
    sk: `PAYPALCUST#${paypalPayerId}`,
    tenantId,
    paypalPayerId,
    telegramUserId,
    createdAt: now,
    GSI1pk: `PAYPALCUST#${paypalPayerId}`,
    GSI1sk: `TENANT#${tenantId}`,
  };

  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: userProfile,
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: userRoom,
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: paypalMapping,
          },
        },
      ],
    }),
  ).catch(async (err) => {
    // If user profile already exists, retry without the condition
    if (err.name === 'TransactionCanceledException') {
      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: { TableName: tableName, Item: userProfile } },
            { Put: { TableName: tableName, Item: userRoom } },
            { Put: { TableName: tableName, Item: paypalMapping } },
          ],
        }),
      );
      return;
    }
    throw err;
  });
}
