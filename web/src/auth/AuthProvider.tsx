import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  signInWithRedirect,
  signOut,
  signIn,
  confirmSignIn,
  fetchAuthSession,
} from '@aws-amplify/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  signInWithEmail: (email: string, password: string) => Promise<{ newPasswordRequired: boolean }>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  signInWithGoogle: () => void;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  signInWithEmail: async () => ({ newPasswordRequired: false }),
  completeNewPassword: async () => {},
  signInWithGoogle: () => {},
  signOut: async () => {},
  getToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      setUserId(user.userId);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignInWithEmail(
    email: string,
    password: string,
  ): Promise<{ newPasswordRequired: boolean }> {
    const result = await signIn({ username: email, password });
    if (
      result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
    ) {
      return { newPasswordRequired: true };
    }
    await checkAuth();
    return { newPasswordRequired: false };
  }

  async function handleCompleteNewPassword(newPassword: string): Promise<void> {
    await confirmSignIn({ challengeResponse: newPassword });
    await checkAuth();
  }

  function handleSignInWithGoogle() {
    signInWithRedirect({ provider: { custom: 'Google' } });
  }

  async function handleSignOut() {
    await signOut();
    setIsAuthenticated(false);
    setUserId(null);
  }

  async function getToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userId,
        signInWithEmail: handleSignInWithEmail,
        completeNewPassword: handleCompleteNewPassword,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
