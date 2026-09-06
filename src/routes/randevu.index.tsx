import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicShell } from "@/components/site-chrome";
import { Scene, ServiceIcon } from "@/components/visuals";
import {
  SERVICES,
  TIME_SLOTS,
  todayISO,
} from "@/lib/clinic";
import { submitBooking } from "@/lib/actions";

type Search = { hizmet?: string };

export const Route = createFileRoute("/randevu/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    hizmet: typeof s.hizmet === "string" ? s.hizmet : undefined,
  }),
  component: BookingPage,
});

function BookingPage() {
  const { hizmet } = Route.useSearch();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const defaultService =
    SERVICES.some((s) => s.key === hizmet) ? hizmet : SERVICES[0]!.key;

  return (
    <PublicShell>
      <div className="page-wrap grid gap-10 py-14 md:grid-cols-[1fr_0.9fr] md:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Randevu talebi
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl">Tercih ettiğiniz günü yazın.</h1>
          <p className="mt-4 text-muted">
            Tercih ettiğiniz zamanı paylaşın; uygun günü sizinle netleştirelim.
          </p>
          <div className="mt-8 overflow-hidden rounded-[24px]">
            <Scene kind="hero" className="min-h-44" />
          </div>
          <ul className="mt-8 space-y-3 text-sm text-ink-soft">
            {SERVICES.map((s) => (
              <li key={s.key} className="flex gap-4 border-b border-line py-3">
                <span className="flex items-start gap-3">
                  <ServiceIcon serviceKey={s.key} />
                  <span>
                    {s.name}
                    <span className="block text-muted">{s.blurb}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <form
          className="surface p-6 md:p-8"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setPending(true);
            try {
              const res = await submitBooking({
                data: {
                  serviceKey: String(fd.get("serviceKey") || ""),
                  name: String(fd.get("name") || ""),
                  phone: String(fd.get("phone") || ""),
                  email: String(fd.get("email") || ""),
                  date: String(fd.get("date") || ""),
                  time: String(fd.get("time") || ""),
                  notes: String(fd.get("notes") || ""),
                },
              });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              await navigate({ to: "/randevu/basarili" });
            } catch {
              toast.error("Gönderilemedi. Tekrar deneyin.");
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="serviceKey">Hizmet</label>
            <select id="serviceKey" name="serviceKey" defaultValue={defaultService} required>
              {SERVICES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 field">
            <label htmlFor="name">Ad soyad</label>
            <input id="name" name="name" required autoComplete="name" placeholder="Adınız soyadınız" />
          </div>
          <div className="mt-4 field">
            <label htmlFor="phone">Telefon</label>
            <input
              id="phone"
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="05XX XXX XX XX"
            />
          </div>
          <div className="mt-4 field">
            <label htmlFor="email">E-posta (isteğe bağlı)</label>
            <input id="email" name="email" type="email" autoComplete="email" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="date">Tercih edilen tarih</label>
              <input id="date" name="date" type="date" required min={todayISO()} />
            </div>
            <div className="field">
              <label htmlFor="time">Tercih edilen saat</label>
              <select id="time" name="time" required defaultValue="10:00">
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 field">
            <label htmlFor="notes">Not</label>
            <textarea id="notes" name="notes" placeholder="Kısaca belirtmek istediğiniz bir şey varsa yazın." />
          </div>
          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={pending}>
            {pending ? "Gönderiliyor…" : "Talebi gönder"}
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Bu bir rezervasyon değildir. Sizinle iletişime geçerek netleştiririz.
          </p>
        </form>
      </div>
    </PublicShell>
  );
}
