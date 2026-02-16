import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getConfig } from '../shared/config.js';
import { getUserProfile } from '../db/subscriptions.js';
import { sendMessage } from './api.js';
import { validateTelegramSecret, parseTelegramUpdate, isSubscriptionActive } from './middleware.js';
import {
  handleStart,
  handleStatus,
  handleHelp,
  handleCancel,
  handleUnknownCommand,
  handleNonSubscriber,
} from './commands.js';

const COMMANDS = new Set(['/start', '/status', '/help', '/cancel']);

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  try {
    const config = await getConfig();

    const secret = event.headers['x-telegram-bot-api-secret-token'];
    if (!validateTelegramSecret(secret, config.telegramWebhookSecret)) {
      console.warn('Invalid Telegram webhook secret');
      return { statusCode: 200, body: 'ok' };
    }

    const update = parseTelegramUpdate(event.body ?? '');
    if (!update?.message?.text || !update.message.from) {
      return { statusCode: 200, body: 'ok' };
    }

    const { message } = update;
    const chatId = message.chat.id;
    const telegramUserId = message.from!.id;
    const text = message.text!.trim();
    const command = text.split(' ')[0].split('@')[0].toLowerCase();

    const profile = await getUserProfile(config.tableName, telegramUserId);

    let response: string;

    if (command === '/start') {
      response = handleStart(profile, config.paymentLink, telegramUserId);
    } else if (command === '/status') {
      response = handleStatus(profile);
    } else if (command === '/help') {
      response = handleHelp();
    } else if (command === '/cancel') {
      response = handleCancel();
    } else if (command.startsWith('/')) {
      response = handleUnknownCommand();
    } else {
      if (!profile || !isSubscriptionActive(profile.subscriptionStatus)) {
        response = handleNonSubscriber(config.paymentLink, telegramUserId);
      } else {
        response = `You said: ${text}`;
      }
    }

    await sendMessage(chatId, response);
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }

  return { statusCode: 200, body: 'ok' };
}
