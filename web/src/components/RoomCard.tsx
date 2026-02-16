import { Link } from 'react-router-dom';
import type { RoomResponse } from '../api/types';

interface RoomCardProps {
  room: RoomResponse;
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to={`/rooms/${room.roomId}`} style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          {room.name}
        </Link>
        <span style={{ color: room.isActive ? 'green' : 'gray' }}>
          {room.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {room.description && <p style={{ color: '#666', margin: '0.25rem 0' }}>{room.description}</p>}
      {room.telegramGroupId && <p style={{ fontSize: '0.8rem', color: '#999' }}>Telegram Group: {room.telegramGroupId}</p>}
    </div>
  );
}
