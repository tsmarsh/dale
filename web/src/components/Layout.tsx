import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useEffect } from 'react';
import { setTokenProvider } from '../api/client';

export function Layout() {
  const { signOut, getToken } = useAuth();

  useEffect(() => {
    setTokenProvider(getToken);
  }, [getToken]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">Dashboard</Link>
          <Link to="/rooms">Rooms</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <button onClick={signOut} style={{ cursor: 'pointer' }}>Sign out</button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
