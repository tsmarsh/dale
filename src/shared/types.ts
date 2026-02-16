export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'none';

export interface UserProfile {
  pk: string;
  sk: string;
  telegramUserId: number;
  stripeCustomerId?: string;
  subscriptionStatus: SubscriptionStatus;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StripeMapping {
  pk: string;
  sk: string;
  stripeCustomerId: string;
  telegramUserId: number;
  createdAt: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface AppConfig {
  tableName: string;
  paymentLink: string;
  telegramBotToken: string;
  telegramWebhookSecret: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
}
