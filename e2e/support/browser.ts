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

export function injectCognitoAuth(
  page: Page,
  clientId: string,
  username: string,
  tokens: CognitoTokens,
): Promise<void> {
  return page.addInitScript(
    ({ clientId, username, tokens }) => {
      const prefix = `CognitoIdentityServiceProvider.${clientId}`;
      localStorage.setItem(`${prefix}.LastAuthUser`, username);
      localStorage.setItem(`${prefix}.${username}.idToken`, tokens.idToken);
      localStorage.setItem(`${prefix}.${username}.accessToken`, tokens.accessToken);
      localStorage.setItem(`${prefix}.${username}.refreshToken`, tokens.refreshToken);
    },
    { clientId, username, tokens },
  );
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const path = resolve(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
}
