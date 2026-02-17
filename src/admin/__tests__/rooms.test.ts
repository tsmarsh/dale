import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/rooms.js', () => ({
  createRoom: vi.fn().mockImplementation(async (_t, r) => ({ ...r, createdAt: '', updatedAt: '' })),
  getRoom: vi.fn(),
  listRoomsForTenant: vi.fn(),
  updateRoom: vi.fn(),
}));

vi.mock('ulid', () => ({
  ulid: vi.fn().mockReturnValue('01ROOM'),
}));

import { handleListRooms, handleGetRoom, handleCreateRoom, handleUpdateRoom } from '../routes/rooms.js';
import { getRoom, listRoomsForTenant } from '../../db/rooms.js';

const mockedGetRoom = vi.mocked(getRoom);
const mockedListRooms = vi.mocked(listRoomsForTenant);

const TABLE = 'dale-test-table';
const AUTH = { cognitoSub: 'sub-123', tenantId: 'tenant-1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleListRooms', () => {
  it('returns rooms list', async () => {
    mockedListRooms.mockResolvedValue([
      {
        pk: 'TENANT#tenant-1', sk: 'ROOM#r1', tenantId: 'tenant-1', roomId: 'r1',
        name: 'VIP', paymentLink: 'https://pay', isActive: true, createdAt: '', updatedAt: '',
      },
    ]);

    const result = await handleListRooms(TABLE, AUTH);
    expect(result.statusCode).toBe(200);
    const rooms = JSON.parse(result.body);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].roomId).toBe('r1');
  });
});

describe('handleGetRoom', () => {
  it('returns room detail', async () => {
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1', sk: 'ROOM#r1', tenantId: 'tenant-1', roomId: 'r1',
      name: 'VIP', paymentLink: 'https://pay', isActive: true, createdAt: '', updatedAt: '',
    });

    const result = await handleGetRoom(TABLE, AUTH, 'r1');
    expect(result.statusCode).toBe(200);
  });

  it('returns 404 when not found', async () => {
    mockedGetRoom.mockResolvedValue(null);
    const result = await handleGetRoom(TABLE, AUTH, 'missing');
    expect(result.statusCode).toBe(404);
  });
});

describe('handleCreateRoom', () => {
  it('creates room with Stripe link and returns roomId', async () => {
    const result = await handleCreateRoom(TABLE, AUTH, JSON.stringify({
      name: 'New Room',
      paymentLink: 'https://pay',
    }));
    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.roomId).toBe('01ROOM');
  });

  it('creates room with PayPal link only', async () => {
    const result = await handleCreateRoom(TABLE, AUTH, JSON.stringify({
      name: 'PayPal Room',
      paypalPaymentLink: 'https://paypal.com/subscribe?plan_id=P-123',
    }));
    expect(result.statusCode).toBe(201);
  });

  it('creates room with both links', async () => {
    const result = await handleCreateRoom(TABLE, AUTH, JSON.stringify({
      name: 'Both Room',
      paymentLink: 'https://stripe-pay',
      paypalPaymentLink: 'https://paypal-pay',
    }));
    expect(result.statusCode).toBe(201);
  });

  it('returns 400 when no payment link provided', async () => {
    const result = await handleCreateRoom(TABLE, AUTH, JSON.stringify({ name: 'No Link' }));
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toContain('payment link');
  });
});

describe('handleUpdateRoom', () => {
  it('updates room', async () => {
    const result = await handleUpdateRoom(TABLE, AUTH, 'r1', JSON.stringify({ name: 'Updated' }));
    expect(result.statusCode).toBe(200);
  });

  it('returns 400 for invalid JSON', async () => {
    const result = await handleUpdateRoom(TABLE, AUTH, 'r1', 'bad');
    expect(result.statusCode).toBe(400);
  });
});
