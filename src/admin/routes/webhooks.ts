import { getTenantSecrets } from '../../shared/tenant-config.js';
import { setWebhook } from '../../telegram/api.js';
import type { AuthContext } from '../middleware/auth.js';

export async function handleRegisterWebhook(
  auth: AuthContext,
  telegramWebhookUrl: string,
): Promise<{ statusCode: number; body: string }> {
  const secrets = await getTenantSecrets(auth.tenantId);

  const registered = await setWebhook(
    secrets.telegramBotToken,
    telegramWebhookUrl,
    secrets.telegramWebhookSecret,
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ registered }),
  };
}
