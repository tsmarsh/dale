import { useState } from 'react';
import { useRooms } from '../hooks/useRooms';
import { RoomCard } from '../components/RoomCard';

export function RoomListPage() {
  const { rooms, loading, error, createRoom } = useRooms();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      await createRoom({ name, paymentLink });
      setShowForm(false);
      setName('');
      setPaymentLink('');
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p>Loading rooms...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Rooms</h1>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Room'}
        </button>
      </div>

      {showForm && (
        <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Room name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
          />
          <input
            type="text"
            placeholder="Stripe payment link URL"
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
          />
          <button onClick={handleCreate} disabled={!name || !paymentLink || creating}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      {rooms.length === 0 ? (
        <p>No rooms yet. Create one to get started.</p>
      ) : (
        rooms.map((room) => <RoomCard key={room.roomId} room={room} />)
      )}
    </div>
  );
}
