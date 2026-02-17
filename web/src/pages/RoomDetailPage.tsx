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
      setForm({ name: data.name, description: data.description, paymentLink: data.paymentLink, paypalPaymentLink: data.paypalPaymentLink, isActive: data.isActive });
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
          <div className="form-group">
            <label>Name:</label>
            <input type="text" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <input type="text" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Stripe Payment Link:</label>
            <input type="text" value={form.paymentLink ?? ''} onChange={(e) => setForm({ ...form, paymentLink: e.target.value })} />
          </div>
          <div className="form-group">
            <label>PayPal Subscription Link:</label>
            <input type="text" value={form.paypalPaymentLink ?? ''} onChange={(e) => setForm({ ...form, paypalPaymentLink: e.target.value })} />
          </div>
          <div className="form-group">
            <label>
              <input type="checkbox" checked={form.isActive ?? false} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleSave}>Save</button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <p>Status: <span className={`badge ${room.isActive ? 'badge-active' : 'badge-inactive'}`}>{room.isActive ? 'Active' : 'Inactive'}</span></p>
          {room.description && <p>Description: {room.description}</p>}
          {room.telegramGroupId && <p>Telegram Group: {room.telegramGroupId}</p>}
          {room.paymentLink && <p>Stripe Payment Link: <code>{room.paymentLink}</code></p>}
          {room.paypalPaymentLink && <p>PayPal Subscription Link: <code>{room.paypalPaymentLink}</code></p>}
          <button className="btn-primary" onClick={() => setEditing(true)} style={{ marginTop: '0.5rem' }}>Edit</button>
        </div>
      )}

      <h2>Subscribers ({subscribers.length})</h2>
      {subLoading ? <p>Loading subscribers...</p> : <SubscriberTable subscribers={subscribers} />}
    </div>
  );
}
