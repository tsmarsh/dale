import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from './client.js';
import type { Tenant } from '../shared/types.js';

export async function createTenant(
  tableName: string,
  tenant: Omit<Tenant, 'pk' | 'sk' | 'GSI1pk' | 'GSI1sk' | 'createdAt' | 'updatedAt'>,
): Promise<Tenant> {
  const now = new Date().toISOString();
  const item: Tenant = {
    pk: `TENANT#${tenant.tenantId}`,
    sk: 'METADATA',
    tenantId: tenant.tenantId,
    cognitoSub: tenant.cognitoSub,
    displayName: tenant.displayName,
    createdAt: now,
    updatedAt: now,
    GSI1pk: `COGNITO#${tenant.cognitoSub}`,
    GSI1sk: 'TENANT',
  };

  await docClient.send(
    new PutCommand({ TableName: tableName, Item: item }),
  );
  return item;
}

export async function getTenantById(
  tableName: string,
  tenantId: string,
): Promise<Tenant | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${tenantId}`, sk: 'METADATA' },
    }),
  );
  return (result.Item as Tenant) ?? null;
}

export async function getTenantByCognitoSub(
  tableName: string,
  cognitoSub: string,
): Promise<Tenant | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1pk = :pk AND GSI1sk = :sk',
      ExpressionAttributeValues: {
        ':pk': `COGNITO#${cognitoSub}`,
        ':sk': 'TENANT',
      },
    }),
  );
  return (result.Items?.[0] as Tenant) ?? null;
}

export async function updateTenant(
  tableName: string,
  tenantId: string,
  updates: { displayName?: string },
): Promise<void> {
  const expressionParts: string[] = ['#updatedAt = :updatedAt'];
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const values: Record<string, string> = { ':updatedAt': new Date().toISOString() };

  if (updates.displayName !== undefined) {
    expressionParts.push('#displayName = :displayName');
    names['#displayName'] = 'displayName';
    values[':displayName'] = updates.displayName;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `TENANT#${tenantId}`, sk: 'METADATA' },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }),
  );
}
