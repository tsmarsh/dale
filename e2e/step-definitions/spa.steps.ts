import { When } from '@cucumber/cucumber';
import { DaleWorld } from '../support/world.js';

When<DaleWorld>('I request the SPA root', async function () {
  const response = await fetch(this.config.webDistributionUrl);
  this.lastResponse = {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  };
});

When<DaleWorld>('I request the SPA path {string}', async function (path: string) {
  const response = await fetch(`${this.config.webDistributionUrl}${path}`);
  this.lastResponse = {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
  };
});
