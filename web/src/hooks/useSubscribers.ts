import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { SubscriberResponse } from '../api/types';

export function useSubscribers(roomId: string) {
  const [subscribers, setSubscribers] = useState<SubscriberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscribers();
  }, [roomId]);

  async function loadSubscribers() {
    try {
      setLoading(true);
      const data = await api.get<SubscriberResponse[]>(`/api/rooms/${roomId}/subscribers`);
      setSubscribers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }

  return { subscribers, loading, error, reload: loadSubscribers };
}
