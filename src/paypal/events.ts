import { getTenantByPayPalPayer, createPayPalUserRoomMapping } from '../db/paypal-mappings.js';
import { sendMessage } from '../telegram/api.js';

export function parseCustomId(ref: string | null | undefined): {
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

export async function handleSubscriptionActivated(
  tableName: string,
  tenantId: string,
  botToken: string,
  event: Record<string, unknown>,
): Promise<void> {
  const resource = event.resource as Record<string, unknown>;
  const customId = resource.custom_id as string | undefined;
  const parsed = parseCustomId(customId);
  if (!parsed) {
    console.error('Invalid custom_id in PayPal subscription:', customId);
    return;
  }

  if (parsed.tenantId !== tenantId) {
    console.error('Tenant mismatch in custom_id', { expected: tenantId, got: parsed.tenantId });
    return;
  }

  const subscriber = resource.subscriber as Record<string, unknown> | undefined;
  const paypalPayerId = (subscriber?.payer_id as string) ?? '';
  const paypalSubscriptionId = resource.id as string ?? '';

  if (!paypalPayerId || !paypalSubscriptionId) {
    console.error('Missing payer_id or subscription id in PayPal event');
    return;
  }

  await createPayPalUserRoomMapping(
    tableName,
    tenantId,
    parsed.telegramUserId,
    parsed.roomId,
    paypalPayerId,
    paypalSubscriptionId,
  );

  await sendMessage(
    botToken,
    parsed.telegramUserId,
    'Your subscription is now active! Use /help to see what you can do.',
  );
}

export async function handleSubscriptionCancelled(
  tableName: string,
  tenantId: string,
  botToken: string,
  event: Record<string, unknown>,
): Promise<void> {
  const resource = event.resource as Record<string, unknown>;
  const subscriber = resource.subscriber as Record<string, unknown> | undefined;
  const paypalPayerId = (subscriber?.payer_id as string) ?? '';
  if (!paypalPayerId) return;

  const mapping = await getTenantByPayPalPayer(tableName, paypalPayerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  await sendMessage(
    botToken,
    mapping.telegramUserId,
    'Your subscription has been cancelled. Use /start to resubscribe.',
  );
}

export async function handleSubscriptionSuspended(
  tableName: string,
  tenantId: string,
  botToken: string,
  event: Record<string, unknown>,
): Promise<void> {
  const resource = event.resource as Record<string, unknown>;
  const subscriber = resource.subscriber as Record<string, unknown> | undefined;
  const paypalPayerId = (subscriber?.payer_id as string) ?? '';
  if (!paypalPayerId) return;

  const mapping = await getTenantByPayPalPayer(tableName, paypalPayerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  await sendMessage(
    botToken,
    mapping.telegramUserId,
    'Your subscription payment is past due. Please update your payment method to keep your subscription active.',
  );
}

export async function handlePaymentCompleted(
  tableName: string,
  tenantId: string,
  event: Record<string, unknown>,
): Promise<void> {
  console.log(`PayPal payment completed for tenant ${tenantId}`, event.resource);
}

export async function handlePaymentDenied(
  tableName: string,
  tenantId: string,
  botToken: string,
  event: Record<string, unknown>,
): Promise<void> {
  const resource = event.resource as Record<string, unknown>;
  const customId = resource.custom as string | undefined;

  // For sale events, try to find the payer via billing_agreement_id or custom field
  // The payer email might be available but we need the payer_id for lookup
  const payerInfo = resource.payer_info as Record<string, unknown> | undefined;
  const paypalPayerId = (payerInfo?.payer_id as string) ?? '';
  if (!paypalPayerId) {
    console.warn('No payer_id in PayPal payment denied event');
    return;
  }

  const mapping = await getTenantByPayPalPayer(tableName, paypalPayerId);
  if (!mapping || mapping.tenantId !== tenantId) return;

  await sendMessage(
    botToken,
    mapping.telegramUserId,
    'Your PayPal payment was denied. Please update your payment method to keep your subscription active.',
  );
}
