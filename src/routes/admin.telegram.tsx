import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import {
  confirmTelegramLink,
  loadTelegramSettings,
  saveTelegramToken,
  sendTelegramTest,
  startTelegramLink,
  unlinkTelegram,
} from "@/lib/actions";

export const Route = createFileRoute("/admin/telegram")({
  loader: async () => {
    const data = await loadTelegramSettings();
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: TelegramPage,
});

function TelegramPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<Record<1 | 2, string>>({
    1: data.auth ? data.pendingCode : "",
    2: data.auth && data.admin2 ? data.admin2.pendingCode : "",
  });
  const [botUser, setBotUser] = useState(data.auth ? data.botUsername : "");
  if (!data.auth) return null;

  return (
    <AdminShell title="Telegram bildirimleri">
      {data.hasToken && !data.linked ? (
        <p className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Token kayıtlı ama telefonunuz henüz bağlı değil. Aşağıdan kod alıp botu başlatmadan
          Telegram’a bildirim düşmez.
        </p>
      ) : null}

      {data.role === "admin" ? (
        <section className="surface mt-6 max-w-xl space-y-3 p-5">
          <h2 className="text-lg">1. Bot oluştur</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
            <li>Telefonda Telegram’ı açın, arama kısmına <strong>@BotFather</strong> yazın.</li>
            <li>
              <strong>/newbot</strong> yazın. İsim: <em>Feyza Klinik</em>. Kullanıcı adı örn.{" "}
              <em>feyzaklinik_bot</em> (sonu bot olmalı).
            </li>
            <li>BotFather’ın verdiği uzun tokeni kopyalayıp aşağı yapıştırın.</li>
          </ol>
          {data.hasToken ? (
            <p className="text-sm text-brand-dark">
              Kayıtlı bot: @{data.botUsername || "—"} · {data.maskedToken}
            </p>
          ) : (
            <p className="text-sm text-muted">Henüz bot yok.</p>
          )}
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!token.trim()) {
                toast.error("Tokeni yapıştırın.");
                return;
              }
              setBusy(true);
              try {
                const res = await saveTelegramToken({ data: { token } });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`Bot kaydedildi: @${res.username}`);
                setToken("");
                setBotUser(res.username);
                await router.invalidate();
              } catch {
                toast.error("Kaydedilemedi.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="field">
              <label htmlFor="tg-token">Bot token</label>
              <input
                id="tg-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="7123456789:AAHxxxxxxxx"
                autoComplete="off"
              />
              <p className="text-xs text-muted">
                Sadece uzun kod. @bot adı veya HTTPS linki değil. Örnek: 7123456789:AAH...
              </p>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Tokeni kaydet
            </button>
          </form>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Botu yalnızca yönetici kaydeder. Siz aşağıdaki adımdan kendi Telegram’ınızı bağlarsınız.
        </p>
      )}

      <section className="mt-6 max-w-xl space-y-4">
        <h2 className="text-lg">2. Telefonunuzu bağlayın</h2>
        <TelegramSlot
          title={data.role === "admin" ? "Yönetici telefon 1" : "Asistan telefonu"}
          slot={1}
          linked={data.linked}
          telegramName={data.telegramName}
          code={codes[1]}
          botUser={botUser}
          busy={busy}
          canStart={data.role === "admin" || data.hasToken}
          onCode={(c, user) => {
            setCodes((s) => ({ ...s, 1: c }));
            if (user) setBotUser(user);
          }}
          setBusy={setBusy}
          onChanged={() => router.invalidate()}
        />
        {data.role === "admin" ? (
          <TelegramSlot
            title="Yönetici telefon 2"
            slot={2}
            linked={data.admin2.linked}
            telegramName={data.admin2.telegramName}
            code={codes[2]}
            botUser={botUser}
            busy={busy}
            canStart
            onCode={(c, user) => {
              setCodes((s) => ({ ...s, 2: c }));
              if (user) setBotUser(user);
            }}
            setBusy={setBusy}
            onChanged={() => router.invalidate()}
          />
        ) : null}
      </section>
    </AdminShell>
  );
}

function TelegramSlot({
  title,
  slot,
  linked,
  telegramName,
  code,
  botUser,
  busy,
  canStart,
  onCode,
  setBusy,
  onChanged,
}: {
  title: string;
  slot: 1 | 2;
  linked: boolean;
  telegramName: string;
  code: string;
  botUser: string;
  busy: boolean;
  canStart: boolean;
  onCode: (code: string, username?: string) => void;
  setBusy: (v: boolean) => void;
  onChanged: () => Promise<unknown> | void;
}) {
  const openHref = botUser && code ? `https://t.me/${botUser}?start=${code}` : "";
  return (
    <article className="surface space-y-3 p-5">
      <h3 className="font-medium">{title}</h3>
      {linked ? (
        <>
          <p className="text-sm text-brand-dark">Bağlı: {telegramName || "Telegram hesabı"}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await sendTelegramTest({ data: { slot } });
                  if (!res.ok) toast.error(res.error);
                  else toast.success("Test mesajı gönderildi.");
                } catch {
                  toast.error("Gönderilemedi.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Test mesajı
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await unlinkTelegram({ data: { slot } });
                  onCode("");
                  toast.success("Bağlantı koparıldı.");
                  await onChanged();
                } catch {
                  toast.error("Koparılamadı.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Bağlantıyı kes
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            Kod alın, o telefonda Telegram’da bota yazın, sonra tamamlayın.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || !canStart}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await startTelegramLink({ data: { slot } });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                onCode(res.code, res.username);
                toast.success(`Kodunuz: ${res.code}`);
                await onChanged();
              } catch {
                toast.error("Kod alınamadı.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Kod al
          </button>
          {code ? (
            <div className="rounded-xl bg-brand-mist px-4 py-3 text-sm text-brand-dark">
              <p>
                Kod: <span className="font-display text-2xl tracking-wide">{code}</span>
              </p>
              <p className="mt-2">
                Telegram’da @{botUser || "bot"} sohbetine girin, <strong>Başlat</strong>’a basın,
                kodu yazın.
              </p>
              {openHref ? (
                <a className="btn btn-primary mt-3 inline-flex" href={openHref} target="_blank" rel="noreferrer">
                  Telegram’da aç
                </a>
              ) : null}
              <button
                type="button"
                className="btn btn-primary mt-3 ml-2"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await confirmTelegramLink({ data: { slot } });
                    if (!res.ok) {
                      toast.error(res.error);
                      return;
                    }
                    toast.success(`Bağlandı: ${res.name}`);
                    await onChanged();
                  } catch {
                    toast.error("Doğrulanamadı.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Bağlantıyı tamamla
              </button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
