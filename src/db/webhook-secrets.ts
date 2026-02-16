import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './client.js';
import type { WebhookSecretMapping } from '../shared/types.js';

export async function createWebhookSecretMapping(
  tableName: string,
  secret: string,
  tenantId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const item: WebhookSecretMapping = {
    pk: `WHSECRET#${secret}`,
    sk: 'TENANT',
    tenantId,
    createdAt: now,
  };
  await docClient.send(
    new PutCommand({ TableName: tableName, Item: item }),
  );
}

export async function getTenantByWebhookSecret(
  tableName: string,
  secret: string,
): Promise<string | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `WHSECRET#${secret}`, sk: 'TENANT' },
    }),
  );
  return (result.Item as WebhookSecretMapping)?.tenantId ?? null;
}
