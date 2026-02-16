import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getPlatformConfig } from '../shared/config.js';
import { getTenantIdByWebhookSecret } from '../shared/tenant-lookup.js';
import { getTenantSecrets } from '../shared/tenant-config.js';
import { getUserRoom, listUserRooms } from '../db/users.js';
import { listRoomsForTenant, getRoomByTelegramGroupId } from '../db/rooms.js';
import { sendMessage } from './api.js';
import { validateTelegramSecret, parseTelegramUpdate, isGroupChat } from './middleware.js';
import { handleStartDM, handleStartGroup, handleStatus, handleHelp, handleUnknownCommand } from './commands.js';
import { handleMyChatMember } from './group-handler.js';

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  try {
    const config = getPlatformConfig();

    // Step 1: Extract webhook secret from header
    const secret = event.headers['x-telegram-bot-api-secret-token'];
    if (!secret) {
      return { statusCode: 200, body: 'ok' };
    }

    // Step 2: Look up tenant by webhook secret
    const tenantId = await getTenantIdByWebhookSecret(config.tableName, secret);
    if (!tenantId) {
      console.warn('Unknown webhook secret');
      return { statusCode: 200, body: 'ok' };
    }

    // Step 3: Load tenant secrets
    const tenantSecrets = await getTenantSecrets(tenantId);

    // Step 4: Validate the webhook secret matches tenant's expected secret
    if (!validateTelegramSecret(secret, tenantSecrets.telegramWebhookSecret)) {
      console.warn('Webhook secret mismatch for tenant', tenantId);
      return { statusCode: 200, body: 'ok' };
    }

    // Step 5: Parse the update
    const update = parseTelegramUpdate(event.body ?? '');
    if (!update) {
      return { statusCode: 200, body: 'ok' };
    }

    // Step 6: Handle my_chat_member events (bot added/removed from groups)
    if (update.my_chat_member) {
      // Extract bot user ID from the token (first part before ':')
      const botUserId = parseInt(tenantSecrets.telegramBotToken.split(':')[0], 10);
      await handleMyChatMember(
        { tableName: config.tableName, tenantId, botUserId },
        update.my_chat_member,
      );
      return { statusCode: 200, body: 'ok' };
    }

    // Step 7: Handle messages
    if (!update.message?.text || !update.message.from) {
      return { statusCode: 200, body: 'ok' };
    }

    const { message } = update;
    const chatId = message.chat.id;
    const telegramUserId = message.from!.id;
    const text = message.text!.trim();
    const command = text.split(' ')[0].split('@')[0].toLowerCase();
    const inGroup = isGroupChat(message.chat.type);

    let response: string;

    if (command === '/start') {
      if (inGroup) {
        // In a group: show this room's payment link
        const room = await getRoomByTelegramGroupId(config.tableName, chatId);
        if (!room) {
          response = 'This group is not linked to a room yet.';
        } else {
          const userRoom = await getUserRoom(config.tableName, tenantId, telegramUserId, room.roomId);
          response = handleStartGroup(room, userRoom, tenantId, telegramUserId);
        }
      } else {
        // In DM: show all rooms
        const rooms = await listRoomsForTenant(config.tableName, tenantId);
        const userRooms = await listUserRooms(config.tableName, tenantId, telegramUserId);
        response = handleStartDM(rooms, userRooms, tenantId, telegramUserId);
      }
    } else if (command === '/status') {
      const rooms = await listRoomsForTenant(config.tableName, tenantId);
      const userRooms = await listUserRooms(config.tableName, tenantId, telegramUserId);
      response = handleStatus(userRooms, rooms);
    } else if (command === '/help') {
      response = handleHelp();
    } else if (command.startsWith('/')) {
      response = handleUnknownCommand();
    } else {
      // Non-command messages in DM — ignore in multi-tenant
      return { statusCode: 200, body: 'ok' };
    }

    await sendMessage(tenantSecrets.telegramBotToken, chatId, response);
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }

  return { statusCode: 200, body: 'ok' };
}
