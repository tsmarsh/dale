import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Amplify handles the OAuth callback automatically.
    // After processing, redirect to dashboard.
    const timer = setTimeout(() => navigate('/'), 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return <div style={{ padding: '2rem', textAlign: 'center' }}>Signing in...</div>;
}
