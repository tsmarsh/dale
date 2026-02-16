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
    <div className="container" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
      <header className="nav-header">
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/rooms">Rooms</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <button className="btn-secondary" onClick={signOut}>Sign out</button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
