import { When } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';

When<DaleWorld>('I send an OPTIONS request to {string}', async function (path: string) {
  const response = await fetch(`${this.config.adminApiUrl}${path}`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://example.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization',
    },
  });

  this.lastResponse = {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  };
});
