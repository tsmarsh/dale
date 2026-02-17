export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'none';

// --- Multi-tenant entities ---

export interface Tenant {
  pk: string; // TENANT#{tenantId}
  sk: string; // METADATA
  tenantId: string;
  cognitoSub: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  GSI1pk: string; // COGNITO#{cognitoSub}
  GSI1sk: string; // TENANT
}

export interface Room {
  pk: string; // TENANT#{tenantId}
  sk: string; // ROOM#{roomId}
  tenantId: string;
  roomId: string;
  name: string;
  description?: string;
  telegramGroupId?: number;
  paymentLink: string;
  paypalPaymentLink?: string;
  priceDescription?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  GSI1pk?: string; // TGGROUP#{telegramGroupId}
  GSI1sk?: string; // ROOM
}

export interface WebhookSecretMapping {
  pk: string; // WHSECRET#{secret}
  sk: string; // TENANT
  tenantId: string;
  createdAt: string;
}

export interface UserProfile {
  pk: string; // TENANT#{tenantId}
  sk: string; // USER#{telegramUserId}
  tenantId: string;
  telegramUserId: number;
  firstName?: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoom {
  pk: string; // TENANT#{tenantId}
  sk: string; // USERROOM#{telegramUserId}#ROOM#{roomId}
  tenantId: string;
  telegramUserId: number;
  roomId: string;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paypalPayerId?: string;
  paypalSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
  GSI1pk: string; // TGUSER#{telegramUserId}
  GSI1sk: string; // TENANT#{tenantId}#ROOM#{roomId}
}

export interface StripeMapping {
  pk: string; // TENANT#{tenantId}
  sk: string; // STRIPECUST#{stripeCustomerId}
  tenantId: string;
  stripeCustomerId: string;
  telegramUserId: number;
  createdAt: string;
  GSI1pk: string; // STRIPECUST#{stripeCustomerId}
  GSI1sk: string; // TENANT#{tenantId}
}

export interface PayPalMapping {
  pk: string; // TENANT#{tenantId}
  sk: string; // PAYPALCUST#{paypalPayerId}
  tenantId: string;
  paypalPayerId: string;
  telegramUserId: number;
  createdAt: string;
  GSI1pk: string; // PAYPALCUST#{paypalPayerId}
  GSI1sk: string; // TENANT#{tenantId}
}

// --- Tenant secrets (from SSM) ---

export interface TenantSecrets {
  telegramBotToken: string;
  telegramWebhookSecret: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  paypalClientId?: string;
  paypalClientSecret?: string;
  paypalWebhookId?: string;
}

// --- Platform config (env vars only) ---

export interface PlatformConfig {
  tableName: string;
  telegramWebhookUrl: string;
  stripeWebhookUrl: string;
  paypalWebhookUrl: string;
}

// --- Telegram types ---

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
  title?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramChatMemberUpdated {
  chat: TelegramChat;
  from: TelegramUser;
  date: number;
  old_chat_member: TelegramChatMember;
  new_chat_member: TelegramChatMember;
}

export interface TelegramChatMember {
  user: TelegramUser;
  status: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: TelegramChatMemberUpdated;
}
