import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './client.js';
import type { SubscriptionStatus, UserProfile, UserRoom } from '../shared/types.js';

export async function getUserProfile(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
): Promise<UserProfile | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${tenantId}`, sk: `USER#${telegramUserId}` },
    }),
  );
  return (result.Item as UserProfile) ?? null;
}

export async function createUserProfile(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
  firstName?: string,
  username?: string,
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const item: UserProfile = {
    pk: `TENANT#${tenantId}`,
    sk: `USER#${telegramUserId}`,
    tenantId,
    telegramUserId,
    firstName,
    username,
    createdAt: now,
    updatedAt: now,
  };
  await docClient.send(
    new PutCommand({ TableName: tableName, Item: item }),
  );
  return item;
}

export async function getUserRoom(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
  roomId: string,
): Promise<UserRoom | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `TENANT#${tenantId}`,
        sk: `USERROOM#${telegramUserId}#ROOM#${roomId}`,
      },
    }),
  );
  return (result.Item as UserRoom) ?? null;
}

export async function listUserRooms(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
): Promise<UserRoom[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':skPrefix': `USERROOM#${telegramUserId}#ROOM#`,
      },
    }),
  );
  return (result.Items as UserRoom[]) ?? [];
}

export async function listRoomSubscribers(
  tableName: string,
  tenantId: string,
  roomId: string,
): Promise<UserRoom[]> {
  // Query all USERROOM entries for this tenant, then filter by roomId
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':skPrefix': 'USERROOM#',
      },
    }),
  );
  const allUserRooms = (result.Items as UserRoom[]) ?? [];
  return allUserRooms.filter((ur) => ur.roomId === roomId);
}

export async function updateUserRoomStatus(
  tableName: string,
  tenantId: string,
  telegramUserId: number,
  roomId: string,
  status: SubscriptionStatus,
  stripeSubscriptionId?: string,
): Promise<void> {
  const expressionParts = ['#status = :status', '#updatedAt = :updatedAt'];
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
      Key: {
        pk: `TENANT#${tenantId}`,
        sk: `USERROOM#${telegramUserId}#ROOM#${roomId}`,
      },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}
