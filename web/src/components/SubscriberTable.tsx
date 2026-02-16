import type { SubscriberResponse } from '../api/types';

interface SubscriberTableProps {
  subscribers: SubscriberResponse[];
}

export function SubscriberTable({ subscribers }: SubscriberTableProps) {
  if (subscribers.length === 0) {
    return <p>No subscribers yet.</p>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', borderBottom: '2px solid #ddd', padding: '0.5rem' }}>Telegram User ID</th>
          <th style={{ textAlign: 'left', borderBottom: '2px solid #ddd', padding: '0.5rem' }}>Status</th>
          <th style={{ textAlign: 'left', borderBottom: '2px solid #ddd', padding: '0.5rem' }}>Since</th>
        </tr>
      </thead>
      <tbody>
        {subscribers.map((sub) => (
          <tr key={sub.telegramUserId}>
            <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{sub.telegramUserId}</td>
            <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{sub.subscriptionStatus}</td>
            <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{new Date(sub.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
