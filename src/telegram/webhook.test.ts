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

vi.mock('../db/subscriptions.js', () => ({
  getUserProfile: vi.fn(),
}));

vi.mock('./api.js', () => ({
  sendMessage: vi.fn(),
}));

import { handler } from './webhook.js';
import { getUserProfile } from '../db/subscriptions.js';
import { sendMessage } from './api.js';

const mockedGetUserProfile = vi.mocked(getUserProfile);
const mockedSendMessage = vi.mocked(sendMessage);

function makeEvent(text: string, secret = 'test-webhook-secret'): APIGatewayProxyEventV2 {
  return {
    headers: { 'x-telegram-bot-api-secret-token': secret },
    body: JSON.stringify({
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 123, is_bot: false, first_name: 'Test' },
        chat: { id: 123, type: 'private' },
        date: 1234567890,
        text,
      },
    }),
  } as unknown as APIGatewayProxyEventV2;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Telegram webhook handler', () => {
  it('always returns 200', async () => {
    const result = await handler(makeEvent('/start'));
    expect(result.statusCode).toBe(200);
  });

  it('rejects invalid secret silently', async () => {
    const result = await handler(makeEvent('/start', 'wrong'));
    expect(result.statusCode).toBe(200);
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });

  it('handles /start for new user', async () => {
    mockedGetUserProfile.mockResolvedValue(null);
    await handler(makeEvent('/start'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('client_reference_id=123'),
    );
  });

  it('handles /start for active subscriber', async () => {
    mockedGetUserProfile.mockResolvedValue({
      pk: 'USER#123',
      sk: 'PROFILE',
      telegramUserId: 123,
      subscriptionStatus: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    await handler(makeEvent('/start'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('Welcome back'),
    );
  });

  it('handles /status', async () => {
    mockedGetUserProfile.mockResolvedValue(null);
    await handler(makeEvent('/status'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('do not have an account'),
    );
  });

  it('handles /help', async () => {
    mockedGetUserProfile.mockResolvedValue(null);
    await handler(makeEvent('/help'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('/start'),
    );
  });

  it('handles /cancel', async () => {
    mockedGetUserProfile.mockResolvedValue(null);
    await handler(makeEvent('/cancel'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('cancel'),
    );
  });

  it('handles unknown command', async () => {
    mockedGetUserProfile.mockResolvedValue(null);
    await handler(makeEvent('/unknown'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('/help'),
    );
  });

  it('gates non-command text for non-subscribers', async () => {
    mockedGetUserProfile.mockResolvedValue(null);
    await handler(makeEvent('hello'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('need an active subscription'),
    );
  });

  it('echoes non-command text for active subscribers', async () => {
    mockedGetUserProfile.mockResolvedValue({
      pk: 'USER#123',
      sk: 'PROFILE',
      telegramUserId: 123,
      subscriptionStatus: 'active',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    await handler(makeEvent('hello'));
    expect(mockedSendMessage).toHaveBeenCalledWith(
      123,
      'You said: hello',
    );
  });
});
