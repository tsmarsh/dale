import { describe, it, expect } from 'vitest';
import type { Room, UserRoom } from '../../shared/types.js';
import {
  handleStartDM,
  handleStartGroup,
  handleStatus,
  handleHelp,
  handleUnknownCommand,
} from '../commands.js';

const makeRoom = (overrides: Partial<Room> = {}): Room => ({
  pk: 'TENANT#t1',
  sk: 'ROOM#r1',
  tenantId: 't1',
  roomId: 'r1',
  name: 'VIP Room',
  paymentLink: 'https://buy.stripe.com/test',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const makeUserRoom = (overrides: Partial<UserRoom> = {}): UserRoom => ({
  pk: 'TENANT#t1',
  sk: 'USERROOM#123#ROOM#r1',
  tenantId: 't1',
  telegramUserId: 123,
  roomId: 'r1',
  subscriptionStatus: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  GSI1pk: 'TGUSER#123',
  GSI1sk: 'TENANT#t1#ROOM#r1',
  ...overrides,
});

describe('handleStartDM', () => {
  it('shows no rooms message when no rooms exist', () => {
    const result = handleStartDM([], [], 't1', 123);
    expect(result).toContain('no rooms available');
  });

  it('shows subscribed rooms as active', () => {
    const rooms = [makeRoom()];
    const userRooms = [makeUserRoom()];
    const result = handleStartDM(rooms, userRooms, 't1', 123);
    expect(result).toContain('VIP Room');
    expect(result).toContain('subscribed');
  });

  it('shows unsubscribed rooms with payment link', () => {
    const rooms = [makeRoom()];
    const result = handleStartDM(rooms, [], 't1', 456);
    expect(result).toContain('VIP Room');
    expect(result).toContain('client_reference_id=t1:456:r1');
  });

  it('skips inactive rooms', () => {
    const rooms = [makeRoom({ isActive: false })];
    const result = handleStartDM(rooms, [], 't1', 123);
    expect(result).not.toContain('VIP Room');
  });
});

describe('handleStartGroup', () => {
  it('shows welcome back for active subscriber', () => {
    const result = handleStartGroup(makeRoom(), makeUserRoom(), 't1', 123);
    expect(result).toContain('Welcome back');
    expect(result).toContain('VIP Room');
  });

  it('shows payment link for non-subscriber', () => {
    const result = handleStartGroup(makeRoom(), null, 't1', 456);
    expect(result).toContain('Subscribe here');
    expect(result).toContain('client_reference_id=t1:456:r1');
  });
});

describe('handleStatus', () => {
  it('shows no subscriptions message', () => {
    const result = handleStatus([], []);
    expect(result).toContain('do not have any subscriptions');
  });

  it('lists subscriptions with status', () => {
    const rooms = [makeRoom()];
    const userRooms = [makeUserRoom()];
    const result = handleStatus(userRooms, rooms);
    expect(result).toContain('VIP Room');
    expect(result).toContain('active');
  });
});

describe('handleHelp', () => {
  it('lists available commands', () => {
    const result = handleHelp();
    expect(result).toContain('/start');
    expect(result).toContain('/status');
    expect(result).toContain('/help');
  });
});

describe('handleUnknownCommand', () => {
  it('suggests /help', () => {
    expect(handleUnknownCommand()).toContain('/help');
  });
});
