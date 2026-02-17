import { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { RoomCard } from '../components/RoomCard';

export function RoomListPage() {
  const { rooms, loading, error, createRoom } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [paypalPaymentLink, setPaypalPaymentLink] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      await createRoom({
        name,
        paymentLink: paymentLink || undefined,
        paypalPaymentLink: paypalPaymentLink || undefined,
      });
      setShowForm(false);
      setName('');
      setPaymentLink('');
      setPaypalPaymentLink('');
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setCreating(false);
    }
  }

  const hasLink = !!(paymentLink || paypalPaymentLink);

  if (loading) return <p>Loading rooms...</p>;
  if (error) return <p className="error-text">{error}</p>;

  return (
    <div>
      <div className="flex-between">
        <h1>Rooms</h1>
        <button className="btn-secondary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Room'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <input
              type="text"
              placeholder="Room name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Stripe payment link URL (optional)"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="PayPal subscription link URL (optional)"
              value={paypalPaymentLink}
              onChange={(e) => setPaypalPaymentLink(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleCreate} disabled={!name || !hasLink || creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {rooms.length === 0 ? (
        <p style={{ marginTop: '1rem' }}>No rooms yet. Create one to get started.</p>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          {rooms.map((room) => <RoomCard key={room.roomId} room={room} />)}
        </div>
      )}
    </div>
  );
}
