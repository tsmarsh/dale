#!/usr/bin/env npx tsx
/**
 * setup-telegram-test-dc.ts
 *
 * One-time setup for Telegram Test DC credentials used by E2E tests
 * across Dale, Eclectic, and Geeveeo.
 *
 * What this does:
 *   1. Connects to Telegram Test DC with your API_ID + API_HASH
 *   2. Authenticates your user account (phone + OTP)
 *   3. Walks you through creating a test bot via BotFather on Test DC
 *   4. Outputs a session string + bot credentials
 *   5. Optionally sets GitHub secrets on all configured repos
 *
 * Prerequisites:
 *   - Get API_ID and API_HASH from https://my.telegram.org/apps
 *     (log in → API development tools → create/find your app)
 *   - AWS CLI configured (for Dale secrets that go to SSM)
 *   - gh CLI authenticated (for GitHub secrets)
 *
 * Usage:
 *   cd /tank/repos/tailoredshapes/dale
 *   TELEGRAM_API_ID=12345 TELEGRAM_API_HASH=abc123 npx tsx scripts/setup-telegram-test-dc.ts
 */

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

// ── Repos to receive GitHub secrets ──────────────────────────────────────────
const GITHUB_REPOS = [
  'tailoredshapes/dale',
  'tailoredshapes/eclectic',
  'tailoredshapes/geeveeo',
];

// GitHub environment to scope secrets to (set to '' for repo-level)
const GITHUB_ENV = 'dev';

// ── Helpers ───────────────────────────────────────────────────────────────────
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> =>
  new Promise(resolve => rl.question(q, resolve));

function bold(s: string) { return `\x1b[1m${s}\x1b[0m`; }
function green(s: string) { return `\x1b[32m${s}\x1b[0m`; }
function yellow(s: string) { return `\x1b[33m${s}\x1b[0m`; }
function red(s: string) { return `\x1b[31m${s}\x1b[0m`; }

function banner(title: string) {
  const line = '─'.repeat(60);
  console.log(`\n${line}\n  ${bold(title)}\n${line}`);
}

function ghSecretSet(repo: string, env: string, name: string, value: string) {
  try {
    if (env) {
      execSync(`gh secret set ${name} --repo ${repo} --env ${env}`, {
        input: value, stdio: ['pipe', 'inherit', 'inherit'],
      });
    } else {
      execSync(`gh secret set ${name} --repo ${repo}`, {
        input: value, stdio: ['pipe', 'inherit', 'inherit'],
      });
    }
    console.log(green(`  ✓ ${repo} [${env || 'repo'}] → ${name}`));
  } catch (e: any) {
    console.log(red(`  ✗ Failed to set ${name} on ${repo}: ${e.message}`));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  banner('Telegram Test DC Setup');

  console.log(`
This script sets up Telegram Test DC credentials for E2E testing.
The Test DC is a sandboxed copy of Telegram — perfect for automated tests.

${bold('Step 0: Get your API credentials')}
  → Go to ${yellow('https://my.telegram.org/apps')}
  → Log in with your phone number
  → Open "API development tools"
  → Copy the App api_id and App api_hash
`);

  const apiIdStr = process.env.TELEGRAM_API_ID ?? await ask('  API ID (integer): ');
  const apiHash = process.env.TELEGRAM_API_HASH ?? await ask('  API Hash: ');
  const apiId = parseInt(apiIdStr.trim(), 10);

  if (isNaN(apiId) || !apiHash.trim()) {
    console.error(red('Invalid API ID or hash. Exiting.'));
    process.exit(1);
  }

  // ── Connect to Test DC ──────────────────────────────────────────────────────
  banner('Step 1: Authenticate with Test DC');
  console.log('Connecting to Telegram Test DC (separate from production)...\n');

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash.trim(), {
    connectionRetries: 3,
    useWSS: true,
    testServers: true,  // ← Test DC
  });

  await client.start({
    phoneNumber: async () => {
      console.log('\nEnter the phone number linked to your Telegram account.');
      console.log('Use international format, e.g. +12125551234\n');
      return ask('  Phone number: ');
    },
    password: async () => ask('  2FA password (if enabled, else Enter): '),
    phoneCode: async () => {
      console.log('\nTelegram sent a code to your app (Test DC codes may appear');
      console.log('in the production Telegram app as a system message).\n');
      return ask('  Verification code: ');
    },
    onError: (err) => {
      console.error(red(`Auth error: ${err.message}`));
    },
  });

  const sessionString = (client.session as StringSession).save();
  console.log(green('\n✓ Connected to Test DC'));

  // ── Create test bot ─────────────────────────────────────────────────────────
  banner('Step 2: Create a Test Bot via BotFather');
  console.log(`
On the Test DC, BotFather is a real bot (user ID 93372553).
We'll message it to create your test bot automatically.
`);

  let botToken = '';
  let botUsername = '';

  try {
    // Resolve BotFather on test DC
    const botFatherId = 93372553;

    // Send /newbot
    await client.sendMessage(botFatherId, { message: '/newbot' });
    await new Promise(r => setTimeout(r, 2000));

    const defaultBotName = `Dale E2E Test Bot ${Date.now()}`;
    console.log(`  Sending bot name: ${defaultBotName}`);
    await client.sendMessage(botFatherId, { message: defaultBotName });
    await new Promise(r => setTimeout(r, 2000));

    // Username must end in 'bot'
    const defaultUsername = `dale_e2e_${Date.now()}_bot`;
    console.log(`  Sending username: @${defaultUsername}`);
    await client.sendMessage(botFatherId, { message: defaultUsername });
    await new Promise(r => setTimeout(r, 3000));

    // Read the reply
    const messages = await client.getMessages(botFatherId, { limit: 5 });
    const tokenMsg = messages.find(m => m.message?.includes('Use this token'));
    if (tokenMsg) {
      const match = tokenMsg.message.match(/(\d+:[A-Za-z0-9_-]+)/);
      if (match) {
        botToken = match[1];
        botUsername = defaultUsername;
        console.log(green(`\n✓ Bot created: @${botUsername}`));
        console.log(green(`✓ Token: ${botToken.slice(0, 12)}...`));
      }
    }
  } catch (err: any) {
    console.log(yellow(`\nAutomatic bot creation failed: ${err.message}`));
  }

  // Fallback to manual if auto failed
  if (!botToken) {
    console.log(yellow('\nAutomatic creation failed. Please create manually:'));
    console.log('  1. Open Telegram → search for a contact with ID 93372553 (BotFather on Test DC)');
    console.log('     OR connect to test.telegram.org and message @BotFather there');
    console.log('  2. Send /newbot → give it any name + username ending in "bot"');
    console.log('  3. Copy the token it gives you\n');
    botToken = (await ask('  Paste bot token: ')).trim();
    botUsername = (await ask('  Bot username (without @): ')).trim();
  }

  await client.disconnect();

  // ── Summary ─────────────────────────────────────────────────────────────────
  banner('Credentials');
  const creds = {
    TELEGRAM_API_ID: String(apiId),
    TELEGRAM_API_HASH: apiHash.trim(),
    TELEGRAM_TEST_SESSION: sessionString,
    TELEGRAM_TEST_BOT_TOKEN: botToken,
    TELEGRAM_TEST_BOT_USERNAME: botUsername,
  };

  console.log('\nYour Test DC credentials:\n');
  for (const [k, v] of Object.entries(creds)) {
    const display = k === 'TELEGRAM_TEST_SESSION' ? `${v.slice(0, 20)}...` : v;
    console.log(`  ${k.padEnd(30)} = ${display}`);
  }

  // ── Set GitHub secrets ───────────────────────────────────────────────────────
  banner('Step 3: Set GitHub Secrets');
  const setSecrets = (await ask(
    `\nSet these as GitHub secrets on [${GITHUB_REPOS.join(', ')}]? [Y/n] `
  )).trim().toLowerCase();

  if (setSecrets !== 'n') {
    console.log('\nChecking gh CLI...');
    try {
      execSync('gh auth status', { stdio: 'pipe' });
    } catch {
      console.log(red('gh CLI not authenticated. Run: gh auth login'));
      process.exit(1);
    }

    for (const repo of GITHUB_REPOS) {
      console.log(`\n  ${bold(repo)}`);
      for (const [name, value] of Object.entries(creds)) {
        ghSecretSet(repo, GITHUB_ENV, name, value);
      }
    }
    console.log(green('\n✓ All secrets set'));
  }

  // ── Print export block ───────────────────────────────────────────────────────
  banner('Done');
  console.log('\nFor local E2E runs, add to your shell or .env:\n');
  for (const [k, v] of Object.entries(creds)) {
    console.log(`  export ${k}="${v}"`);
  }
  console.log('\nStore the SESSION STRING safely — it grants full account access on Test DC.');
  console.log('For production bots, always use a dedicated test account, not your main one.\n');

  rl.close();
}

main().catch(err => {
  console.error(red(`\nFatal: ${err.message}`));
  process.exit(1);
});
