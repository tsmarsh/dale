import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const webhookSecretCache = new Map<string, string>();

export async function getTenantIdByWebhookSecret(
  tableName: string,
  secret: string,
): Promise<string | null> {
  const cached = webhookSecretCache.get(secret);
  if (cached) return cached;

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `WHSECRET#${secret}`, sk: 'TENANT' },
    }),
  );

  const tenantId = result.Item?.tenantId as string | undefined;
  if (tenantId) {
    webhookSecretCache.set(secret, tenantId);
  }
  return tenantId ?? null;
}

export function resetWebhookSecretCache(): void {
  webhookSecretCache.clear();
}
