import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Page } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR
  ? resolve(process.env.SCREENSHOT_DIR)
  : resolve(__dirname, '../../site/screenshots');

export interface CognitoTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString());
}

export async function injectCognitoAuth(
  page: Page,
  baseUrl: string,
  clientId: string,
  username: string,
  tokens: CognitoTokens,
): Promise<void> {
  // Decode the idToken to get the Cognito sub (UUID) — Amplify v6 uses
  // the sub as the last-auth-user key, not the email.
  const payload = decodeJwtPayload(tokens.idToken);
  const sub = payload.sub as string;
  const lastAuthUser = sub || username;

  // Navigate to the app origin so localStorage writes go to the right domain
  await page.goto(baseUrl, { waitUntil: 'commit' });

  // Inject Cognito tokens into localStorage in the format Amplify v6 expects
  await page.evaluate(
    ({ clientId, lastAuthUser, username, tokens }) => {
      const prefix = `CognitoIdentityServiceProvider.${clientId}`;
      localStorage.setItem(`${prefix}.LastAuthUser`, lastAuthUser);

      // Set tokens keyed by both sub and username for compatibility
      for (const key of [lastAuthUser, username]) {
        localStorage.setItem(`${prefix}.${key}.idToken`, tokens.idToken);
        localStorage.setItem(`${prefix}.${key}.accessToken`, tokens.accessToken);
        localStorage.setItem(`${prefix}.${key}.refreshToken`, tokens.refreshToken);
        localStorage.setItem(`${prefix}.${key}.clockDrift`, '0');
      }
    },
    { clientId, lastAuthUser, username, tokens },
  );

  // Reload so Amplify picks up the injected tokens
  await page.reload({ waitUntil: 'networkidle' });
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
}
