import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/users.js', () => ({
  listRoomSubscribers: vi.fn(),
}));

import { handleListSubscribers } from '../routes/subscribers.js';
import { listRoomSubscribers } from '../../db/users.js';

const mockedListSubscribers = vi.mocked(listRoomSubscribers);

const TABLE = 'dale-test-table';
const AUTH = { cognitoSub: 'sub-123', tenantId: 'tenant-1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleListSubscribers', () => {
  it('returns subscribers list', async () => {
    mockedListSubscribers.mockResolvedValue([
      {
        pk: 'TENANT#tenant-1', sk: 'USERROOM#123#ROOM#r1',
        tenantId: 'tenant-1', telegramUserId: 123, roomId: 'r1',
        subscriptionStatus: 'active', createdAt: '', updatedAt: '',
        GSI1pk: 'TGUSER#123', GSI1sk: 'TENANT#tenant-1#ROOM#r1',
      },
    ]);

    const result = await handleListSubscribers(TABLE, AUTH, 'r1');
    expect(result.statusCode).toBe(200);
    const subs = JSON.parse(result.body);
    expect(subs).toHaveLength(1);
    expect(subs[0].telegramUserId).toBe(123);
  });
});
