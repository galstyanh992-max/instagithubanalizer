import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";

export type TgTrack = {
  id: string;
  title: string;
  duration: number | null;
  url: string;
};

let _client: TelegramClient | null = null;

export function tgMusicConfig() {
  return {
    apiId: Number(process.env.TG_API_ID) || 0,
    apiHash: process.env.TG_API_HASH || "",
    session: process.env.TG_SESSION || "",
    channel: (process.env.TELEGRAM_MUSIC_CHANNEL || "@carMuzzicH").trim(),
  };
}

export function isTgUserReady() {
  const c = tgMusicConfig();
  return Boolean(c.apiId && c.apiHash && c.session);
}

export async function getTgClient(): Promise<TelegramClient | null> {
  if (_client) return _client;
  const { apiId, apiHash, session } = tgMusicConfig();
  if (!apiId || !apiHash || !session) return null;
  const client = new TelegramClient(new StringSession(session), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  if (!(await client.checkAuthorization())) {
    await client.disconnect();
    throw new Error("Telegram user session is not authorized. Run: node scripts/tg-music-login.mjs");
  }
  _client = client;
  return client;
}

function isAudioDocument(doc: any): boolean {
  const mime: string = doc?.mimeType || "";
  if (!/^audio\//i.test(mime) && !/application\/ogg/i.test(mime)) return false;
  let isVoice = false;
  for (const a of doc?.attributes || []) {
    if (a && a.className === "DocumentAttributeAudio" && a.audio) isVoice = true;
  }
  return !isVoice;
}

function trackTitleFrom(doc: any, caption?: string): string {
  let performer = "";
  let title = "";
  let fileName = "";
  for (const a of doc?.attributes || []) {
    if (!a) continue;
    if (a.className === "DocumentAttributeAudio") {
      performer = a.performer || "";
      title = a.title || "";
    }
    if (a.className === "DocumentAttributeFilename") fileName = a.fileName || "";
  }
  const composed = [performer, title].filter(Boolean).join(" — ");
  if (composed) return composed;
  return (fileName || caption || "Telegram audio").toString();
}

export async function getChannelTracks(limit = 100): Promise<TgTrack[] | null> {
  const client = await getTgClient();
  if (!client) return null;
  const { channel } = tgMusicConfig();
  const entity = await client.getEntity(channel);
  let messages: any[];
  try {
    messages = await client.getMessages(entity, { limit, filter: new Api.InputMessagesFilterMusic() });
  } catch {
    messages = await client.getMessages(entity, { limit });
  }
  const tracks: TgTrack[] = [];
  for (const m of messages as any[]) {
    const doc = m?.media?.document;
    if (!doc || !isAudioDocument(doc)) continue;
    let duration: number | null = null;
    for (const a of doc.attributes || []) {
      if (a?.className === "DocumentAttributeAudio" && typeof a.duration === "number") duration = a.duration;
    }
    tracks.push({
      id: String(m.id),
      title: trackTitleFrom(doc, m.message).slice(0, 180),
      duration,
      url: `/api/telegram/music/audio?messageId=${encodeURIComponent(String(m.id))}`,
    });
  }
  return tracks;
}

export async function getAudioMessage(messageId: number) {
  const client = await getTgClient();
  if (!client) return null;
  const { channel } = tgMusicConfig();
  const entity = await client.getEntity(channel);
  const messages = await client.getMessages(entity, { ids: [messageId], limit: 1 });
  const msg = (messages as any[])[0];
  if (!msg || !msg.media || !msg.media.document || !isAudioDocument(msg.media.document)) return null;
  return msg;
}

export function audioMime(doc: any): string {
  return doc?.mimeType || "audio/mpeg";
}
