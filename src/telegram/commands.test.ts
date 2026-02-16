import { describe, it, expect } from 'vitest';
import type { UserProfile } from '../shared/types.js';
import {
  handleStart,
  handleStatus,
  handleHelp,
  handleCancel,
  handleUnknownCommand,
  handleNonSubscriber,
} from './commands.js';

const PAYMENT_LINK = 'https://buy.stripe.com/test_abc123';

const activeProfile: UserProfile = {
  pk: 'USER#123',
  sk: 'PROFILE',
  telegramUserId: 123,
  stripeCustomerId: 'cus_abc',
  subscriptionStatus: 'active',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('handleStart', () => {
  it('returns welcome back for active subscriber', () => {
    const result = handleStart(activeProfile, PAYMENT_LINK, 123);
    expect(result).toContain('Welcome back');
    expect(result).toContain('active');
  });

  it('returns payment link for new user', () => {
    const result = handleStart(null, PAYMENT_LINK, 456);
    expect(result).toContain(PAYMENT_LINK);
    expect(result).toContain('client_reference_id=456');
  });

  it('returns payment link for cancelled user', () => {
    const cancelled = { ...activeProfile, subscriptionStatus: 'cancelled' as const };
    const result = handleStart(cancelled, PAYMENT_LINK, 123);
    expect(result).toContain(PAYMENT_LINK);
  });
});

describe('handleStatus', () => {
  it('returns active status', () => {
    expect(handleStatus(activeProfile)).toContain('active');
  });

  it('returns past due status', () => {
    const pastDue = { ...activeProfile, subscriptionStatus: 'past_due' as const };
    expect(handleStatus(pastDue)).toContain('past due');
  });

  it('returns cancelled status', () => {
    const cancelled = { ...activeProfile, subscriptionStatus: 'cancelled' as const };
    expect(handleStatus(cancelled)).toContain('cancelled');
  });

  it('returns no account for null profile', () => {
    expect(handleStatus(null)).toContain('do not have an account');
  });
});

describe('handleHelp', () => {
  it('lists available commands', () => {
    const result = handleHelp();
    expect(result).toContain('/start');
    expect(result).toContain('/status');
    expect(result).toContain('/help');
    expect(result).toContain('/cancel');
  });
});

describe('handleCancel', () => {
  it('provides cancellation info', () => {
    expect(handleCancel()).toContain('cancel');
  });
});

describe('handleUnknownCommand', () => {
  it('suggests /help', () => {
    expect(handleUnknownCommand()).toContain('/help');
  });
});

describe('handleNonSubscriber', () => {
  it('includes payment link with user id', () => {
    const result = handleNonSubscriber(PAYMENT_LINK, 789);
    expect(result).toContain(PAYMENT_LINK);
    expect(result).toContain('client_reference_id=789');
  });
});
