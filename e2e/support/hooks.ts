import { Before, After } from '@cucumber/cucumber';
import { DaleWorld } from './world.js';
import { createTestUser, deleteTestUser } from './auth.js';
import { cleanupDynamoDBTenant, cleanupSSMParams, cleanupWebhookSecret } from './cleanup.js';

Before<DaleWorld>({ tags: '@auth' }, async function () {
  const user = await createTestUser(
    this.config.userPoolId,
    this.config.userPoolClientId,
  );
  this.idToken = user.idToken;
  this.cognitoUsername = user.username;
});

After<DaleWorld>(async function () {
  // Clean up tenants from DynamoDB and SSM
  for (const tenantId of this.tenantIds) {
    await cleanupDynamoDBTenant(this.config.tableName, tenantId);
    await cleanupSSMParams(tenantId);
  }

  // Clean up webhook secrets
  for (const secret of this.webhookSecrets) {
    await cleanupWebhookSecret(this.config.tableName, secret);
  }

  // Clean up Cognito user
  if (this.cognitoUsername) {
    await deleteTestUser(this.config.userPoolId, this.cognitoUsername);
  }
});
