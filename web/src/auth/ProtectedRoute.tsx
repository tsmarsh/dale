import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, signIn } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Dale</h1>
        <p>Creator dashboard for managing your Telegram subscriptions.</p>
        <button onClick={signIn} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return <Outlet />;
}
