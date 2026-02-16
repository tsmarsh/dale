import { listRoomSubscribers } from '../../db/users.js';
import type { AuthContext } from '../middleware/auth.js';

export async function handleListSubscribers(
  tableName: string,
  auth: AuthContext,
  roomId: string,
): Promise<{ statusCode: number; body: string }> {
  const subscribers = await listRoomSubscribers(tableName, auth.tenantId, roomId);
  return {
    statusCode: 200,
    body: JSON.stringify(subscribers.map((s) => ({
      telegramUserId: s.telegramUserId,
      roomId: s.roomId,
      subscriptionStatus: s.subscriptionStatus,
      createdAt: s.createdAt,
    }))),
  };
}
