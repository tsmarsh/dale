import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, signIn } = useAuth();

  if (isLoading) {
    return <div className="loading-text">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="hero">
        <h1 className="glitch-auto neon-text">Dale</h1>
        <p>Creator dashboard for managing your Telegram subscriptions.</p>
        <button className="btn-filled" onClick={signIn}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return <Outlet />;
}
