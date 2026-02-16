import { describe, it, expect } from 'vitest';
import {
  validateTelegramSecret,
  parseTelegramUpdate,
  isSubscriptionActive,
} from './middleware.js';

describe('validateTelegramSecret', () => {
  it('returns true for matching secret', () => {
    expect(validateTelegramSecret('my-secret', 'my-secret')).toBe(true);
  });

  it('returns false for mismatched secret', () => {
    expect(validateTelegramSecret('wrong', 'my-secret')).toBe(false);
  });

  it('returns false for undefined header', () => {
    expect(validateTelegramSecret(undefined, 'my-secret')).toBe(false);
  });
});

describe('parseTelegramUpdate', () => {
  it('parses valid update', () => {
    const body = JSON.stringify({
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: 123, type: 'private' },
        date: 1234567890,
        text: '/start',
      },
    });
    const result = parseTelegramUpdate(body);
    expect(result).not.toBeNull();
    expect(result!.update_id).toBe(1);
    expect(result!.message!.text).toBe('/start');
  });

  it('returns null for invalid JSON', () => {
    expect(parseTelegramUpdate('not json')).toBeNull();
  });

  it('returns null for missing update_id', () => {
    expect(parseTelegramUpdate(JSON.stringify({ message: {} }))).toBeNull();
  });
});

describe('isSubscriptionActive', () => {
  it('returns true for active', () => {
    expect(isSubscriptionActive('active')).toBe(true);
  });

  it('returns false for past_due', () => {
    expect(isSubscriptionActive('past_due')).toBe(false);
  });

  it('returns false for cancelled', () => {
    expect(isSubscriptionActive('cancelled')).toBe(false);
  });

  it('returns false for none', () => {
    expect(isSubscriptionActive('none')).toBe(false);
  });
});
