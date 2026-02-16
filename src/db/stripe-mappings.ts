import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './client.js';
import type { StripeMapping, UserProfile, UserRoom } from '../shared/types.js';

export async function getTenantByStripeCustomer(
  tableName: string,
  stripeCustomerId: string,
): Promise<StripeMapping | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `STRIPECUST#${stripeCustomerId}`,
      },
    }),
  );
  return (result.Items?.[0] as StripeMapping) ?? null;
}

export async function createUserRoomMapping(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
  roomId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
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
    stripeCustomerId,
    stripeSubscriptionId,
    createdAt: now,
    updatedAt: now,
    GSI1pk: `TGUSER#${telegramUserId}`,
    GSI1sk: `TENANT#${tenantId}#ROOM#${roomId}`,
  };

  const stripeMapping: StripeMapping = {
    pk: `TENANT#${tenantId}`,
    sk: `STRIPECUST#${stripeCustomerId}`,
    tenantId,
    stripeCustomerId,
    telegramUserId,
    createdAt: now,
    GSI1pk: `STRIPECUST#${stripeCustomerId}`,
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
            Item: stripeMapping,
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
            { Put: { TableName: tableName, Item: stripeMapping } },
          ],
        }),
      );
      return;
    }
    throw err;
  });
}
