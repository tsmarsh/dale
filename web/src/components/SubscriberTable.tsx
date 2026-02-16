import type { SubscriberResponse } from '../api/types';

interface SubscriberTableProps {
  subscribers: SubscriberResponse[];
}

export function SubscriberTable({ subscribers }: SubscriberTableProps) {
  if (subscribers.length === 0) {
    return <p>No subscribers yet.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Telegram User ID</th>
          <th>Status</th>
          <th>Since</th>
        </tr>
      </thead>
      <tbody>
        {subscribers.map((sub) => (
          <tr key={sub.telegramUserId}>
            <td>{sub.telegramUserId}</td>
            <td>{sub.subscriptionStatus}</td>
            <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
