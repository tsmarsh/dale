import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import bigInt, { BigInteger } from 'big-integer';
import { E2EConfig } from '../env.js';

export async function createTelegramClient(config: E2EConfig): Promise<TelegramClient> {
  const session = new StringSession(config.telegramTestSession ?? '');
  const client = new TelegramClient(session, config.telegramApiId!, config.telegramApiHash!, {
    connectionRetries: 3,
    useWSS: true,
    testServers: true,
  });

  await client.connect();
  return client;
}

export async function createGroup(
  client: TelegramClient,
  title: string,
  botUsername: string,
): Promise<{ chatId: BigInteger }> {
  const result = await client.invoke(
    new Api.channels.CreateChannel({
      title,
      about: 'E2E test group',
      megagroup: true,
    }),
  );

  const updates = result as Api.Updates;
  const channel = updates.chats[0] as Api.Channel;
  const chatId = channel.id;

  // Resolve the bot and invite it
  const resolved = await client.invoke(
    new Api.contacts.ResolveUsername({ username: botUsername }),
  );
  const botUser = resolved.users[0] as Api.User;

  await client.invoke(
    new Api.channels.InviteToChannel({
      channel: new Api.InputChannel({
        channelId: chatId,
        accessHash: channel.accessHash ?? bigInt.zero,
      }),
      users: [
        new Api.InputUser({
          userId: botUser.id,
          accessHash: botUser.accessHash ?? bigInt.zero,
        }),
      ],
    }),
  );

  return { chatId };
}

function superGroupPeerId(chatId: BigInteger): BigInteger {
  return bigInt(`-100${chatId.toString()}`);
}

export async function sendMessageAsUser(
  client: TelegramClient,
  chatId: BigInteger,
  text: string,
): Promise<void> {
  const peerId = superGroupPeerId(chatId);
  await client.sendMessage(peerId, { message: text });
}

export async function sendDmToBot(
  client: TelegramClient,
  botUsername: string,
  text: string,
): Promise<void> {
  await client.sendMessage(botUsername, { message: text });
}

export async function waitForBotReply(
  client: TelegramClient,
  chatId: BigInteger,
  botUsername: string,
  timeoutMs: number,
): Promise<string | null> {
  const peerId = superGroupPeerId(chatId);
  const deadline = Date.now() + timeoutMs;
  const seenIds = new Set<number>();

  // Capture initial message IDs to ignore
  try {
    const initial = await client.getMessages(peerId, { limit: 5 });
    for (const msg of initial) {
      seenIds.add(msg.id);
    }
  } catch {
    // Group may be new with no messages
  }

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));

    const messages = await client.getMessages(peerId, { limit: 5 });
    for (const msg of messages) {
      if (seenIds.has(msg.id)) continue;
      seenIds.add(msg.id);

      const sender = msg.sender;
      if (sender && 'username' in sender && sender.username === botUsername) {
        return msg.text ?? null;
      }
    }
  }

  return null;
}

export async function waitForDmReply(
  client: TelegramClient,
  botUsername: string,
  timeoutMs: number,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const seenIds = new Set<number>();

  // Capture initial message IDs to ignore
  try {
    const initial = await client.getMessages(botUsername, { limit: 5 });
    for (const msg of initial) {
      seenIds.add(msg.id);
    }
  } catch {
    // No prior DMs
  }

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1000));

    const messages = await client.getMessages(botUsername, { limit: 5 });
    for (const msg of messages) {
      if (seenIds.has(msg.id)) continue;
      seenIds.add(msg.id);

      const sender = msg.sender;
      if (sender && 'username' in sender && sender.username === botUsername) {
        return msg.text ?? null;
      }
    }
  }

  return null;
}

export async function deleteGroup(client: TelegramClient, chatId: BigInteger): Promise<void> {
  try {
    const peerId = superGroupPeerId(chatId);
    const entity = await client.getEntity(peerId);

    if (entity instanceof Api.Channel) {
      await client.invoke(
        new Api.channels.DeleteChannel({
          channel: new Api.InputChannel({
            channelId: entity.id,
            accessHash: entity.accessHash ?? bigInt.zero,
          }),
        }),
      );
    }
  } catch (err) {
    console.warn(`Failed to delete test group ${chatId}:`, err);
  }
}
