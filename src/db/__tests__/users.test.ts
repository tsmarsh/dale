import { describe, it, expect, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../client.js';
import { getUserProfile, createUserProfile, getUserRoom, listUserRooms, listRoomSubscribers, updateUserRoomStatus } from '../users.js';

const ddbMock = mockClient(docClient);
const TABLE = 'dale-test-table';

beforeEach(() => {
  ddbMock.reset();
});

describe('getUserProfile', () => {
  it('returns profile when found', async () => {
    const profile = {
      pk: 'TENANT#t1',
      sk: 'USER#123',
      tenantId: 't1',
      telegramUserId: 123,
    };
    ddbMock.on(GetCommand).resolves({ Item: profile });

    const result = await getUserProfile(TABLE, 't1', 123);
    expect(result).toEqual(profile);
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getUserProfile(TABLE, 't1', 999);
    expect(result).toBeNull();
  });
});

describe('createUserProfile', () => {
  it('writes user profile with tenant prefix', async () => {
    ddbMock.on(PutCommand).resolves({});

    const result = await createUserProfile(TABLE, 't1', 123, 'Test', 'testuser');
    expect(result.pk).toBe('TENANT#t1');
    expect(result.sk).toBe('USER#123');
    expect(result.tenantId).toBe('t1');
    expect(result.telegramUserId).toBe(123);
    expect(result.firstName).toBe('Test');
  });
});

describe('getUserRoom', () => {
  it('returns user room when found', async () => {
    const userRoom = {
      pk: 'TENANT#t1',
      sk: 'USERROOM#123#ROOM#r1',
      subscriptionStatus: 'active',
    };
    ddbMock.on(GetCommand).resolves({ Item: userRoom });

    const result = await getUserRoom(TABLE, 't1', 123, 'r1');
    expect(result).toEqual(userRoom);
  });

  it('returns null when not found', async () => {
    ddbMock.on(GetCommand).resolves({});
    const result = await getUserRoom(TABLE, 't1', 123, 'missing');
    expect(result).toBeNull();
  });
});

describe('listUserRooms', () => {
  it('returns user rooms with correct key prefix', async () => {
    const rooms = [
      { pk: 'TENANT#t1', sk: 'USERROOM#123#ROOM#r1', roomId: 'r1' },
      { pk: 'TENANT#t1', sk: 'USERROOM#123#ROOM#r2', roomId: 'r2' },
    ];
    ddbMock.on(QueryCommand).resolves({ Items: rooms });

    const result = await listUserRooms(TABLE, 't1', 123);
    expect(result).toHaveLength(2);

    const call = ddbMock.commandCalls(QueryCommand)[0];
    expect(call.args[0].input.ExpressionAttributeValues![':skPrefix']).toBe('USERROOM#123#ROOM#');
  });
});

describe('listRoomSubscribers', () => {
  it('returns filtered subscribers for a room', async () => {
    const items = [
      { pk: 'TENANT#t1', sk: 'USERROOM#123#ROOM#r1', roomId: 'r1' },
      { pk: 'TENANT#t1', sk: 'USERROOM#456#ROOM#r2', roomId: 'r2' },
      { pk: 'TENANT#t1', sk: 'USERROOM#789#ROOM#r1', roomId: 'r1' },
    ];
    ddbMock.on(QueryCommand).resolves({ Items: items });

    const result = await listRoomSubscribers(TABLE, 't1', 'r1');
    expect(result).toHaveLength(2);
    expect(result.every((ur) => ur.roomId === 'r1')).toBe(true);
  });
});

describe('updateUserRoomStatus', () => {
  it('updates status without subscriptionId', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updateUserRoomStatus(TABLE, 't1', 123, 'r1', 'past_due');

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    const input = call.args[0].input;
    expect(input.Key).toEqual({
      pk: 'TENANT#t1',
      sk: 'USERROOM#123#ROOM#r1',
    });
    expect(input.ExpressionAttributeValues![':status']).toBe('past_due');
    expect(input.UpdateExpression).not.toContain('#subId');
  });

  it('updates status with subscriptionId', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updateUserRoomStatus(TABLE, 't1', 123, 'r1', 'active', 'sub_new');

    const call = ddbMock.commandCalls(UpdateCommand)[0];
    const input = call.args[0].input;
    expect(input.ExpressionAttributeValues![':subId']).toBe('sub_new');
    expect(input.UpdateExpression).toContain('#subId');
  });
});
