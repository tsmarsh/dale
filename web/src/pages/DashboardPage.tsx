import { useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { useRooms } from '../hooks/useRooms';
import { RoomCard } from '../components/RoomCard';
import { SetupRoomWizard } from '../components/SetupRoomWizard';

export function DashboardPage() {
  const { tenant, loading: tenantLoading, reload: reloadTenant } = useTenant();
  const { rooms, loading: roomsLoading, reload: reloadRooms } = useRooms();
  const [showWizard, setShowWizard] = useState(false);

  if (tenantLoading) return <p>Loading...</p>;

  if (showWizard) {
    return (
      <div>
        <h1>Setup Room</h1>
        <SetupRoomWizard
          hasTenant={!!tenant}
          onComplete={async () => {
            await reloadTenant();
            await reloadRooms();
            setShowWizard(false);
          }}
        />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div>
        <h1>Welcome to Dale!</h1>
        <p>Set up your first room to get started.</p>
        <button className="btn-primary" onClick={() => setShowWizard(true)}>
          Setup Room
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {tenant.displayName}</h1>
      <div style={{ marginTop: '1rem' }}>
        <h2>Your Rooms ({rooms.length})</h2>
        {roomsLoading ? (
          <p>Loading rooms...</p>
        ) : rooms.length === 0 ? (
          <div>
            <p>No rooms yet.</p>
            <button className="btn-primary" onClick={() => setShowWizard(true)}>
              Create Room
            </button>
          </div>
        ) : (
          rooms.map((room) => <RoomCard key={room.roomId} room={room} />)
        )}
      </div>
    </div>
  );
}
