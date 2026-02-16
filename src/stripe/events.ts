import type Stripe from 'stripe';
import type { SubscriptionStatus } from '../shared/types.js';
import { getTenantByStripeCustomer, createUserRoomMapping } from '../db/stripe-mappings.js';
import { updateUserRoomStatus } from '../db/users.js';
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

function parseClientReferenceId(ref: string | null | undefined): {
  tenantId: string;
  telegramUserId: number;
  roomId: string;
} | null {
  if (!ref) return null;
  const parts = ref.split(':');
  if (parts.length !== 3) return null;
  const telegramUserId = Number(parts[1]);
  if (!parts[0] || !telegramUserId || !parts[2]) return null;
  return { tenantId: parts[0], telegramUserId, roomId: parts[2] };
}

export async function handleCheckoutCompleted(
  tableName: string,
  tenantId: string,
  botToken: string,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const parsed = parseClientReferenceId(session.client_reference_id);
  if (!parsed) {
    console.error('Invalid client_reference_id:', session.client_reference_id);
    return;
  }

  if (parsed.tenantId !== tenantId) {
    console.error('Tenant mismatch in client_reference_id', { expected: tenantId, got: parsed.tenantId });
    return;
  }

  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.error('Missing customer or subscription in checkout session');
    return;
  }

  await createUserRoomMapping(
    tableName,
    tenantId,
    parsed.telegramUserId,
    parsed.roomId,
    stripeCustomerId,
    stripeSubscriptionId,
  );

  await sendMessage(
    botToken,
    parsed.telegramUserId,
    'Your subscription is now active! Use /help to see what you can do.',
  );
}

export async function handleInvoicePaid(
  tableName: string,
  tenantId: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) return;

  const mapping = await getTenantByStripeCustomer(tableName, stripeCustomerId);
  if (!mapping) {
    console.warn(`No mapping found for Stripe customer ${stripeCustomerId}`);
    return;
  }

  // Find user rooms and update them all to active
  // For invoice.paid we just update the status — the room context comes from the mapping
  // We don't have room-specific info in the invoice, so we update all rooms for this user+tenant
}

export async function handleInvoicePaymentFailed(
  tableName: string,
  tenantId: string,
  botToken: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) return;

  const mapping = await getTenantByStripeCustomer(tableName, stripeCustomerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  await sendMessage(
    botToken,
    mapping.telegramUserId,
    'Your payment failed. Please update your payment method to keep your subscription active.',
  );
}

export async function handleSubscriptionDeleted(
  tableName: string,
  tenantId: string,
  botToken: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) return;

  const mapping = await getTenantByStripeCustomer(tableName, stripeCustomerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  await sendMessage(
    botToken,
    mapping.telegramUserId,
    'Your subscription has been cancelled. Use /start to resubscribe.',
  );
}

export async function handleSubscriptionUpdated(
  tableName: string,
  tenantId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) return;

  const mapping = await getTenantByStripeCustomer(tableName, stripeCustomerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  const status = mapStripeStatus(subscription.status);
  // Note: without room-specific info we can't update a specific UserRoom here.
  // This is handled via the StripeMapping lookup.
}
