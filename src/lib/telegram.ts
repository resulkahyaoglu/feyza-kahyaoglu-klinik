const SKIP_KINDS = new Set<string>();

type TelegramApi = {
  ok: boolean;
  description?: string;
  result?: unknown;
};

export function cleanTelegramToken(raw: string): string {
  const text = String(raw || "").trim();
  const fromUrl = text.match(/api\.telegram\.org\/bot([0-9]+:[A-Za-z0-9_-]+)/i);
  if (fromUrl?.[1]) return fromUrl[1];
  const stripped = text
    .replace(/^bot/i, "")
    .replace(/\s+/g, "")
    .replace(/^["']|["']$/g, "");
  const m = stripped.match(/[0-9]{6,}:[A-Za-z0-9_-]{20,}/);
  return m?.[0] || stripped;
}

function friendlyTelegramError(description?: string) {
  const d = (description || "").toLowerCase();
  if (d.includes("not found")) {
    return "Token bulunamadı. BotFather’daki uzun kodun tamamını, boşluksuz yapıştırın. Sadece @bot adı değil.";
  }
  if (d.includes("unauthorized")) {
    return "Token yanlış. BotFather’da /token yazıp yeni kodu kopyalayın.";
  }
  return description || "Bot doğrulanamadı. Tokeni kontrol edin.";
}

async function callTelegram(token: string, method: string, body?: Record<string, unknown>) {
  const clean = cleanTelegramToken(token);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${clean}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: ctrl.signal,
    });
    return (await res.json()) as TelegramApi;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return { ok: false, description: "Telegram yanıt vermedi. Biraz sonra tekrar deneyin." };
    }
    return { ok: false, description: "Telegram’a ulaşılamadı. İnterneti kontrol edin." };
  } finally {
    clearTimeout(t);
  }
}

export async function telegramGetMe(token: string) {
  const clean = cleanTelegramToken(token);
  if (!/^[0-9]{6,}:[A-Za-z0-9_-]{20,}$/.test(clean)) {
    throw new Error(
      "Bu bir bot tokeni değil. BotFather’ın verdiği 123456:AAH... şeklindeki uzun kodu yapıştırın.",
    );
  }
  const json = await callTelegram(clean, "getMe");
  if (!json.ok || !json.result || typeof json.result !== "object") {
    throw new Error(friendlyTelegramError(json.description));
  }
  const r = json.result as { username?: string; first_name?: string };
  if (!r.username) throw new Error("Bot kullanıcı adı alınamadı.");
  return { username: r.username, name: r.first_name || r.username };
}

export async function telegramSend(token: string, chatId: string, text: string) {
  const json = await callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
  });
  if (!json.ok) throw new Error(json.description || "Mesaj gönderilemedi.");
}

type Update = {
  message?: {
    text?: string;
    chat?: { id?: number };
    from?: { first_name?: string; username?: string };
  };
};

export async function telegramFindCode(token: string, code: string) {
  await callTelegram(token, "deleteWebhook", { drop_pending_updates: false });
  const json = await callTelegram(token, "getUpdates", { limit: 50, timeout: 0 });
  if (!json.ok || !Array.isArray(json.result)) return null;
  const needle = code.trim();
  const updates = json.result as Update[];
  for (let i = updates.length - 1; i >= 0; i--) {
    const msg = updates[i]?.message;
    const text = String(msg?.text || "");
    if (!text.includes(needle)) continue;
    const chatId = msg?.chat?.id;
    if (chatId == null) continue;
    const name = msg?.from?.first_name || msg?.from?.username || "Telegram";
    return { chatId: String(chatId), name };
  }
  return null;
}

export function shouldRelayKind(_kind: string) {
  return true;
}

export function formatTelegramNotice(title: string, body?: string | null) {
  return ["Klinik bildirimi", title, body].filter(Boolean).join("\n");
}

export function maskToken(token: string) {
  if (token.length < 10) return "••••";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}

export function makePairCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
