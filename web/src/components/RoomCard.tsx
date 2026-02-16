import { Link } from 'react-router-dom';
import type { RoomResponse } from '../api/types';

interface RoomCardProps {
  room: RoomResponse;
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="card">
      <div className="card-header">
        <Link to={`/rooms/${room.roomId}`} className="card-title">
          {room.name}
        </Link>
        <span className={`badge ${room.isActive ? 'badge-active' : 'badge-inactive'}`}>
          {room.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {room.description && <p className="card-description">{room.description}</p>}
      {room.telegramGroupId && <p className="card-meta">Telegram Group: {room.telegramGroupId}</p>}
    </div>
  );
}
