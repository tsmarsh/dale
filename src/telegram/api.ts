export async function sendMessage(botToken: string, chatId: number, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

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
  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;

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
