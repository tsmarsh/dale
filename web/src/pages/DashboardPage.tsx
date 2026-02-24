import { useState } from 'react';
import { useTenant } from '../hooks/useTenant';
import { useRooms } from '../hooks/useRooms';
import { RoomCard } from '../components/RoomCard';
import { SetupRoomWizard } from '../components/SetupRoomWizard';

function GettingStartedChecklist({ rooms }: { rooms: { telegramGroupId?: number; paymentLink: string; paypalPaymentLink?: string }[] }) {
  const hasGroup = rooms.length > 0;
  const hasLinkedGroup = rooms.some((r) => r.telegramGroupId);
  const hasPayment = rooms.some((r) => r.paymentLink || r.paypalPaymentLink);
  const allDone = hasGroup && hasLinkedGroup && hasPayment;

  if (allDone) {
    return (
      <div className="card" style={{ borderColor: 'var(--active)', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--active)' }}>{'\u2705'} You're live! Your paid groups are set up and ready.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.75rem' }}>Getting Started</h3>
      <ul className="checklist">
        <li className="checklist-done">{'\u2705'} Account created</li>
        <li className={hasGroup ? 'checklist-done' : 'checklist-todo'}>
          {hasGroup ? '\u2705' : '\u2B1C'} First group created
        </li>
        <li className={hasLinkedGroup ? 'checklist-done' : 'checklist-todo'}>
          {hasLinkedGroup ? '\u2705' : '\u2B1C'} Telegram group linked
        </li>
        <li className={hasPayment ? 'checklist-done' : 'checklist-todo'}>
          {hasPayment ? '\u2705' : '\u2B1C'} Payment provider configured
        </li>
      </ul>
    </div>
  );
}

export function DashboardPage() {
  const { tenant, loading: tenantLoading, reload: reloadTenant } = useTenant();
  const { rooms, loading: roomsLoading, reload: reloadRooms } = useRooms();
  const [showWizard, setShowWizard] = useState(false);

  if (tenantLoading) return <p>Loading...</p>;

  if (showWizard) {
    return (
      <div>
        <h1>Set Up Group</h1>
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
        <p>Set up your first paid group to get started.</p>
        <button className="btn-primary" onClick={() => setShowWizard(true)}>
          Get Started
        </button>
      </div>
    );
  }

  const noGroupLinked = rooms.length > 0 && !rooms.some((r) => r.telegramGroupId);

  return (
    <div>
      <h1>Welcome, {tenant.displayName}</h1>

      <GettingStartedChecklist rooms={rooms} />

      {noGroupLinked && (
        <div className="card" style={{ borderColor: 'var(--pending)', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--pending)' }}>
            Almost there! Add your bot to a Telegram group to start accepting subscribers.
          </p>
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <div className="flex-between">
          <h2>Your Groups ({rooms.length})</h2>
          <button className="btn-secondary" onClick={() => setShowWizard(true)}>
            Create Group
          </button>
        </div>
        {roomsLoading ? (
          <p>Loading groups...</p>
        ) : rooms.length === 0 ? (
          <p style={{ marginTop: '1rem' }}>No groups yet. Create one to get started.</p>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            {rooms.map((room) => <RoomCard key={room.roomId} room={room} />)}
          </div>
        )}
      </div>
    </div>
  );
}
