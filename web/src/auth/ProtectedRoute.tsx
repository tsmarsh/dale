import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, signInWithEmail, completeNewPassword, signInWithGoogle } =
    useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <div className="loading-text">Loading...</div>;
  }

  if (!isAuthenticated) {
    async function handleEmailSignIn(e: React.FormEvent) {
      e.preventDefault();
      setError('');
      setSubmitting(true);
      try {
        const result = await signInWithEmail(email, password);
        if (result.newPasswordRequired) {
          setNeedsNewPassword(true);
        }
      } catch (err: any) {
        setError(err.message ?? 'Sign in failed');
      } finally {
        setSubmitting(false);
      }
    }

    async function handleNewPassword(e: React.FormEvent) {
      e.preventDefault();
      setError('');
      setSubmitting(true);
      try {
        await completeNewPassword(newPassword);
      } catch (err: any) {
        setError(err.message ?? 'Failed to set new password');
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <div className="hero">
        <h1 className="glitch-auto neon-text">Dale</h1>
        <p>Creator dashboard for managing your Telegram subscriptions.</p>

        {needsNewPassword ? (
          <form onSubmit={handleNewPassword} style={{ maxWidth: '320px', margin: '1rem auto' }}>
            <p>Please set a new password to continue.</p>
            <div className="form-group">
              <label>New Password:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button className="btn-filled" type="submit" disabled={submitting}>
              {submitting ? 'Setting...' : 'Set Password'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSignIn} style={{ maxWidth: '320px', margin: '1rem auto' }}>
            <div className="form-group">
              <label>Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn-filled" type="submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}

        <div style={{ margin: '1rem 0', color: '#666' }}>&mdash; or &mdash;</div>

        <button className="btn-filled" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return <Outlet />;
}
