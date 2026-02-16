import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { getPlatformConfig } from '../shared/config.js';
import { getTenantSecrets } from '../shared/tenant-config.js';
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from './events.js';

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const config = getPlatformConfig();

  // Extract tenant from query string
  const tenantId = event.queryStringParameters?.tenant;
  if (!tenantId) {
    return { statusCode: 400, body: 'Missing tenant parameter' };
  }

  let tenantSecrets;
  try {
    tenantSecrets = await getTenantSecrets(tenantId);
  } catch (err) {
    console.error(`Failed to load secrets for tenant ${tenantId}:`, err);
    return { statusCode: 500, body: 'Tenant configuration error' };
  }

  const stripe = new Stripe(tenantSecrets.stripeSecretKey);

  const signature = event.headers['stripe-signature'];
  if (!signature || !event.body) {
    return { statusCode: 400, body: 'Missing signature or body' };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      tenantSecrets.stripeWebhookSecret,
    );
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return { statusCode: 400, body: 'Invalid signature' };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          config.tableName,
          tenantId,
          tenantSecrets.telegramBotToken,
          stripeEvent.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'invoice.paid':
        await handleInvoicePaid(
          config.tableName,
          tenantId,
          stripeEvent.data.object as Stripe.Invoice,
        );
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          config.tableName,
          tenantId,
          tenantSecrets.telegramBotToken,
          stripeEvent.data.object as Stripe.Invoice,
        );
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          config.tableName,
          tenantId,
          tenantSecrets.telegramBotToken,
          stripeEvent.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          config.tableName,
          tenantId,
          stripeEvent.data.object as Stripe.Subscription,
        );
        break;
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.error('Error processing Stripe event:', error);
    return { statusCode: 500, body: 'Internal error' };
  }
}
