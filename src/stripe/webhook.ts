import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import Stripe from 'stripe';
import { getConfig } from '../shared/config.js';
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
  const config = await getConfig();
  const stripe = new Stripe(config.stripeSecretKey);

  const signature = event.headers['stripe-signature'];
  if (!signature || !event.body) {
    return { statusCode: 400, body: 'Missing signature or body' };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      config.stripeWebhookSecret,
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
          stripeEvent.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'invoice.paid':
        await handleInvoicePaid(
          config.tableName,
          stripeEvent.data.object as Stripe.Invoice,
        );
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          config.tableName,
          stripeEvent.data.object as Stripe.Invoice,
        );
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          config.tableName,
          stripeEvent.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          config.tableName,
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
