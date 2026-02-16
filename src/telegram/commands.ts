import type { Room, UserRoom } from '../shared/types.js';

export function handleStartDM(
  rooms: Room[],
  userRooms: UserRoom[],
  tenantId: string,
  telegramUserId: number,
): string {
  if (rooms.length === 0) {
    return 'This bot has no rooms available yet. Check back later!';
  }

  const activeRoomIds = new Set(
    userRooms
      .filter((ur) => ur.subscriptionStatus === 'active')
      .map((ur) => ur.roomId),
  );

  const lines = ['Welcome! Here are the available rooms:\n'];
  for (const room of rooms) {
    if (!room.isActive) continue;
    if (activeRoomIds.has(room.roomId)) {
      lines.push(`✅ *${room.name}* — subscribed`);
    } else {
      const link = `${room.paymentLink}?client_reference_id=${tenantId}:${telegramUserId}:${room.roomId}`;
      const desc = room.priceDescription ? ` (${room.priceDescription})` : '';
      lines.push(`🔒 *${room.name}*${desc}\nSubscribe: ${link}`);
    }
  }
  return lines.join('\n');
}

export function handleStartGroup(
  room: Room,
  userRoom: UserRoom | null,
  tenantId: string,
  telegramUserId: number,
): string {
  if (userRoom && userRoom.subscriptionStatus === 'active') {
    return `Welcome back to *${room.name}*! Your subscription is active.`;
  }
  const link = `${room.paymentLink}?client_reference_id=${tenantId}:${telegramUserId}:${room.roomId}`;
  return `Welcome to *${room.name}*! Subscribe here to get access:\n${link}`;
}

export function handleStatus(userRooms: UserRoom[], rooms: Room[]): string {
  if (userRooms.length === 0) {
    return 'You do not have any subscriptions yet. Use /start to see available rooms.';
  }

  const roomMap = new Map(rooms.map((r) => [r.roomId, r]));
  const lines = ['*Your subscriptions:*\n'];
  for (const ur of userRooms) {
    const room = roomMap.get(ur.roomId);
    const name = room?.name ?? ur.roomId;
    const statusLabel: Record<string, string> = {
      active: '✅ active',
      past_due: '⚠️ past due',
      cancelled: '❌ cancelled',
      none: '— none',
    };
    lines.push(`${name}: ${statusLabel[ur.subscriptionStatus] ?? ur.subscriptionStatus}`);
  }
  return lines.join('\n');
}

export function handleHelp(): string {
  return [
    '*Available commands:*',
    '/start - See available rooms and subscribe',
    '/status - Check your subscription status',
    '/help - Show this help message',
  ].join('\n');
}

export function handleUnknownCommand(): string {
  return "I don't recognize that command. Use /help to see available commands.";
}
