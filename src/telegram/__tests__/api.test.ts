import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChatInviteLink, banChatMember, unbanChatMember } from '../api.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createChatInviteLink', () => {
  it('returns invite link on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { invite_link: 'https://t.me/+abc123' } }),
    });

    const link = await createChatInviteLink('bot-token', -1001234567890);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('createChatInviteLink'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chat_id: -1001234567890, member_limit: 1 }),
      }),
    );
    expect(link).toBe('https://t.me/+abc123');
  });

  it('returns null on HTTP failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    const link = await createChatInviteLink('bot-token', -1001234567890);
    expect(link).toBeNull();
  });

  it('returns null if result has no invite_link', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false }),
    });

    const link = await createChatInviteLink('bot-token', -1001234567890);
    expect(link).toBeNull();
  });
});

describe('banChatMember', () => {
  it('returns true on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await banChatMember('bot-token', -1001234567890, 42);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('banChatMember'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chat_id: -1001234567890, user_id: 42 }),
      }),
    );
    expect(result).toBe(true);
  });

  it('returns false on HTTP failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    const result = await banChatMember('bot-token', -1001234567890, 42);
    expect(result).toBe(false);
  });

  it('returns false if Telegram returns ok: false', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false }),
    });

    const result = await banChatMember('bot-token', -1001234567890, 42);
    expect(result).toBe(false);
  });
});

describe('unbanChatMember', () => {
  it('returns true on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await unbanChatMember('bot-token', -1001234567890, 42);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('unbanChatMember'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chat_id: -1001234567890, user_id: 42, only_if_banned: true }),
      }),
    );
    expect(result).toBe(true);
  });

  it('returns false on HTTP failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    const result = await unbanChatMember('bot-token', -1001234567890, 42);
    expect(result).toBe(false);
  });
});
