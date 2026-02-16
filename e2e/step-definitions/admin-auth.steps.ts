import { When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { DaleWorld } from '../support/world.js';
import { apiRequest } from '../support/http.js';

When<DaleWorld>('I send a GET request to {string} without auth', async function (path: string) {
  this.lastResponse = await apiRequest(`${this.config.adminApiUrl}${path}`, 'GET');
});

When<DaleWorld>('I send a GET request to {string} with token {string}', async function (path: string, token: string) {
  this.lastResponse = await apiRequest(`${this.config.adminApiUrl}${path}`, 'GET', { token });
});

When<DaleWorld>('I send an authenticated GET request to {string}', async function (path: string) {
  assert.ok(this.idToken, 'No auth token available');
  this.lastResponse = await apiRequest(`${this.config.adminApiUrl}${path}`, 'GET', {
    token: this.idToken,
  });
});
