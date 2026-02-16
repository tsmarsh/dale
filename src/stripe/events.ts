import type Stripe from 'stripe';
import type { SubscriptionStatus } from '../shared/types.js';
import {
  getTelegramUserIdByStripeCustomer,
  createUserMapping,
  updateSubscriptionStatus,
} from '../db/subscriptions.js';
import { sendMessage } from '../telegram/api.js';

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'none';
  }
}

export async function handleCheckoutCompleted(
  tableName: string,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const telegramUserId = Number(session.client_reference_id);
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!telegramUserId || !stripeCustomerId || !stripeSubscriptionId) {
    console.error('Missing required fields in checkout session', {
      telegramUserId,
      stripeCustomerId,
      stripeSubscriptionId,
    });
    return;
  }

  await createUserMapping(tableName, telegramUserId, stripeCustomerId, stripeSubscriptionId);
  await sendMessage(telegramUserId, 'Your subscription is now active! Use /help to see what you can do.');
}

export async function handleInvoicePaid(
  tableName: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) return;

  const telegramUserId = await getTelegramUserIdByStripeCustomer(tableName, stripeCustomerId);
  if (!telegramUserId) {
    console.warn(`No Telegram user found for Stripe customer ${stripeCustomerId}`);
    return;
  }

  await updateSubscriptionStatus(tableName, telegramUserId, 'active');
}

export async function handleInvoicePaymentFailed(
  tableName: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) return;

  const telegramUserId = await getTelegramUserIdByStripeCustomer(tableName, stripeCustomerId);
  if (!telegramUserId) return;

  await updateSubscriptionStatus(tableName, telegramUserId, 'past_due');
  await sendMessage(telegramUserId, 'Your payment failed. Please update your payment method to keep your subscription active.');
}

export async function handleSubscriptionDeleted(
  tableName: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) return;

  const telegramUserId = await getTelegramUserIdByStripeCustomer(tableName, stripeCustomerId);
  if (!telegramUserId) return;

  await updateSubscriptionStatus(tableName, telegramUserId, 'cancelled');
  await sendMessage(telegramUserId, 'Your subscription has been cancelled. Use /start to resubscribe.');
}

export async function handleSubscriptionUpdated(
  tableName: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) return;

  const telegramUserId = await getTelegramUserIdByStripeCustomer(tableName, stripeCustomerId);
  if (!telegramUserId) return;

  const status = mapStripeStatus(subscription.status);
  await updateSubscriptionStatus(tableName, telegramUserId, status, subscription.id);
}
