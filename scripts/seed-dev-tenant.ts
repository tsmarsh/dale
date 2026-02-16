#!/usr/bin/env npx tsx

/**
 * Seed a development tenant with test credentials.
 * Usage: TABLE_NAME=DaleStack-DatabaseDaleTableXXX npx tsx scripts/seed-dev-tenant.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const tableName = process.env.TABLE_NAME;
if (!tableName) {
  console.error('TABLE_NAME env var is required');
  process.exit(1);
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const now = new Date().toISOString();

const tenantId = 'dev-tenant';
const webhookSecret = 'dev-webhook-secret';
const cognitoSub = 'dev-cognito-sub';

// Create tenant record
await ddb.send(new PutCommand({
  TableName: tableName,
  Item: {
    pk: `TENANT#${tenantId}`,
    sk: 'METADATA',
    tenantId,
    cognitoSub,
    displayName: 'Dev Creator',
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

// Create a sample room
const roomId = 'dev-room-1';
await ddb.send(new PutCommand({
  TableName: tableName,
  Item: {
    pk: `TENANT#${tenantId}`,
    sk: `ROOM#${roomId}`,
    tenantId,
    roomId,
    name: 'Dev VIP Room',
    description: 'Development test room',
    paymentLink: 'https://buy.stripe.com/test_dev',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
}));

console.log('Dev tenant seeded!');
console.log(`  tenantId: ${tenantId}`);
console.log(`  webhookSecret: ${webhookSecret}`);
console.log(`  roomId: ${roomId}`);
console.log('\nNote: SSM parameters must be created separately for actual bot operation.');
console.log('Create them at: /dale/tenants/dev-tenant/{telegram-bot-token,telegram-webhook-secret,stripe-secret-key,stripe-webhook-secret}');
