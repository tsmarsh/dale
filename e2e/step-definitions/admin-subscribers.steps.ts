import { When } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';
import { apiRequest } from '../support/http.js';
import assert from 'node:assert/strict';

When<DaleWorld>(
  "I send an authenticated GET request to the created room's subscribers",
  async function () {
    assert.ok(this.idToken, 'No auth token available');
    assert.ok(this.lastRoomId, 'No room has been created');
    this.lastResponse = await apiRequest(
      `${this.config.adminApiUrl}/api/rooms/${this.lastRoomId}/subscribers`,
      'GET',
      { token: this.idToken },
    );
  },
);
