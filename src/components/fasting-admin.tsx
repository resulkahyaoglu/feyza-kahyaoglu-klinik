import { useMemo, useState } from "react";
import { toast } from "sonner";
import { pauseFasting, saveFastingPlan } from "@/lib/actions";
import { formatDateTr, formatDateTimeTr, todayISO } from "@/lib/clinic";
import {
  FASTING_DAYS,
  FASTING_PAUSE_REASONS,
  FASTING_PRESETS,
  breakLabel,
  buildFastingView,
  computeFastingStats,
  endReasonLabel,
  isFastingPaused,
  parseDays,
  pauseLabel,
  type FastingLog,
  type FastingPlan,
  type FastingProtocol,
} from "@/lib/fasting";

export function FastingAdmin({
  userId,
  plan,
  logs = [],
  onSaved,
}: {
  userId: number;
  plan: FastingPlan | null;
  logs?: FastingLog[];
  onSaved: () => void;
}) {
  const initial = plan ?? {
    user_id: userId,
    enabled: 0,
    protocol: "kapali" as FastingProtocol,
    window_start: "12:00",
    window_end: "20:00",
    days: "1,2,3,4,5,6,7",
    notes: null,
  };
  const [protocol, setProtocol] = useState<FastingProtocol>(initial.protocol);
  const [start, setStart] = useState(initial.window_start);
  const [end, setEnd] = useState(initial.window_end);
  const [days, setDays] = useState<number[]>(parseDays(initial.days));
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () =>
      buildFastingView({
        enabled: protocol === "kapali" ? 0 : 1,
        protocol,
        window_start: start,
        window_end: end,
        days: days.join(","),
      }),
    [protocol, start, end, days],
  );
  const stats = useMemo(
    () => computeFastingStats(plan ?? initial, logs, todayISO()),
    [plan, logs],
  );

  return (
    <section className="surface p-5">
      <h2 className="text-lg">Aralıklı oruç</h2>
      <p className="mt-1 text-sm text-muted">
        Kapalıyken danışan panelinde görünmez. Bir protokol kaydedince yalnızca o danışanda açılır.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (protocol !== "kapali" && days.length === 0) {
            toast.error("En az bir gün seçin.");
            return;
          }
          setBusy(true);
          try {
            const res = await saveFastingPlan({
              data: {
                userId,
                protocol,
                windowStart: start,
                windowEnd: end,
                days,
                enabled: protocol !== "kapali",
              },
            });
            if (!res.ok) {
              toast.error(res.error ?? "Kaydedilemedi.");
              return;
            }
            toast.success(
              protocol === "kapali"
                ? "Aralıklı oruç kapatıldı. Danışanda görünmez."
                : "Protokol aktif. Danışan panelinde çember açıldı.",
            );
            onSaved();
          } catch {
            toast.error("Kaydedilemedi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="grid gap-2">
          {FASTING_PRESETS.map((p) => (
            <label
              key={p.key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-cream px-3 py-2.5"
            >
              <input
                type="radio"
                name="fasting-protocol"
                className="mt-1"
                checked={protocol === p.key}
                onChange={() => {
                  setProtocol(p.key);
                  if (p.key !== "ozel") {
                    setStart(p.start);
                    setEnd(p.end);
                  }
                }}
              />
              <span>
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-muted">{p.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {protocol === "ozel" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label htmlFor="fast-start">Pencere başlangıç</label>
              <input
                id="fast-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="fast-end">Pencere bitiş</label>
              <input
                id="fast-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </div>
          </div>
        ) : null}

        {protocol !== "kapali" ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Hangi günler</p>
            <div className="flex flex-wrap gap-2">
              {FASTING_DAYS.map((d) => {
                const on = days.includes(d.n);
                return (
                  <button
                    key={d.n}
                    type="button"
                    className={on ? "chip chip-ok" : "chip chip-off"}
                    onClick={() =>
                      setDays((prev) =>
                        prev.includes(d.n) ? prev.filter((x) => x !== d.n) : [...prev, d.n].sort(),
                      )
                    }
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {protocol === "kapali" ? (
          <p className="text-sm text-muted">Danışan panelinde aralıklı oruç yok.</p>
        ) : preview ? (
          <p className="rounded-xl bg-brand-mist px-3 py-2 text-sm text-brand-dark">
            Danışan şimdi görecek: {preview.headline} · {preview.sub}
          </p>
        ) : (
          <p className="text-sm text-muted">Bugün seçili günlerden değil; danışanda bugün gizlenir.</p>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </form>

      {plan && Number(plan.enabled) && protocol !== "kapali" ? (
        <div className="mt-5 space-y-3 border-t border-line pt-4">
          <h3 className="text-sm font-medium">Uyum</h3>
          <p className="text-sm text-ink-soft">
            Son 30 gün: <strong>%{stats.rate30}</strong> ({stats.kept30}/{stats.scheduled30} gün) · seri{" "}
            {stats.streak} gün
          </p>
          <p className="text-xs text-muted">Kritik saatler — danışanın orucu bozduğu saatler (İstanbul).</p>
          <div className="flex h-16 items-end gap-px">
            {stats.heatmap.map((n, h) => {
              const max = Math.max(1, ...stats.heatmap);
              return (
                <div
                  key={h}
                  className="flex-1 rounded-t bg-brand"
                  style={{ height: `${Math.max(6, (n / max) * 100)}%`, opacity: n ? 1 : 0.18 }}
                  title={`${String(h).padStart(2, "0")}:00 · ${n} kez`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => {
              const lines = [
                `Aralıklı oruç özeti`,
                `Uyum 30 gün: %${stats.rate30} (${stats.kept30}/${stats.scheduled30})`,
                `Seri: ${stats.streak} gün`,
                "",
                "Kayıtlar:",
                ...logs.map((row) =>
                  [
                    formatDateTr(row.log_date),
                    row.kind === "broke" ? breakLabel(row.reason) : "pencere açıldı",
                    row.detail,
                    row.energy ? `enerji ${row.energy}/5` : null,
                    row.dizzy === 1 ? "baş dönmesi" : null,
                    row.end_reason ? endReasonLabel(row.end_reason) : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ),
              ];
              const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "aralikli-oruc-ozet.txt";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Aylık özeti indir
          </button>
        </div>
      ) : null}

      {plan && Number(plan.enabled) && protocol !== "kapali" ? (
        <form
          className="mt-5 space-y-3 border-t border-line pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const reason = String(fd.get("pauseReason") || "regl") as "ramazan" | "regl" | "diger";
            const until = String(fd.get("pauseUntil") || "");
            if (!until) {
              toast.error("Bitiş tarihi seçin.");
              return;
            }
            setBusy(true);
            try {
              const res = await pauseFasting({ data: { userId, reason, until } });
              if (!res.ok) {
                toast.error("error" in res ? res.error : "Duraklatılamadı.");
                return;
              }
              toast.success("Duraklatıldı.");
              onSaved();
            } catch {
              toast.error("Duraklatılamadı.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3 className="text-sm font-medium">Ramazan / regl duraklat</h3>
          {isFastingPaused(plan) ? (
            <p className="text-sm text-brand-dark">
              Duraklatıldı: {pauseLabel(plan.pause_reason)} · {formatDateTr(plan.pause_until || "")} tarihine kadar.
            </p>
          ) : (
            <p className="text-sm text-muted">Bu sürede danışanda çember durur, protokol silinmez.</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="pauseReason">Neden</label>
              <select id="pauseReason" name="pauseReason" defaultValue="regl">
                {FASTING_PAUSE_REASONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pauseUntil">Yeniden başlama tarihi</label>
              <input id="pauseUntil" name="pauseUntil" type="date" defaultValue={todayISO()} required />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary" type="submit" disabled={busy}>
              Duraklat
            </button>
            {isFastingPaused(plan) ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await pauseFasting({ data: { userId, reason: null, until: null } });
                    toast.success("Duraklatma kalktı.");
                    onSaved();
                  } catch {
                    toast.error("Kaldırılamadı.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Duraklatmayı bitir
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {logs.length > 0 ? (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-sm font-medium">Danışan kayıtları</h3>
          <ul className="mt-2 space-y-2">
            {logs.map((row) => (
              <li key={row.id} className="text-sm text-ink-soft">
                <span className="font-medium">
                  {row.kind === "broke" ? breakLabel(row.reason) : "Pencereyi açtı"}
                </span>
                <span className="text-muted">
                  {" "}
                  · {formatDateTr(row.log_date)} {formatDateTimeTr(row.created_at).split(" ").slice(-1)[0]}
                </span>
                {row.detail ? <p className="mt-0.5 text-ink-soft">Tüketilen: {row.detail}</p> : null}
                {row.energy || row.dizzy === 1 || row.end_reason ? (
                  <p className="mt-0.5 text-xs text-muted">
                    {[
                      row.energy ? `enerji ${row.energy}/5` : null,
                      row.dizzy === 1 ? "baş dönmesi/bulantı" : null,
                      row.end_reason ? endReasonLabel(row.end_reason) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : plan && Number(plan.enabled) ? (
        <p className="mt-4 text-sm text-muted">Danışan henüz oruç kaydı girmedi.</p>
      ) : null}
    </section>
  );
}
