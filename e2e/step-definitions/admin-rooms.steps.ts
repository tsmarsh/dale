import { When, Given } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';
import { apiRequest } from '../support/http.js';
import assert from 'node:assert/strict';

Given<DaleWorld>('I have created a room named {string}', async function (name: string) {
  assert.ok(this.idToken, 'No auth token available');
  const response = await apiRequest(`${this.config.adminApiUrl}/api/rooms`, 'POST', {
    token: this.idToken,
    body: {
      name,
      description: 'E2E test room',
      paymentLink: 'https://buy.stripe.com/test',
      priceDescription: '$10/month',
    },
  });

  assert.equal(response.status, 201, `Create room failed: ${JSON.stringify(response.body)}`);
  this.lastRoomId = response.body.roomId;
});

When<DaleWorld>(
  'I send an authenticated POST request to {string} with body:',
  async function (path: string, body: string) {
    assert.ok(this.idToken, 'No auth token available');
    this.lastResponse = await apiRequest(`${this.config.adminApiUrl}${path}`, 'POST', {
      token: this.idToken,
      body: JSON.parse(body),
    });

    // Track room for cleanup
    if (this.lastResponse.status === 201 && this.lastResponse.body?.roomId) {
      this.lastRoomId = this.lastResponse.body.roomId;
    }
  },
);

When<DaleWorld>('I send an authenticated GET request to the created room', async function () {
  assert.ok(this.idToken, 'No auth token available');
  assert.ok(this.lastRoomId, 'No room has been created');
  this.lastResponse = await apiRequest(
    `${this.config.adminApiUrl}/api/rooms/${this.lastRoomId}`,
    'GET',
    { token: this.idToken },
  );
});

When<DaleWorld>(
  'I send an authenticated PUT request to the created room with body:',
  async function (body: string) {
    assert.ok(this.idToken, 'No auth token available');
    assert.ok(this.lastRoomId, 'No room has been created');
    this.lastResponse = await apiRequest(
      `${this.config.adminApiUrl}/api/rooms/${this.lastRoomId}`,
      'PUT',
      {
        token: this.idToken,
        body: JSON.parse(body),
      },
    );
  },
);
