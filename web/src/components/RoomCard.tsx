import { Link } from 'react-router-dom';
import type { RoomResponse } from '../api/types';

interface RoomCardProps {
  room: RoomResponse;
}

export function RoomCard({ room }: RoomCardProps) {
  const hasPayment = !!(room.paymentLink || room.paypalPaymentLink);
  const hasGroup = !!room.telegramGroupId;

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
      <div className="card-setup-status">
        <span className={hasGroup ? 'status-ok' : 'status-missing'}>
          {hasGroup ? '\u2713 Telegram group linked' : '\u2717 No Telegram group \u2014 add your bot to a group'}
        </span>
        <span className={hasPayment ? 'status-ok' : 'status-missing'}>
          {hasPayment ? '\u2713 Payment link configured' : '\u2717 No payment link'}
        </span>
      </div>
    </div>
  );
}
