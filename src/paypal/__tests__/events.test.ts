import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/paypal-mappings.js', () => ({
  getTenantByPayPalPayer: vi.fn(),
  createPayPalUserRoomMapping: vi.fn(),
}));

vi.mock('../../telegram/api.js', () => ({
  sendMessage: vi.fn(),
}));

import {
  parseCustomId,
  handleSubscriptionActivated,
  handleSubscriptionCancelled,
  handleSubscriptionSuspended,
} from '../events.js';
import { getTenantByPayPalPayer, createPayPalUserRoomMapping } from '../../db/paypal-mappings.js';
import { sendMessage } from '../../telegram/api.js';

const mockedGetMapping = vi.mocked(getTenantByPayPalPayer);
const mockedCreateMapping = vi.mocked(createPayPalUserRoomMapping);
const mockedSendMessage = vi.mocked(sendMessage);

const TABLE = 'dale-test-table';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseCustomId', () => {
  it('parses valid custom_id', () => {
    const result = parseCustomId('tenant-1:123:room-1');
    expect(result).toEqual({ tenantId: 'tenant-1', telegramUserId: 123, roomId: 'room-1' });
  });

  it('returns null for null', () => {
    expect(parseCustomId(null)).toBeNull();
  });

  it('returns null for invalid format', () => {
    expect(parseCustomId('bad-format')).toBeNull();
  });

  it('returns null for wrong number of parts', () => {
    expect(parseCustomId('a:b')).toBeNull();
    expect(parseCustomId('a:b:c:d')).toBeNull();
  });

  it('returns null for non-numeric userId', () => {
    expect(parseCustomId('tenant:abc:room')).toBeNull();
  });
});

describe('handleSubscriptionActivated', () => {
  it('creates mapping and notifies user', async () => {
    const event = {
      resource: {
        id: 'I-SUB456',
        custom_id: 'tenant-1:123:room-1',
        subscriber: { payer_id: 'PP-123' },
      },
    };

    await handleSubscriptionActivated(TABLE, 'tenant-1', 'bot-token', event);

    expect(mockedCreateMapping).toHaveBeenCalledWith(
      TABLE, 'tenant-1', 123, 'room-1', 'PP-123', 'I-SUB456',
    );
    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('active'),
    );
  });

  it('skips if custom_id is invalid', async () => {
    const event = {
      resource: {
        id: 'I-SUB456',
        custom_id: 'bad-format',
        subscriber: { payer_id: 'PP-123' },
      },
    };

    await handleSubscriptionActivated(TABLE, 'tenant-1', 'bot-token', event);
    expect(mockedCreateMapping).not.toHaveBeenCalled();
  });

  it('skips if tenant mismatch', async () => {
    const event = {
      resource: {
        id: 'I-SUB456',
        custom_id: 'other-tenant:123:room-1',
        subscriber: { payer_id: 'PP-123' },
      },
    };

    await handleSubscriptionActivated(TABLE, 'tenant-1', 'bot-token', event);
    expect(mockedCreateMapping).not.toHaveBeenCalled();
  });

  it('skips if payer_id is missing', async () => {
    const event = {
      resource: {
        id: 'I-SUB456',
        custom_id: 'tenant-1:123:room-1',
        subscriber: {},
      },
    };

    await handleSubscriptionActivated(TABLE, 'tenant-1', 'bot-token', event);
    expect(mockedCreateMapping).not.toHaveBeenCalled();
  });
});

describe('handleSubscriptionCancelled', () => {
  it('sends cancellation message', async () => {
    mockedGetMapping.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'PAYPALCUST#PP-123',
      tenantId: 'tenant-1',
      paypalPayerId: 'PP-123',
      telegramUserId: 123,
      createdAt: '',
      GSI1pk: 'PAYPALCUST#PP-123',
      GSI1sk: 'TENANT#tenant-1',
    });
    const event = {
      resource: {
        subscriber: { payer_id: 'PP-123' },
      },
    };

    await handleSubscriptionCancelled(TABLE, 'tenant-1', 'bot-token', event);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('cancelled'),
    );
  });

  it('skips if no mapping found', async () => {
    mockedGetMapping.mockResolvedValue(null);
    const event = {
      resource: {
        subscriber: { payer_id: 'PP-unknown' },
      },
    };

    await handleSubscriptionCancelled(TABLE, 'tenant-1', 'bot-token', event);
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });
});

describe('handleSubscriptionSuspended', () => {
  it('sends past due message', async () => {
    mockedGetMapping.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'PAYPALCUST#PP-123',
      tenantId: 'tenant-1',
      paypalPayerId: 'PP-123',
      telegramUserId: 123,
      createdAt: '',
      GSI1pk: 'PAYPALCUST#PP-123',
      GSI1sk: 'TENANT#tenant-1',
    });
    const event = {
      resource: {
        subscriber: { payer_id: 'PP-123' },
      },
    };

    await handleSubscriptionSuspended(TABLE, 'tenant-1', 'bot-token', event);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('past due'),
    );
  });
});
