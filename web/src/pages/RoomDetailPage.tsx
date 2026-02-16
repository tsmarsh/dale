import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSubscribers } from '../hooks/useSubscribers';
import { SubscriberTable } from '../components/SubscriberTable';
import type { RoomResponse, UpdateRoomRequest } from '../api/types';

export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateRoomRequest>({});
  const { subscribers, loading: subLoading } = useSubscribers(roomId!);

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  async function loadRoom() {
    try {
      const data = await api.get<RoomResponse>(`/api/rooms/${roomId}`);
      setRoom(data);
      setForm({ name: data.name, description: data.description, paymentLink: data.paymentLink, isActive: data.isActive });
    } catch (err) {
      console.error('Failed to load room:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    await api.put(`/api/rooms/${roomId}`, form);
    setEditing(false);
    await loadRoom();
  }

  if (loading) return <p>Loading...</p>;
  if (!room) return <p>Room not found.</p>;

  return (
    <div>
      <h1>{room.name}</h1>

      {editing ? (
        <div style={{ marginBottom: '1rem' }}>
          <label>Name: <input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ padding: '0.25rem' }} /></label><br />
          <label>Description: <input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ padding: '0.25rem' }} /></label><br />
          <label>Payment Link: <input value={form.paymentLink ?? ''} onChange={(e) => setForm({ ...form, paymentLink: e.target.value })} style={{ padding: '0.25rem' }} /></label><br />
          <label>Active: <input type="checkbox" checked={form.isActive ?? false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /></label><br />
          <button onClick={handleSave} style={{ marginTop: '0.5rem' }}>Save</button>
          <button onClick={() => setEditing(false)} style={{ marginLeft: '0.5rem' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <p>Status: {room.isActive ? 'Active' : 'Inactive'}</p>
          {room.description && <p>Description: {room.description}</p>}
          {room.telegramGroupId && <p>Telegram Group: {room.telegramGroupId}</p>}
          <p>Payment Link: <code>{room.paymentLink}</code></p>
          <button onClick={() => setEditing(true)}>Edit</button>
        </div>
      )}

      <h2>Subscribers ({subscribers.length})</h2>
      {subLoading ? <p>Loading subscribers...</p> : <SubscriberTable subscribers={subscribers} />}
    </div>
  );
}
