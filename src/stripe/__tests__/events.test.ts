import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

vi.mock('../../db/stripe-mappings.js', () => ({
  getTenantByStripeCustomer: vi.fn(),
  createUserRoomMapping: vi.fn(),
}));

vi.mock('../../db/users.js', () => ({
  updateUserRoomStatus: vi.fn(),
}));

vi.mock('../../telegram/api.js', () => ({
  sendMessage: vi.fn(),
}));

import {
  handleCheckoutCompleted,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
} from '../events.js';
import { getTenantByStripeCustomer, createUserRoomMapping } from '../../db/stripe-mappings.js';
import { sendMessage } from '../../telegram/api.js';

const mockedGetMapping = vi.mocked(getTenantByStripeCustomer);
const mockedCreateMapping = vi.mocked(createUserRoomMapping);
const mockedSendMessage = vi.mocked(sendMessage);

const TABLE = 'dale-test-table';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleCheckoutCompleted', () => {
  it('creates mapping and notifies user', async () => {
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
    mockedGetMapping.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'STRIPECUST#cus_abc',
      tenantId: 'tenant-1',
      stripeCustomerId: 'cus_abc',
      telegramUserId: 123,
      createdAt: '',
      GSI1pk: 'STRIPECUST#cus_abc',
      GSI1sk: 'TENANT#tenant-1',
    });
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
    mockedGetMapping.mockResolvedValue({
      pk: 'TENANT#tenant-1',
      sk: 'STRIPECUST#cus_abc',
      tenantId: 'tenant-1',
      stripeCustomerId: 'cus_abc',
      telegramUserId: 123,
      createdAt: '',
      GSI1pk: 'STRIPECUST#cus_abc',
      GSI1sk: 'TENANT#tenant-1',
    });
    const sub = { customer: 'cus_abc' } as Stripe.Subscription;

    await handleSubscriptionDeleted(TABLE, 'tenant-1', 'bot-token', sub);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      'bot-token',
      123,
      expect.stringContaining('cancelled'),
    );
  });
});
