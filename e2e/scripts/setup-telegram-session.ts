#!/usr/bin/env tsx
/**
 * One-time setup script to generate a GramJS StringSession for the Telegram Test DC.
 *
 * Usage:
 *   npx tsx e2e/scripts/setup-telegram-session.ts
 *
 * You will be prompted for:
 *   - api_id and api_hash (from https://my.telegram.org)
 *   - Phone number (use +99966XYYYY for test DC, where X=DC number, YYYY=any digits)
 *   - Verification code (always 22222 on test DC)
 *
 * The script outputs the session string to stdout. Save it as a GitHub Actions secret.
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import * as readline from 'readline';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const apiIdStr = await prompt('Enter your api_id: ');
  const apiId = parseInt(apiIdStr, 10);
  if (isNaN(apiId)) {
    console.error('Invalid api_id');
    process.exit(1);
  }

  const apiHash = await prompt('Enter your api_hash: ');
  if (!apiHash) {
    console.error('Invalid api_hash');
    process.exit(1);
  }

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 3,
    testServers: true,
  });

  await client.start({
    phoneNumber: async () => await prompt('Enter phone number (e.g. +99966XYYYY): '),
    phoneCode: async () => await prompt('Enter verification code (22222 for test DC): '),
    password: async () => await prompt('Enter 2FA password (if set): '),
    onError: (err) => console.error('Auth error:', err),
  });

  console.error('\nAuthentication successful!');
  console.error('Save the following session string as your E2E_TELEGRAM_TEST_SESSION secret:\n');

  // Output only the session string to stdout (so it can be piped)
  console.log(client.session.save());

  await client.disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
