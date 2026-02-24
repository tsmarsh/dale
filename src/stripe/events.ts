import type Stripe from 'stripe';
import type { SubscriptionStatus } from '../shared/types.js';
import { getTenantByStripeCustomer, createUserRoomMapping } from '../db/stripe-mappings.js';
import { listUserRooms, updateUserRoomStatus } from '../db/users.js';
import { getRoom } from '../db/rooms.js';
import { sendMessage, createChatInviteLink, banChatMember, unbanChatMember } from '../telegram/api.js';

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

  const room = await getRoom(tableName, tenantId, parsed.roomId);
  const groupName = room?.name ?? 'your group';

  let inviteLink: string | null = null;
  if (room?.telegramGroupId) {
    inviteLink = await createChatInviteLink(botToken, room.telegramGroupId);
    if (!inviteLink) {
      console.warn(`Failed to create invite link for room ${parsed.roomId}`);
    }
  }

  const message = inviteLink
    ? `You're in! 🎉 Your subscription to *${groupName}* is now active.\n\n👉 [Join the group](${inviteLink})`
    : `You're in! 🎉 Your subscription to *${groupName}* is now active.`;

  await sendMessage(botToken, parsed.telegramUserId, message);
}

export async function handleInvoicePaid(
  tableName: string,
  tenantId: string,
  botToken: string,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = invoice.customer as string;
  if (!stripeCustomerId) return;

  const mapping = await getTenantByStripeCustomer(tableName, stripeCustomerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  const subscriptionId = invoice.subscription as string | undefined;
  const userRooms = await listUserRooms(tableName, tenantId, mapping.telegramUserId);

  const relevant = subscriptionId
    ? userRooms.filter((ur) => ur.stripeSubscriptionId === subscriptionId)
    : userRooms;

  for (const ur of relevant) {
    const wasInactive = ur.subscriptionStatus === 'cancelled' || ur.subscriptionStatus === 'past_due';
    await updateUserRoomStatus(tableName, tenantId, mapping.telegramUserId, ur.roomId, 'active');

    if (wasInactive) {
      const room = await getRoom(tableName, tenantId, ur.roomId);
      if (room?.telegramGroupId) {
        await unbanChatMember(botToken, room.telegramGroupId, mapping.telegramUserId);
      }
    }
  }
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

  const userRooms = await listUserRooms(tableName, tenantId, mapping.telegramUserId);
  const relevant = userRooms.filter((ur) => ur.stripeSubscriptionId === subscription.id);

  for (const ur of relevant) {
    await updateUserRoomStatus(tableName, tenantId, mapping.telegramUserId, ur.roomId, 'cancelled');

    const room = await getRoom(tableName, tenantId, ur.roomId);
    if (room?.telegramGroupId) {
      await banChatMember(botToken, room.telegramGroupId, mapping.telegramUserId);
    }
  }

  await sendMessage(
    botToken,
    mapping.telegramUserId,
    'Your subscription has been cancelled. Use /start to resubscribe anytime.',
  );
}

export async function handleSubscriptionUpdated(
  tableName: string,
  tenantId: string,
  botToken: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId = subscription.customer as string;
  if (!stripeCustomerId) return;

  const mapping = await getTenantByStripeCustomer(tableName, stripeCustomerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  const status = mapStripeStatus(subscription.status);
  const userRooms = await listUserRooms(tableName, tenantId, mapping.telegramUserId);
  const relevant = userRooms.filter((ur) => ur.stripeSubscriptionId === subscription.id);

  for (const ur of relevant) {
    await updateUserRoomStatus(tableName, tenantId, mapping.telegramUserId, ur.roomId, status);

    const room = await getRoom(tableName, tenantId, ur.roomId);
    if (room?.telegramGroupId) {
      if (status === 'cancelled') {
        await banChatMember(botToken, room.telegramGroupId, mapping.telegramUserId);
      } else if (status === 'active') {
        await unbanChatMember(botToken, room.telegramGroupId, mapping.telegramUserId);
      }
    }
  }
}
