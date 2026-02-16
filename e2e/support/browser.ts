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

  console.log(`[browser] Injecting auth — cognito username: ${cognitoUsername}, sub: ${sub}, email: ${username}`);

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

      // Capture errors for debugging
      (window as any).__amplifyErrors = [];
      const origError = console.error;
      console.error = (...args: any[]) => {
        (window as any).__amplifyErrors.push(args.map(String).join(' '));
        origError.apply(console, args);
      };
    },
    { clientId, cognitoUsername, sub, email: username, tokens },
  );

  // Also capture browser console logs server-side for debugging
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Auth') || msg.text().includes('Cognito')) {
      console.log(`[browser console ${msg.type()}] ${msg.text()}`);
    }
  });

  // Navigate to the app — addInitScript runs before page JS, so Amplify
  // will see our tokens when it initializes.
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Verify the deployed app's client ID matches what we injected.
  // Amplify bakes VITE_USER_POOL_CLIENT_ID into the bundle at build time.
  const appClientId = await page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.includes('CognitoIdentityServiceProvider') && key.includes('LastAuthUser')) {
        // Extract clientId from: CognitoIdentityServiceProvider.{clientId}.LastAuthUser
        const parts = key.split('.');
        return parts[1];
      }
    }
    return null;
  });
  console.log(`[browser] Injected clientId: ${clientId}, app clientId from localStorage: ${appClientId}`);

  // Check what the page shows after auth injection
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  console.log('[browser] Page text after navigation:', bodyText);

  // If we still see the sign-in page, dump localStorage for debugging
  if (bodyText.includes('Sign in')) {
    const lsKeys = await page.evaluate(() => {
      const result: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.includes('Cognito')) {
          const val = localStorage.getItem(key) ?? '';
          result[key] = val.length > 50 ? val.substring(0, 50) + '...' : val;
        }
      }
      return result;
    });
    console.log('[browser] WARNING: Still on sign-in page. localStorage keys:', JSON.stringify(lsKeys, null, 2));

    // Check for any console errors from the page
    const consoleErrors = await page.evaluate(() => (window as any).__amplifyErrors ?? []);
    console.log('[browser] Console errors:', JSON.stringify(consoleErrors));
  }
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
}
