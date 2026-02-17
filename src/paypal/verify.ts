import type { TenantSecrets } from '../shared/types.js';

interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
}

interface PayPalVerifyResponse {
  verification_status: 'SUCCESS' | 'FAILURE';
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed: ${response.status}`);
  }

  const data = await response.json() as PayPalTokenResponse;
  return data.access_token;
}

export async function verifyPayPalWebhook(
  headers: Record<string, string | undefined>,
  body: string,
  tenantSecrets: TenantSecrets,
): Promise<boolean> {
  if (!tenantSecrets.paypalClientId || !tenantSecrets.paypalClientSecret || !tenantSecrets.paypalWebhookId) {
    return false;
  }

  const accessToken = await getAccessToken(tenantSecrets.paypalClientId, tenantSecrets.paypalClientSecret);

  const response = await fetch('https://api-m.paypal.com/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: tenantSecrets.paypalWebhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!response.ok) {
    console.error(`PayPal webhook verification failed: ${response.status}`);
    return false;
  }

  const data = await response.json() as PayPalVerifyResponse;
  return data.verification_status === 'SUCCESS';
}
