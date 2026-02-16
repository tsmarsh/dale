import type { UserProfile } from '../shared/types.js';

export function handleStart(
  profile: UserProfile | null,
  paymentLink: string,
  telegramUserId: number,
): string {
  if (profile && profile.subscriptionStatus === 'active') {
    return 'Welcome back! Your subscription is active. Use /help to see available commands.';
  }
  const link = `${paymentLink}?client_reference_id=${telegramUserId}`;
  return `Welcome to Dale! To get started, subscribe here:\n${link}`;
}

export function handleStatus(profile: UserProfile | null): string {
  if (!profile) {
    return 'You do not have an account yet. Use /start to get started.';
  }
  const statusMap: Record<string, string> = {
    active: 'Your subscription is *active*.',
    past_due: 'Your subscription is *past due*. Please update your payment method.',
    cancelled: 'Your subscription has been *cancelled*. Use /start to resubscribe.',
    none: 'You do not have an active subscription. Use /start to subscribe.',
  };
  return statusMap[profile.subscriptionStatus] ?? 'Unknown subscription status.';
}

export function handleHelp(): string {
  return [
    '*Available commands:*',
    '/start - Subscribe or check your welcome message',
    '/status - Check your subscription status',
    '/help - Show this help message',
    '/cancel - Information about cancelling',
  ].join('\n');
}

export function handleCancel(): string {
  return 'To manage or cancel your subscription, visit your Stripe billing portal or contact support.';
}

export function handleUnknownCommand(): string {
  return "I don't recognize that command. Use /help to see available commands.";
}

export function handleNonSubscriber(
  paymentLink: string,
  telegramUserId: number,
): string {
  const link = `${paymentLink}?client_reference_id=${telegramUserId}`;
  return `You need an active subscription to use this bot. Subscribe here:\n${link}`;
}
