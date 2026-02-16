import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/cyberpunk.css';
import { Amplify } from '@aws-amplify/core';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
import { fetchAuthSession } from '@aws-amplify/auth';
import { setTokenProvider } from './api/client';
import App from './App';

const authConfig = {
  Cognito: {
    userPoolId: import.meta.env.VITE_USER_POOL_ID ?? '',
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID ?? '',
    loginWith: {
      oauth: {
        domain: import.meta.env.VITE_COGNITO_DOMAIN ?? '',
        scopes: ['openid', 'email', 'profile'],
        redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN ?? 'http://localhost:5173/callback'],
        redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT ?? 'http://localhost:5173/'],
        responseType: 'code' as const,
      },
    },
  },
};

cognitoUserPoolsTokenProvider.setAuthConfig(authConfig);

Amplify.configure(
  { Auth: authConfig },
  { Auth: { tokenProvider: cognitoUserPoolsTokenProvider } },
);

// Set token provider before React renders so API calls have auth immediately
setTokenProvider(async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
