import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

vi.mock('../../db/stripe-mappings.js', () => ({
  getTenantByStripeCustomer: vi.fn(),
  createUserRoomMapping: vi.fn(),
}));

vi.mock('../../db/users.js', () => ({
  updateUserRoomStatus: vi.fn(),
  listUserRooms: vi.fn(),
}));

vi.mock('../../telegram/api.js', () => ({
  sendMessage: vi.fn(),
  createChatInviteLink: vi.fn(),
  banChatMember: vi.fn(),
  unbanChatMember: vi.fn(),
}));

vi.mock('../../db/rooms.js', () => ({
  getRoom: vi.fn(),
}));

import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '../events.js';
import { getTenantByStripeCustomer, createUserRoomMapping } from '../../db/stripe-mappings.js';
import { updateUserRoomStatus, listUserRooms } from '../../db/users.js';
import { sendMessage, createChatInviteLink, banChatMember, unbanChatMember } from '../../telegram/api.js';
import { getRoom } from '../../db/rooms.js';

const mockedGetMapping = vi.mocked(getTenantByStripeCustomer);
const mockedCreateMapping = vi.mocked(createUserRoomMapping);
const mockedSendMessage = vi.mocked(sendMessage);
const mockedCreateInviteLink = vi.mocked(createChatInviteLink);
const mockedBanChatMember = vi.mocked(banChatMember);
const mockedUnbanChatMember = vi.mocked(unbanChatMember);
const mockedListUserRooms = vi.mocked(listUserRooms);
const mockedUpdateStatus = vi.mocked(updateUserRoomStatus);
const mockedGetRoom = vi.mocked(getRoom);

const TABLE = 'dale-test-table';

const baseMapping = {
  pk: 'TENANT#tenant-1',
  sk: 'STRIPECUST#cus_abc',
  tenantId: 'tenant-1',
  stripeCustomerId: 'cus_abc',
  telegramUserId: 123,
  createdAt: '',
  GSI1pk: 'STRIPECUST#cus_abc',
  GSI1sk: 'TENANT#tenant-1',
};

const baseUserRoom = {
  pk: 'TENANT#tenant-1',
  sk: 'USERROOM#123#ROOM#room-1',
  tenantId: 'tenant-1',
  telegramUserId: 123,
  roomId: 'room-1',
  subscriptionStatus: 'active' as const,
  stripeSubscriptionId: 'sub_xyz',
  createdAt: '',
  updatedAt: '',
  GSI1pk: 'TGUSER#123',
  GSI1sk: 'TENANT#tenant-1#ROOM#room-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleCheckoutCompleted', () => {
  it('creates mapping and notifies user', async () => {
    mockedGetRoom.mockResolvedValue(null);
    const session = {
      client_reference_id: 'tenant-1:123:room-1',
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, 'tenant-1', 'bot-token', session);

    expect(mockedCreateMapping).toHaveBeenCalledWith(
      TABLE, 'tenant-1', 123, 'room-1', 'cus_abc', 'sub_xyz',
    );
    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('active'),
    );
  });

  it('creates invite link and includes it in message when room has telegramGroupId', async () => {
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      telegramGroupId: -1001234567890,
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    mockedCreateInviteLink.mockResolvedValue('https://t.me/+abc123');

    const session = {
      client_reference_id: 'tenant-1:123:room-1',
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, 'tenant-1', 'bot-token', session);

    expect(mockedCreateInviteLink).toHaveBeenCalledWith('bot-token', -1001234567890);
    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('https://t.me/+abc123'),
    );
  });

  it('sends message without invite link if createChatInviteLink fails', async () => {
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      telegramGroupId: -1001234567890,
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    mockedCreateInviteLink.mockResolvedValue(null);

    const session = {
      client_reference_id: 'tenant-1:123:room-1',
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, 'tenant-1', 'bot-token', session);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('active'),
    );
    const msg = mockedSendMessage.mock.calls[0][2];
    expect(msg).not.toContain('t.me');
  });

  it('skips if client_reference_id is invalid', async () => {
    const session = {
      client_reference_id: 'bad-format',
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, 'tenant-1', 'bot-token', session);
    expect(mockedCreateMapping).not.toHaveBeenCalled();
  });

  it('skips if tenant mismatch', async () => {
    const session = {
      client_reference_id: 'other-tenant:123:room-1',
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, 'tenant-1', 'bot-token', session);
    expect(mockedCreateMapping).not.toHaveBeenCalled();
  });
});

describe('handleInvoicePaymentFailed', () => {
  it('sends payment failed message', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    const invoice = { customer: 'cus_abc' } as Stripe.Invoice;

    await handleInvoicePaymentFailed(TABLE, 'tenant-1', 'bot-token', invoice);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('payment failed'),
    );
  });

  it('skips if no mapping found', async () => {
    mockedGetMapping.mockResolvedValue(null);
    const invoice = { customer: 'cus_unknown' } as Stripe.Invoice;

    await handleInvoicePaymentFailed(TABLE, 'tenant-1', 'bot-token', invoice);
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });
});

describe('handleSubscriptionDeleted', () => {
  it('sends cancellation message', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([]);
    const sub = { customer: 'cus_abc', id: 'sub_xyz' } as Stripe.Subscription;

    await handleSubscriptionDeleted(TABLE, 'tenant-1', 'bot-token', sub);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('cancelled'),
    );
  });

  it('bans user from group and updates status when subscription is deleted', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([baseUserRoom]);
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      telegramGroupId: -1001234567890,
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    mockedBanChatMember.mockResolvedValue(true);

    const sub = { customer: 'cus_abc', id: 'sub_xyz' } as Stripe.Subscription;
    await handleSubscriptionDeleted(TABLE, 'tenant-1', 'bot-token', sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 'tenant-1', 123, 'room-1', 'cancelled');
    expect(mockedBanChatMember).toHaveBeenCalledWith('bot-token', -1001234567890, 123);
  });

  it('skips ban if room has no telegramGroupId', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([baseUserRoom]);
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });

    const sub = { customer: 'cus_abc', id: 'sub_xyz' } as Stripe.Subscription;
    await handleSubscriptionDeleted(TABLE, 'tenant-1', 'bot-token', sub);

    expect(mockedBanChatMember).not.toHaveBeenCalled();
    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 'tenant-1', 123, 'room-1', 'cancelled');
  });
});

describe('handleInvoicePaid', () => {
  it('updates status to active for matching subscription', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([baseUserRoom]);
    mockedGetRoom.mockResolvedValue(null);

    const invoice = { customer: 'cus_abc', subscription: 'sub_xyz' } as Stripe.Invoice;
    await handleInvoicePaid(TABLE, 'tenant-1', 'bot-token', invoice);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 'tenant-1', 123, 'room-1', 'active');
  });

  it('unbans user from group if they were previously cancelled', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([{ ...baseUserRoom, subscriptionStatus: 'cancelled' }]);
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      telegramGroupId: -1001234567890,
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    mockedUnbanChatMember.mockResolvedValue(true);

    const invoice = { customer: 'cus_abc', subscription: 'sub_xyz' } as Stripe.Invoice;
    await handleInvoicePaid(TABLE, 'tenant-1', 'bot-token', invoice);

    expect(mockedUnbanChatMember).toHaveBeenCalledWith('bot-token', -1001234567890, 123);
  });

  it('skips if no mapping found', async () => {
    mockedGetMapping.mockResolvedValue(null);
    const invoice = { customer: 'cus_unknown', subscription: 'sub_xyz' } as Stripe.Invoice;

    await handleInvoicePaid(TABLE, 'tenant-1', 'bot-token', invoice);
    expect(mockedUpdateStatus).not.toHaveBeenCalled();
  });
});

describe('handleSubscriptionUpdated', () => {
  it('updates status to active and unbans user', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([{ ...baseUserRoom, subscriptionStatus: 'cancelled' }]);
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      telegramGroupId: -1001234567890,
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    mockedUnbanChatMember.mockResolvedValue(true);

    const sub = { customer: 'cus_abc', id: 'sub_xyz', status: 'active' } as Stripe.Subscription;
    await handleSubscriptionUpdated(TABLE, 'tenant-1', 'bot-token', sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 'tenant-1', 123, 'room-1', 'active');
    expect(mockedUnbanChatMember).toHaveBeenCalledWith('bot-token', -1001234567890, 123);
  });

  it('updates status to cancelled and bans user', async () => {
    mockedGetMapping.mockResolvedValue(baseMapping);
    mockedListUserRooms.mockResolvedValue([baseUserRoom]);
    mockedGetRoom.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'ROOM#room-1',
      tenantId: 'tenant-1',
      roomId: 'room-1',
      name: 'Cool Club',
      telegramGroupId: -1001234567890,
      paymentLink: 'https://buy.stripe.com/test',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
    mockedBanChatMember.mockResolvedValue(true);

    const sub = { customer: 'cus_abc', id: 'sub_xyz', status: 'canceled' } as Stripe.Subscription;
    await handleSubscriptionUpdated(TABLE, 'tenant-1', 'bot-token', sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 'tenant-1', 123, 'room-1', 'cancelled');
    expect(mockedBanChatMember).toHaveBeenCalledWith('bot-token', -1001234567890, 123);
  });

  it('skips if no mapping found', async () => {
    mockedGetMapping.mockResolvedValue(null);
    const sub = { customer: 'cus_unknown', id: 'sub_xyz', status: 'active' } as Stripe.Subscription;

    await handleSubscriptionUpdated(TABLE, 'tenant-1', 'bot-token', sub);
    expect(mockedUpdateStatus).not.toHaveBeenCalled();
  });
});
