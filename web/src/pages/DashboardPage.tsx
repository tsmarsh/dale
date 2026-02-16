import { useNavigate } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { useRooms } from '../hooks/useRooms';
import { RoomCard } from '../components/RoomCard';

export function DashboardPage() {
  const navigate = useNavigate();
  const { tenant, loading: tenantLoading } = useTenant();
  const { rooms, loading: roomsLoading } = useRooms();

  if (tenantLoading) return <p>Loading...</p>;

  if (!tenant) {
    navigate('/onboarding');
    return null;
  }

  return (
    <div>
      <h1>Welcome, {tenant.displayName}</h1>
      <div style={{ marginTop: '1rem' }}>
        <h2>Your Rooms ({rooms.length})</h2>
        {roomsLoading ? (
          <p>Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <p>No rooms yet. <a href="/rooms">Create one</a>.</p>
        ) : (
          rooms.map((room) => <RoomCard key={room.roomId} room={room} />)
        )}
      </div>
    </div>
  );
}
