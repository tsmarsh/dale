import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, setWebhook } from '../api.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendMessage', () => {
  it('calls Telegram API with correct params', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await sendMessage('123:ABC', 456, 'Hello!');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123:ABC/sendMessage',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: 456,
          text: 'Hello!',
          parse_mode: 'Markdown',
        }),
      },
    );
  });

  it('logs error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockResolvedValue({ ok: false, status: 400, text: async () => 'Bad request' });

    await sendMessage('123:ABC', 456, 'Hello!');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('setWebhook', () => {
  it('calls setWebhook API and returns true on success', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ ok: true }),
    });

    const result = await setWebhook('123:ABC', 'https://example.com/webhook', 'secret-123');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123:ABC/setWebhook',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('secret-123'),
      }),
    );
  });

  it('returns false on failure', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ ok: false }),
    });

    const result = await setWebhook('123:ABC', 'https://example.com/webhook', 'secret-123');
    expect(result).toBe(false);
  });
});
