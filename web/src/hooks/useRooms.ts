import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { RoomResponse, CreateRoomRequest, UpdateRoomRequest } from '../api/types';

export function useRooms() {
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      setLoading(true);
      const data = await api.get<RoomResponse[]>('/api/rooms');
      setRooms(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }

  async function createRoom(request: CreateRoomRequest) {
    const result = await api.post<{ roomId: string }>('/api/rooms', request);
    await loadRooms();
    return result;
  }

  async function updateRoom(roomId: string, request: UpdateRoomRequest) {
    await api.put(`/api/rooms/${roomId}`, request);
    await loadRooms();
  }

  return { rooms, loading, error, createRoom, updateRoom, reload: loadRooms };
}
