import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { SubscriptionStatus, UserProfile, StripeMapping } from '../shared/types.js';

const client = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(client);

export async function getUserProfile(
  tableName: string,
  telegramUserId: number,
): Promise<UserProfile | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `USER#${telegramUserId}`, sk: `PROFILE` },
    }),
  );
  return (result.Item as UserProfile) ?? null;
}

export async function getTelegramUserIdByStripeCustomer(
  tableName: string,
  stripeCustomerId: string,
): Promise<number | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `STRIPE#${stripeCustomerId}`, sk: `MAPPING` },
    }),
  );
  return (result.Item as StripeMapping)?.telegramUserId ?? null;
}

export async function createUserMapping(
  tableName: string,
  telegramUserId: number,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: {
              pk: `USER#${telegramUserId}`,
              sk: `PROFILE`,
              telegramUserId,
              stripeCustomerId,
              stripeSubscriptionId,
              subscriptionStatus: 'active',
              createdAt: now,
              updatedAt: now,
            } satisfies UserProfile,
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: {
              pk: `STRIPE#${stripeCustomerId}`,
              sk: `MAPPING`,
              stripeCustomerId,
              telegramUserId,
              createdAt: now,
            } satisfies StripeMapping,
          },
        },
      ],
    }),
  );
}

export async function updateSubscriptionStatus(
  tableName: string,
  telegramUserId: number,
  status: SubscriptionStatus,
  stripeSubscriptionId?: string,
): Promise<void> {
  const expressionParts = [
    '#status = :status',
    '#updatedAt = :updatedAt',
  ];
  const names: Record<string, string> = {
    '#status': 'subscriptionStatus',
    '#updatedAt': 'updatedAt',
  };
  const values: Record<string, string> = {
    ':status': status,
    ':updatedAt': new Date().toISOString(),
  };

  if (stripeSubscriptionId) {
    expressionParts.push('#subId = :subId');
    names['#subId'] = 'stripeSubscriptionId';
    values[':subId'] = stripeSubscriptionId;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `USER#${telegramUserId}`, sk: `PROFILE` },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}
