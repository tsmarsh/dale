#!/usr/bin/env npx tsx

/**
 * Create a tenant manually.
 * Usage: npx tsx scripts/create-tenant.ts <displayName> <cognitoSub> <botToken> <stripeSecretKey> <stripeWebhookSecret>
 */

import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomBytes } from 'crypto';
import { ulid } from 'ulid';

const [displayName, cognitoSub, botToken, stripeSecretKey, stripeWebhookSecret] = process.argv.slice(2);

if (!displayName || !cognitoSub || !botToken || !stripeSecretKey || !stripeWebhookSecret) {
  console.error('Usage: npx tsx scripts/create-tenant.ts <displayName> <cognitoSub> <botToken> <stripeSecretKey> <stripeWebhookSecret>');
  process.exit(1);
}

const tableName = process.env.TABLE_NAME;
if (!tableName) {
  console.error('TABLE_NAME env var is required');
  process.exit(1);
}

const ssm = new SSMClient({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const tenantId = ulid();
const webhookSecret = randomBytes(32).toString('hex');
const now = new Date().toISOString();

// Store secrets in SSM
const secrets = {
  'telegram-bot-token': botToken,
  'telegram-webhook-secret': webhookSecret,
  'stripe-secret-key': stripeSecretKey,
  'stripe-webhook-secret': stripeWebhookSecret,
};

for (const [key, value] of Object.entries(secrets)) {
  await ssm.send(new PutParameterCommand({
    Name: `/dale/tenants/${tenantId}/${key}`,
    Value: value,
    Type: 'SecureString',
    Overwrite: true,
  }));
}

// Create tenant record
await ddb.send(new PutCommand({
  TableName: tableName,
  Item: {
    pk: `TENANT#${tenantId}`,
    sk: 'METADATA',
    tenantId,
    cognitoSub,
    displayName,
    createdAt: now,
    updatedAt: now,
    GSI1pk: `COGNITO#${cognitoSub}`,
    GSI1sk: 'TENANT',
  },
}));

// Create webhook secret mapping
await ddb.send(new PutCommand({
  TableName: tableName,
  Item: {
    pk: `WHSECRET#${webhookSecret}`,
    sk: 'TENANT',
    tenantId,
    createdAt: now,
  },
}));

console.log('Tenant created successfully!');
console.log(`  tenantId: ${tenantId}`);
console.log(`  webhookSecret: ${webhookSecret}`);
console.log(`\nNext: register the Telegram webhook:`);
console.log(`  npx tsx scripts/register-webhook.ts <functionUrl> ${botToken} ${webhookSecret}`);
