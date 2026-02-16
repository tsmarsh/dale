import { getConfig } from '../shared/config.js';

export async function sendMessage(chatId: number, text: string): Promise<void> {
  const config = await getConfig();
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

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
