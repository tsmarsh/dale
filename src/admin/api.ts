import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { getPlatformConfig } from '../shared/config.js';
import { extractAuthContext, extractCognitoSub } from './middleware/auth.js';
import { handleGetTenant, handleUpdateTenant, handleOnboard } from './routes/tenant.js';
import { handleListRooms, handleGetRoom, handleCreateRoom, handleUpdateRoom } from './routes/rooms.js';
import { handleListSubscribers } from './routes/subscribers.js';
import { handleRegisterWebhook } from './routes/webhooks.js';
import { createWebhookSecretMapping } from '../db/webhook-secrets.js';
import { setWebhook } from '../telegram/api.js';
import { ulid } from 'ulid';
import { randomBytes } from 'crypto';

const ssm = new SSMClient({});

function json(result: { statusCode: number; body: string }): APIGatewayProxyResultV2 {
  return {
    statusCode: result.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: result.body,
  };
}

async function storeSecrets(tenantId: string, secrets: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(secrets)) {
    await ssm.send(
      new PutParameterCommand({
        Name: `/dale/tenants/${tenantId}/${key}`,
        Value: value,
        Type: 'SecureString',
        Overwrite: true,
      }),
    );
  }
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  // Handle CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return json({ statusCode: 200, body: '' });
  }

  const config = getPlatformConfig();
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  // Onboarding — only requires cognitoSub, not existing tenant
  if (path === '/api/tenant/onboard' && method === 'POST') {
    const cognitoSub = extractCognitoSub(event);
    if (!cognitoSub) {
      return json({ statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) });
    }
    return json(
      await handleOnboard(config.tableName, cognitoSub, event.body ?? '', {
        generateId: () => ulid(),
        generateSecret: () => randomBytes(32).toString('hex'),
        storeSecrets,
        createWebhookSecretMapping,
        setWebhook,
        telegramWebhookUrl: config.telegramWebhookUrl,
        stripeWebhookUrl: config.stripeWebhookUrl,
      }),
    );
  }

  // All other routes require existing tenant
  const auth = await extractAuthContext(event, config.tableName);
  if (!auth) {
    return json({ statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) });
  }

  // Tenant routes
  if (path === '/api/tenant' && method === 'GET') {
    return json(await handleGetTenant(config.tableName, auth));
  }
  if (path === '/api/tenant' && method === 'PUT') {
    return json(await handleUpdateTenant(config.tableName, auth, event.body ?? ''));
  }

  // Room routes
  if (path === '/api/rooms' && method === 'GET') {
    return json(await handleListRooms(config.tableName, auth));
  }
  if (path === '/api/rooms' && method === 'POST') {
    return json(await handleCreateRoom(config.tableName, auth, event.body ?? ''));
  }

  // Room detail routes
  const roomMatch = path.match(/^\/api\/rooms\/([^/]+)$/);
  if (roomMatch) {
    const roomId = roomMatch[1];
    if (method === 'GET') {
      return json(await handleGetRoom(config.tableName, auth, roomId));
    }
    if (method === 'PUT') {
      return json(await handleUpdateRoom(config.tableName, auth, roomId, event.body ?? ''));
    }
  }

  // Subscriber routes
  const subMatch = path.match(/^\/api\/rooms\/([^/]+)\/subscribers$/);
  if (subMatch && method === 'GET') {
    return json(await handleListSubscribers(config.tableName, auth, subMatch[1]));
  }

  // Webhook registration
  if (path === '/api/tenant/register-webhook' && method === 'POST') {
    return json(await handleRegisterWebhook(auth, config.telegramWebhookUrl));
  }

  return json({ statusCode: 404, body: JSON.stringify({ error: 'Not found' }) });
}
