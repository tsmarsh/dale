import { Then } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';
import assert from 'node:assert/strict';

Then<DaleWorld>('the response status should be {int}', function (status: number) {
  assert.ok(this.lastResponse, 'No response recorded');
  assert.equal(this.lastResponse.status, status);
});

Then<DaleWorld>('the response status should be {int} or {int}', function (status1: number, status2: number) {
  assert.ok(this.lastResponse, 'No response recorded');
  assert.ok(
    this.lastResponse.status === status1 || this.lastResponse.status === status2,
    `Expected status ${status1} or ${status2}, got ${this.lastResponse.status}`,
  );
});

Then<DaleWorld>('the response body should have field {string}', function (field: string) {
  assert.ok(this.lastResponse, 'No response recorded');
  assert.ok(
    typeof this.lastResponse.body === 'object' && field in this.lastResponse.body,
    `Expected body to have field "${field}", body: ${JSON.stringify(this.lastResponse.body)}`,
  );
});

Then<DaleWorld>('the response body should be an array of length {int}', function (length: number) {
  assert.ok(this.lastResponse, 'No response recorded');
  assert.ok(Array.isArray(this.lastResponse.body), `Expected body to be an array, got: ${typeof this.lastResponse.body}`);
  assert.equal(this.lastResponse.body.length, length);
});

Then<DaleWorld>('the response should have header {string}', function (header: string) {
  assert.ok(this.lastResponse, 'No response recorded');
  assert.ok(
    this.lastResponse.headers.has(header),
    `Expected header "${header}" to be present`,
  );
});

Then<DaleWorld>('the response body should contain {string}', function (text: string) {
  assert.ok(this.lastResponse, 'No response recorded');
  const body = typeof this.lastResponse.body === 'string'
    ? this.lastResponse.body
    : JSON.stringify(this.lastResponse.body);
  assert.ok(
    body.toLowerCase().includes(text.toLowerCase()),
    `Expected body to contain "${text}"`,
  );
});
