import { createRoom, getRoom, listRoomsForTenant, updateRoom } from '../../db/rooms.js';
import type { AuthContext } from '../middleware/auth.js';
import { ulid } from 'ulid';

export async function handleListRooms(
  tableName: string,
  auth: AuthContext,
): Promise<{ statusCode: number; body: string }> {
  const rooms = await listRoomsForTenant(tableName, auth.tenantId);
  return {
    statusCode: 200,
    body: JSON.stringify(rooms.map((r) => ({
      roomId: r.roomId,
      name: r.name,
      description: r.description,
      telegramGroupId: r.telegramGroupId,
      paymentLink: r.paymentLink,
      priceDescription: r.priceDescription,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }))),
  };
}

export async function handleGetRoom(
  tableName: string,
  auth: AuthContext,
  roomId: string,
): Promise<{ statusCode: number; body: string }> {
  const room = await getRoom(tableName, auth.tenantId, roomId);
  if (!room) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Room not found' }) };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      roomId: room.roomId,
      name: room.name,
      description: room.description,
      telegramGroupId: room.telegramGroupId,
      paymentLink: room.paymentLink,
      priceDescription: room.priceDescription,
      isActive: room.isActive,
      createdAt: room.createdAt,
    }),
  };
}

export async function handleCreateRoom(
  tableName: string,
  auth: AuthContext,
  body: string,
): Promise<{ statusCode: number; body: string }> {
  let parsed: { name: string; description?: string; paymentLink: string; priceDescription?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!parsed.name || !parsed.paymentLink) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields: name, paymentLink' }) };
  }

  const room = await createRoom(tableName, {
    tenantId: auth.tenantId,
    roomId: ulid(),
    name: parsed.name,
    description: parsed.description,
    paymentLink: parsed.paymentLink,
    priceDescription: parsed.priceDescription,
    isActive: true,
  });

  return {
    statusCode: 201,
    body: JSON.stringify({ roomId: room.roomId, name: room.name }),
  };
}

export async function handleUpdateRoom(
  tableName: string,
  auth: AuthContext,
  roomId: string,
  body: string,
): Promise<{ statusCode: number; body: string }> {
  let parsed: { name?: string; description?: string; paymentLink?: string; priceDescription?: string; isActive?: boolean };
  try {
    parsed = JSON.parse(body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  await updateRoom(tableName, auth.tenantId, roomId, parsed);
  return { statusCode: 200, body: JSON.stringify({ updated: true }) };
}
