import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../client.js';
import { createRoom, getRoom, listRoomsForTenant, getRoomByTelegramGroupId, updateRoom } from '../rooms.js';

const ddbMock = mockClient(docClient);
const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('createRoom', () => {
  it('writes room with correct keys and GSI', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await createRoom(TABLE, {
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'VIP Room',
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      telegramGroupId: -100123,
    });

    expect(result.pk).toBe('TENANT#tenant-1');
    expect(result.sk).toBe('ROOM#room-1');
    expect(result.GSI1pk).toBe('TGGROUP#-100123');
    expect(result.GSI1sk).toBe('ROOM');
    expect(result.name).toBe('VIP Room');
  });

  it('creates room without telegram group', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await createRoom(TABLE, {
      tenantId: 'tenant-1',
      roomId: 'room-2',
      name: 'New Room',
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
    });

    expect(result.GSI1pk).toBeUndefined();
    expect(result.GSI1sk).toBeUndefined();
  });
});

describe('getRoom', () => {
  it('returns room when found', async () => {
    const room = { pk: 'TENANT#t1', sk: 'ROOM#r1', name: 'Test' };
    ddbMock.on(GetCommand).resolves({ Item: room });

    const result = await getRoom(TABLE, 't1', 'r1');
    expect(result).toEqual(room);
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getRoom(TABLE, 't1', 'missing');
    expect(result).toBeNull();
  });
});

describe('listRoomsForTenant', () => {
  it('returns rooms with begins_with query', async () => {
    const rooms = [
      { pk: 'TENANT#t1', sk: 'ROOM#r1', name: 'Room 1' },
      { pk: 'TENANT#t1', sk: 'ROOM#r2', name: 'Room 2' },
    ];
    ddbMock.on(QueryCommand).resolves({ Items: rooms });

    const result = await listRoomsForTenant(TABLE, 't1');
    expect(result).toHaveLength(2);

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.ExpressionAttributeValues![':skPrefix']).toBe('ROOM#');
  });
});

describe('getRoomByTelegramGroupId', () => {
  it('queries GSI1 for telegram group', async () => {
    const room = { pk: 'TENANT#t1', sk: 'ROOM#r1', telegramGroupId: -100123 };
    ddbMock.on(QueryCommand).resolves({ Items: [room] });

    const result = await getRoomByTelegramGroupId(TABLE, -100123);
    expect(result).toEqual(room);

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.IndexName).toBe('GSI1');
    expect(call.args[0].input.ExpressionAttributeValues![':pk']).toBe('TGGROUP#-100123');
  });
});

describe('updateRoom', () => {
  it('updates room fields', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updateRoom(TABLE, 't1', 'r1', { name: 'Updated', isActive: false });

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    const input = call.args[0].input;
    expect(input.Key).toEqual({ pk: 'TENANT#t1', sk: 'ROOM#r1' });
    expect(input.ExpressionAttributeValues![':name']).toBe('Updated');
    expect(input.ExpressionAttributeValues![':isActive']).toBe(false);
  });
});
