import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from '@aws-amplify/core';
import { cognitoUserPoolsTokenProvider } from '@aws-amplify/auth/cognito';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
