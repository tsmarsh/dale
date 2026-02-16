import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { TenantResponse } from '../api/types';

export function useTenant() {
  const [tenant, setTenant] = useState<TenantResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenant();
  }, []);

  async function loadTenant() {
    try {
      setLoading(true);
      const data = await api.get<TenantResponse>('/api/tenant');
      setTenant(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tenant';
      if (message.includes('404') || message.includes('401')) {
        setTenant(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return { tenant, loading, error, reload: loadTenant };
}
