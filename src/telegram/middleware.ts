import type { TelegramUpdate, SubscriptionStatus } from '../shared/types.js';

export function validateTelegramSecret(
  headerValue: string | undefined,
  expectedSecret: string,
): boolean {
  return headerValue === expectedSecret;
}

export function parseTelegramUpdate(body: string): TelegramUpdate | null {
  try {
    const update = JSON.parse(body) as TelegramUpdate;
    if (typeof update.update_id !== 'number') return null;
    return update;
  } catch {
    return null;
  }
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active';
}

export function isGroupChat(chatType: string): boolean {
  return chatType === 'group' || chatType === 'supergroup';
}
