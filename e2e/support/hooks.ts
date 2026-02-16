import { Before, After } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import { DaleWorld } from './world.js';
import { createTestUser, deleteTestUser } from './auth.js';
import { cleanupDynamoDBTenant, cleanupSSMParams, cleanupWebhookSecret } from './cleanup.js';

Before<DaleWorld>({ tags: '@auth' }, async function () {
  const user = await createTestUser(
    this.config.userPoolId,
    this.config.userPoolClientId,
  );
  this.idToken = user.idToken;
  this.accessToken = user.accessToken;
  this.refreshToken = user.refreshToken;
  this.cognitoUsername = user.username;
});

Before<DaleWorld>({ tags: '@tutorial' }, async function () {
  this.browser = await chromium.launch({ headless: true });
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  this.page = await this.context.newPage();
});

After<DaleWorld>({ tags: '@tutorial' }, async function () {
  if (this.browser) {
    await this.browser.close();
    this.browser = undefined;
    this.context = undefined;
    this.page = undefined;
  }
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
