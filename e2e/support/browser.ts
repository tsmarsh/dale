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
  const accessPayload = decodeJwtPayload(tokens.accessToken);
  const cognitoUsername = (accessPayload.username as string) || username;
  const sub = accessPayload.sub as string;
  const exp = accessPayload.exp as number;

  console.log(`[browser] Injecting auth — cognito username: ${cognitoUsername}, sub: ${sub}, email: ${username}`);
  console.log(`[browser] Token exp: ${exp}, now: ${Math.floor(Date.now() / 1000)}, remaining: ${exp - Math.floor(Date.now() / 1000)}s`);

  // Use addInitScript to inject tokens BEFORE any page JavaScript runs.
  await page.addInitScript(
    ({ clientId, cognitoUsername, sub, email, tokens }) => {
      const prefix = `CognitoIdentityServiceProvider.${clientId}`;

      // Set tokens
      localStorage.setItem(`${prefix}.LastAuthUser`, cognitoUsername);
      const userKeys = new Set([cognitoUsername, sub, email].filter(Boolean));
      for (const key of userKeys) {
        localStorage.setItem(`${prefix}.${key}.idToken`, tokens.idToken);
        localStorage.setItem(`${prefix}.${key}.accessToken`, tokens.accessToken);
        localStorage.setItem(`${prefix}.${key}.refreshToken`, tokens.refreshToken);
        localStorage.setItem(`${prefix}.${key}.clockDrift`, '0');
      }

      // Clear stale OAuth flags
      localStorage.removeItem(`${prefix}.inflightOAuth`);

      // Intercept localStorage.getItem to trace what Amplify reads
      const origGetItem = localStorage.getItem.bind(localStorage);
      const origRemoveItem = localStorage.removeItem.bind(localStorage);
      (window as any).__lsTrace = [] as string[];

      localStorage.getItem = function (key: string) {
        const val = origGetItem(key);
        if (key.includes('Cognito') || key.includes('amplify')) {
          const trace = `getItem(${key}) => ${val === null ? 'null' : val.substring(0, 40) + (val.length > 40 ? '...' : '')}`;
          (window as any).__lsTrace.push(trace);
        }
        return val;
      };

      localStorage.removeItem = function (key: string) {
        if (key.includes('Cognito') || key.includes('amplify')) {
          (window as any).__lsTrace.push(`removeItem(${key})`);
        }
        return origRemoveItem(key);
      };

      // Intercept fetch to see if Amplify makes network calls (e.g., token refresh)
      const origFetch = window.fetch.bind(window);
      (window as any).__fetchTrace = [] as string[];
      window.fetch = async function (...args: any[]) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url ?? 'unknown';
        (window as any).__fetchTrace.push(`fetch: ${url}`);
        try {
          const resp = await origFetch(...args);
          (window as any).__fetchTrace.push(`  => ${resp.status} ${resp.statusText}`);
          return resp;
        } catch (err: any) {
          (window as any).__fetchTrace.push(`  => ERROR: ${err.message}`);
          throw err;
        }
      } as typeof window.fetch;
    },
    { clientId, cognitoUsername, sub, email: username, tokens },
  );

  // Capture ALL browser console messages for debugging
  page.on('console', (msg) => {
    console.log(`[page ${msg.type()}] ${msg.text()}`);
  });

  // Capture uncaught page errors
  page.on('pageerror', (err) => {
    console.log(`[page error] ${err.message}`);
  });

  // Navigate to the app
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  // Dump all traces
  const lsTrace = await page.evaluate(() => (window as any).__lsTrace ?? []);
  console.log(`[browser] localStorage trace (${lsTrace.length} calls):`);
  for (const entry of lsTrace) {
    console.log(`  ${entry}`);
  }

  const fetchTrace = await page.evaluate(() => (window as any).__fetchTrace ?? []);
  if (fetchTrace.length > 0) {
    console.log(`[browser] fetch trace:`);
    for (const entry of fetchTrace) {
      console.log(`  ${entry}`);
    }
  }

  // Check page content
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 300));
  console.log('[browser] Page text:', bodyText);
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
}
