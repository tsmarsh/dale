import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

vi.mock('../shared/config.js', () => ({
  getConfig: vi.fn().mockResolvedValue({
    tableName: 'dale-test-table',
    paymentLink: 'https://buy.stripe.com/test_abc123',
    telegramBotToken: 'test-bot-token',
    telegramWebhookSecret: 'test-webhook-secret',
    stripeSecretKey: 'sk_test_xxx',
    stripeWebhookSecret: 'whsec_xxx',
  }),
}));

const mockConstructEvent = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    })),
  };
});

vi.mock('./events.js', () => ({
  handleCheckoutCompleted: vi.fn(),
  handleInvoicePaid: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
}));

import { handler } from './webhook.js';
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from './events.js';

const mockedHandleCheckout = vi.mocked(handleCheckoutCompleted);
const mockedHandleInvoicePaid = vi.mocked(handleInvoicePaid);
const mockedHandlePaymentFailed = vi.mocked(handleInvoicePaymentFailed);
const mockedHandleSubDeleted = vi.mocked(handleSubscriptionDeleted);
const mockedHandleSubUpdated = vi.mocked(handleSubscriptionUpdated);

function makeEvent(body: string, signature = 'sig_test'): APIGatewayProxyEventV2 {
  return {
    headers: { 'stripe-signature': signature },
    body,
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Stripe webhook handler', () => {
  it('returns 400 for missing signature', async () => {
    const event = { headers: {}, body: '{}' } as unknown as APIGatewayProxyEventV2;
    const result = await handler(event);
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 for invalid signature', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(400);
  });

  it('routes checkout.session.completed', async () => {
    const session = { id: 'cs_test', client_reference_id: '123' };
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    });

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(200);
    expect(mockedHandleCheckout).toHaveBeenCalledWith('dale-test-table', session);
  });

  it('routes invoice.paid', async () => {
    const invoice = { id: 'in_test', customer: 'cus_abc' };
    mockConstructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: invoice },
    });

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(200);
    expect(mockedHandleInvoicePaid).toHaveBeenCalledWith('dale-test-table', invoice);
  });

  it('routes invoice.payment_failed', async () => {
    const invoice = { id: 'in_test', customer: 'cus_abc' };
    mockConstructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: invoice },
    });

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(200);
    expect(mockedHandlePaymentFailed).toHaveBeenCalledWith('dale-test-table', invoice);
  });

  it('routes customer.subscription.deleted', async () => {
    const sub = { id: 'sub_test', customer: 'cus_abc' };
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
    });

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(200);
    expect(mockedHandleSubDeleted).toHaveBeenCalledWith('dale-test-table', sub);
  });

  it('routes customer.subscription.updated', async () => {
    const sub = { id: 'sub_test', customer: 'cus_abc', status: 'active' };
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
    });

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(200);
    expect(mockedHandleSubUpdated).toHaveBeenCalledWith('dale-test-table', sub);
  });

  it('returns 200 for unhandled event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'some.other.event',
      data: { object: {} },
    });

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(200);
  });

  it('returns 500 when event handler throws', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: {} },
    });
    mockedHandleCheckout.mockRejectedValue(new Error('DB error'));

    const result = await handler(makeEvent('{}'));
    expect(result.statusCode).toBe(500);
  });
});
