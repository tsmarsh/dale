import { World, setWorldConstructor } from '@cucumber/cucumber';
import { E2EConfig, loadConfig } from '../env.js';
import { HttpResponse } from './http.js';
import type { Browser, BrowserContext, Page } from 'playwright';

export class DaleWorld extends World {
  config: E2EConfig;

  // Auth state
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  cognitoUsername?: string;

  // Response state
  lastResponse?: HttpResponse;

  // Entity state for multi-step scenarios
  lastRoomId?: string;

  // Browser state (tutorial scenarios)
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;

  // Cleanup registries
  tenantIds: string[] = [];
  webhookSecrets: string[] = [];

  constructor(options: any) {
    super(options);
    this.config = loadConfig();
  }
}

setWorldConstructor(DaleWorld);
