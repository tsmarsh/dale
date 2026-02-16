import { World, setWorldConstructor } from '@cucumber/cucumber';
import { E2EConfig, loadConfig } from '../env.js';
import { HttpResponse } from './http.js';

export class DaleWorld extends World {
  config: E2EConfig;

  // Auth state
  idToken?: string;
  cognitoUsername?: string;

  // Response state
  lastResponse?: HttpResponse;

  // Entity state for multi-step scenarios
  lastRoomId?: string;

  // Cleanup registries
  tenantIds: string[] = [];
  webhookSecrets: string[] = [];

  constructor(options: any) {
    super(options);
    this.config = loadConfig();
  }
}

setWorldConstructor(DaleWorld);
