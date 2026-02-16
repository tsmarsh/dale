import { Given, When, Then } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';
import { injectCognitoAuth, takeScreenshot } from '../support/browser.js';
import assert from 'node:assert/strict';

Given<DaleWorld>('I am authenticated in the browser', { timeout: 30000 }, async function () {
  assert.ok(this.page, 'No browser page available — is @tutorial tag set?');
  assert.ok(this.idToken && this.accessToken && this.refreshToken, 'No auth tokens — is @auth tag set?');
  assert.ok(this.cognitoUsername, 'No Cognito username');

  await injectCognitoAuth(
    this.page,
    this.config.webDistributionUrl,
    this.config.userPoolClientId,
    this.cognitoUsername,
    {
      idToken: this.idToken,
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    },
  );
});

When<DaleWorld>('I navigate to the onboarding page', { timeout: 15000 }, async function () {
  assert.ok(this.page);
  await this.page.goto(`${this.config.webDistributionUrl}/onboarding`, { waitUntil: 'networkidle' });
});

When<DaleWorld>('I navigate to the dashboard page', { timeout: 15000 }, async function () {
  assert.ok(this.page);
  await this.page.goto(`${this.config.webDistributionUrl}/`, { waitUntil: 'networkidle' });
});

When<DaleWorld>('I navigate to the rooms page', { timeout: 15000 }, async function () {
  assert.ok(this.page);
  await this.page.goto(`${this.config.webDistributionUrl}/rooms`, { waitUntil: 'networkidle' });
});

When<DaleWorld>('I navigate to the settings page', { timeout: 15000 }, async function () {
  assert.ok(this.page);
  await this.page.goto(`${this.config.webDistributionUrl}/settings`, { waitUntil: 'networkidle' });
});

When<DaleWorld>('I fill in {string} with {string}', { timeout: 10000 }, async function (placeholder: string, value: string) {
  assert.ok(this.page);
  const input = this.page.locator(`input[placeholder="${placeholder}"]`);
  await input.fill(value);
});

When<DaleWorld>('I click {string}', { timeout: 10000 }, async function (text: string) {
  assert.ok(this.page);
  await this.page.locator(`button:has-text("${text}")`).click();
  await this.page.waitForTimeout(500);
});

When<DaleWorld>('I click on the room {string}', { timeout: 15000 }, async function (roomName: string) {
  assert.ok(this.page);
  await this.page.locator(`a:has-text("${roomName}")`).click();
  await this.page.waitForLoadState('networkidle');
});

Then<DaleWorld>('I should see {string}', { timeout: 15000 }, async function (text: string) {
  assert.ok(this.page);
  await this.page.waitForSelector(`text=${text}`, { timeout: 10000 });
});

Then<DaleWorld>('I take a screenshot named {string}', { timeout: 10000 }, async function (name: string) {
  assert.ok(this.page);
  await takeScreenshot(this.page, name);
});
