import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

vi.mock('../db/subscriptions.js', () => ({
  getTelegramUserIdByStripeCustomer: vi.fn(),
  createUserMapping: vi.fn(),
  updateSubscriptionStatus: vi.fn(),
}));

vi.mock('../telegram/api.js', () => ({
  sendMessage: vi.fn(),
}));

import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from './events.js';
import {
  getTelegramUserIdByStripeCustomer,
  createUserMapping,
  updateSubscriptionStatus,
} from '../db/subscriptions.js';
import { sendMessage } from '../telegram/api.js';

const mockedGetTelegramUserId = vi.mocked(getTelegramUserIdByStripeCustomer);
const mockedCreateUserMapping = vi.mocked(createUserMapping);
const mockedUpdateStatus = vi.mocked(updateSubscriptionStatus);
const mockedSendMessage = vi.mocked(sendMessage);

const TABLE = 'dale-test-table';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handleCheckoutCompleted', () => {
  it('creates mapping and notifies user', async () => {
    const session = {
      client_reference_id: '123',
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, session);

    expect(mockedCreateUserMapping).toHaveBeenCalledWith(TABLE, 123, 'cus_abc', 'sub_xyz');
    expect(mockedSendMessage).toHaveBeenCalledWith(123, expect.stringContaining('active'));
  });

  it('skips if missing fields', async () => {
    const session = {
      client_reference_id: null,
      customer: 'cus_abc',
      subscription: 'sub_xyz',
    } as unknown as Stripe.Checkout.Session;

    await handleCheckoutCompleted(TABLE, session);

    expect(mockedCreateUserMapping).not.toHaveBeenCalled();
  });
});

describe('handleInvoicePaid', () => {
  it('updates status to active', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const invoice = { customer: 'cus_abc' } as Stripe.Invoice;

    await handleInvoicePaid(TABLE, invoice);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'active');
  });

  it('skips if no mapping found', async () => {
    mockedGetTelegramUserId.mockResolvedValue(null);
    const invoice = { customer: 'cus_unknown' } as Stripe.Invoice;

    await handleInvoicePaid(TABLE, invoice);

    expect(mockedUpdateStatus).not.toHaveBeenCalled();
  });
});

describe('handleInvoicePaymentFailed', () => {
  it('sets past_due and notifies', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const invoice = { customer: 'cus_abc' } as Stripe.Invoice;

    await handleInvoicePaymentFailed(TABLE, invoice);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'past_due');
    expect(mockedSendMessage).toHaveBeenCalledWith(123, expect.stringContaining('payment failed'));
  });
});

describe('handleSubscriptionDeleted', () => {
  it('sets cancelled and notifies', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const sub = { customer: 'cus_abc' } as Stripe.Subscription;

    await handleSubscriptionDeleted(TABLE, sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'cancelled');
    expect(mockedSendMessage).toHaveBeenCalledWith(123, expect.stringContaining('cancelled'));
  });
});

describe('handleSubscriptionUpdated', () => {
  it('maps active stripe status', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const sub = {
      id: 'sub_xyz',
      customer: 'cus_abc',
      status: 'active',
    } as Stripe.Subscription;

    await handleSubscriptionUpdated(TABLE, sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'active', 'sub_xyz');
  });

  it('maps past_due stripe status', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const sub = {
      id: 'sub_xyz',
      customer: 'cus_abc',
      status: 'past_due',
    } as Stripe.Subscription;

    await handleSubscriptionUpdated(TABLE, sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'past_due', 'sub_xyz');
  });

  it('maps canceled stripe status to cancelled', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const sub = {
      id: 'sub_xyz',
      customer: 'cus_abc',
      status: 'canceled',
    } as Stripe.Subscription;

    await handleSubscriptionUpdated(TABLE, sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'cancelled', 'sub_xyz');
  });

  it('maps trialing to active', async () => {
    mockedGetTelegramUserId.mockResolvedValue(123);
    const sub = {
      id: 'sub_xyz',
      customer: 'cus_abc',
      status: 'trialing',
    } as Stripe.Subscription;

    await handleSubscriptionUpdated(TABLE, sub);

    expect(mockedUpdateStatus).toHaveBeenCalledWith(TABLE, 123, 'active', 'sub_xyz');
  });
});
