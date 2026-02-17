function telegramUrl(botToken: string, method: string): string {
  const testPrefix = process.env.TELEGRAM_TEST_MODE === 'true' ? '/test' : '';
  return `https://api.telegram.org/bot${botToken}${testPrefix}/${method}`;
}

export async function sendMessage(botToken: string, chatId: number, text: string): Promise<void> {
  const url = telegramUrl(botToken, 'sendMessage');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Telegram sendMessage failed: ${response.status} ${body}`);
  }
}

export async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string,
): Promise<boolean> {
  const url = telegramUrl(botToken, 'setWebhook');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ['message', 'my_chat_member'],
    }),
  });

  const result = await response.json() as { ok: boolean };
  return result.ok;
}
