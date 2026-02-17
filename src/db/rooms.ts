import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './client.js';
import type { Room } from '../shared/types.js';

export async function createRoom(
  tableName: string,
  room: Omit<Room, 'pk' | 'sk' | 'GSI1pk' | 'GSI1sk' | 'createdAt' | 'updatedAt'>,
): Promise<Room> {
  const now = new Date().toISOString();
  const item: Room = {
    pk: `TENANT#${room.tenantId}`,
    sk: `ROOM#${room.roomId}`,
    tenantId: room.tenantId,
    roomId: room.roomId,
    name: room.name,
    description: room.description,
    telegramGroupId: room.telegramGroupId,
    paymentLink: room.paymentLink,
    paypalPaymentLink: room.paypalPaymentLink,
    priceDescription: room.priceDescription,
    isActive: room.isActive,
    createdAt: now,
    updatedAt: now,
    GSI1pk: room.telegramGroupId ? `TGGROUP#${room.telegramGroupId}` : undefined,
    GSI1sk: room.telegramGroupId ? 'ROOM' : undefined,
  };

  await docClient.send(
    new PutCommand({ TableName: tableName, Item: item }),
  );
  return item;
}

export async function getRoom(
  tableName: string,
  tenantId: string,
  roomId: string,
): Promise<Room | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${tenantId}`, sk: `ROOM#${roomId}` },
    }),
  );
  return (result.Item as Room) ?? null;
}

export async function listRoomsForTenant(
  tableName: string,
  tenantId: string,
): Promise<Room[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `TENANT#${tenantId}`,
        ':skPrefix': 'ROOM#',
      },
    }),
  );
  return (result.Items as Room[]) ?? [];
}

export async function getRoomByTelegramGroupId(
  tableName: string,
  telegramGroupId: number,
): Promise<Room | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1pk = :pk AND GSI1sk = :sk',
      ExpressionAttributeValues: {
        ':pk': `TGGROUP#${telegramGroupId}`,
        ':sk': 'ROOM',
      },
    }),
  );
  return (result.Items?.[0] as Room) ?? null;
}

export async function updateRoom(
  tableName: string,
  tenantId: string,
  roomId: string,
  updates: {
    name?: string;
    description?: string;
    telegramGroupId?: number;
    paymentLink?: string;
    paypalPaymentLink?: string;
    priceDescription?: string;
    isActive?: boolean;
  },
): Promise<void> {
  const expressionParts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

  if (updates.name !== undefined) {
    expressionParts.push('#name = :name');
    names['#name'] = 'name';
    values[':name'] = updates.name;
  }
  if (updates.description !== undefined) {
    expressionParts.push('#description = :description');
    names['#description'] = 'description';
    values[':description'] = updates.description;
  }
  if (updates.telegramGroupId !== undefined) {
    expressionParts.push('#telegramGroupId = :telegramGroupId');
    names['#telegramGroupId'] = 'telegramGroupId';
    values[':telegramGroupId'] = updates.telegramGroupId;
    expressionParts.push('GSI1pk = :gsi1pk');
    values[':gsi1pk'] = `TGGROUP#${updates.telegramGroupId}`;
    expressionParts.push('GSI1sk = :gsi1sk');
    values[':gsi1sk'] = 'ROOM';
  }
  if (updates.paymentLink !== undefined) {
    expressionParts.push('#paymentLink = :paymentLink');
    names['#paymentLink'] = 'paymentLink';
    values[':paymentLink'] = updates.paymentLink;
  }
  if (updates.paypalPaymentLink !== undefined) {
    expressionParts.push('#paypalPaymentLink = :paypalPaymentLink');
    names['#paypalPaymentLink'] = 'paypalPaymentLink';
    values[':paypalPaymentLink'] = updates.paypalPaymentLink;
  }
  if (updates.priceDescription !== undefined) {
    expressionParts.push('#priceDescription = :priceDescription');
    names['#priceDescription'] = 'priceDescription';
    values[':priceDescription'] = updates.priceDescription;
  }
  if (updates.isActive !== undefined) {
    expressionParts.push('#isActive = :isActive');
    names['#isActive'] = 'isActive';
    values[':isActive'] = updates.isActive;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${tenantId}`, sk: `ROOM#${roomId}` },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}
