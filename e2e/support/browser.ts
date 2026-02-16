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
  // Decode tokens to discover the actual Cognito username.
  // AdminCreateUser may assign a UUID as the internal username even when
  // the email is passed as the Username parameter.
  const accessPayload = decodeJwtPayload(tokens.accessToken);
  const cognitoUsername = (accessPayload.username as string) || username;
  const sub = accessPayload.sub as string;

  // Use addInitScript to inject tokens BEFORE any page JavaScript runs.
  // This guarantees tokens are in localStorage before Amplify.configure() and
  // getCurrentUser() execute, avoiding any race conditions.
  await page.addInitScript(
    ({ clientId, cognitoUsername, sub, email, tokens }) => {
      const prefix = `CognitoIdentityServiceProvider.${clientId}`;
      localStorage.setItem(`${prefix}.LastAuthUser`, cognitoUsername);

      // Set tokens for every possible username variant so Amplify finds them
      const userKeys = new Set([cognitoUsername, sub, email].filter(Boolean));
      for (const key of userKeys) {
        localStorage.setItem(`${prefix}.${key}.idToken`, tokens.idToken);
        localStorage.setItem(`${prefix}.${key}.accessToken`, tokens.accessToken);
        localStorage.setItem(`${prefix}.${key}.refreshToken`, tokens.refreshToken);
        localStorage.setItem(`${prefix}.${key}.clockDrift`, '0');
      }

      // Ensure no stale OAuth inflight flag blocks token loading
      localStorage.removeItem(`${prefix}.inflightOAuth`);
    },
    { clientId, cognitoUsername, sub, email: username, tokens },
  );

  // Navigate to the app — addInitScript runs before page JS, so Amplify
  // will see our tokens when it initializes.
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Verify init script ran and check what bundle is served
  const debug = await page.evaluate(() => {
    const lsCount = localStorage.length;
    const cognitoKeys: string[] = [];
    for (let i = 0; i < lsCount; i++) {
      const key = localStorage.key(i)!;
      if (key.includes('Cognito')) cognitoKeys.push(key);
    }
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(
      (s) => (s as HTMLScriptElement).src,
    );
    return { lsCount, cognitoKeys, scripts, url: window.location.href };
  });
  console.log(`[browser] URL: ${debug.url}`);
  console.log(`[browser] Scripts: ${debug.scripts.join(', ')}`);
  console.log(`[browser] localStorage: ${debug.lsCount} keys, Cognito keys: ${debug.cognitoKeys.length}`);
  if (debug.cognitoKeys.length === 0) {
    console.log('[browser] WARNING: No Cognito keys in localStorage! addInitScript may not have run.');
  }
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
}
