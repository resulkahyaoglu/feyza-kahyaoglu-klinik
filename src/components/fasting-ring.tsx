import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { clientLogFasting } from "@/lib/actions";
import { formatDateTr, nowTimeIstanbul, todayISO } from "@/lib/clinic";
import {
  FASTING_BREAK_OPTIONS,
  FASTING_END_REASONS,
  FASTING_PHASES,
  breakLabel,
  buildFastingView,
  computeFastingStats,
  isFastingEnabled,
  isFastingPaused,
  pauseLabel,
  searchFastingGuide,
  type FastingLog,
  type FastingPlan,
} from "@/lib/fasting";

export function FastingRing({
  plan,
  todayLog,
  logs = [],
  onChanged,
}: {
  plan: FastingPlan;
  todayLog: FastingLog | null;
  logs?: FastingLog[];
  onChanged?: () => void;
}) {
  const [now, setNow] = useState(nowTimeIstanbul);
  const [busy, setBusy] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [energy, setEnergy] = useState(3);
  const [dizzy, setDizzy] = useState(false);
  const [endReason, setEndReason] = useState("");
  const [guideQ, setGuideQ] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => setNow(nowTimeIstanbul()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const view = isFastingEnabled(plan) ? buildFastingView(plan, now, undefined, todayLog) : null;
  const stats = useMemo(() => computeFastingStats(plan, logs, todayISO()), [plan, logs]);
  if (isFastingEnabled(plan) && isFastingPaused(plan)) {
    return (
      <article className="surface mb-4 p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Aralıklı oruç</p>
        <p className="mt-1 font-display text-2xl">Bugün duraklatıldı</p>
        <p className="mt-1 text-sm text-ink-soft">
          {pauseLabel(plan.pause_reason)}
          {plan.pause_until ? ` · ${formatDateTr(plan.pause_until)} tarihine kadar` : ""}.
          Protokol duruyor, bu tarih geçince çember yeniden açılır.
        </p>
      </article>
    );
  }
  if (!view) return null;

  const size = 220;
  const r = 84;
  const c = 2 * Math.PI * r;
  const dash = Math.max(8, c * view.remainingRatio);
  const eating = view.inWindow;
  const broke = todayLog?.kind === "broke";
  const opened = todayLog?.kind === "opened";
  const closingSoon = eating && !broke && view.minutesUntilClose > 0 && view.minutesUntilClose <= 30;
  const hoursFast = view.minutesFasting / 60;
  const guide = searchFastingGuide(guideQ);

  async function log(kind: "broke" | "opened" | "undo", reason?: string, note?: string) {
    setBusy(kind + (reason ?? ""));
    try {
      await clientLogFasting({
        data: {
          kind,
          reason,
          detail: note,
          energy: kind === "undo" ? undefined : energy,
          dizzy: kind === "undo" ? undefined : dizzy,
          endReason: kind === "undo" ? undefined : endReason || undefined,
        },
      });
      toast.success(
        kind === "undo"
          ? "Bugünkü kayıt geri alındı."
          : kind === "broke"
            ? "Kaydedildi. Yarın kaldığınız yerden devam."
            : "Pencere açıldı, afiyet olsun.",
      );
      setChoice(null);
      setDetail("");
      setEndReason("");
      onChanged?.();
    } catch {
      toast.error("Kaydedilemedi.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="surface mb-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Aralıklı oruç</p>
        {stats.streak > 0 ? (
          <p className="text-xs font-medium text-brand-dark">{stats.streak} gün seri · uyum %{stats.rate30}</p>
        ) : null}
      </div>
      {closingSoon ? (
        <p className="mt-3 rounded-xl bg-brand-mist px-3 py-2 text-sm text-brand-dark">
          Pencereniz kapanmak üzere. Son suyunuzu içmeyi unutmayın.
        </p>
      ) : null}
      <div className="mt-3 flex flex-col items-center sm:flex-row sm:items-center sm:gap-8">
        <div className="relative grid place-items-center">
          <svg width={size} height={size} viewBox="0 0 220 220" aria-hidden>
            <circle cx="110" cy="110" r={r} fill="none" stroke="var(--color-sand-deep)" strokeWidth="14" />
            <circle
              cx="110"
              cy="110"
              r={r}
              fill="none"
              stroke={broke ? "var(--color-warn)" : eating ? "var(--color-brand)" : "var(--color-brand-mid)"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
              transform="rotate(-90 110 110)"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="font-display text-3xl leading-none">
                {broke ? "—" : eating ? formatShort(view.minutesUntilClose) : formatShort(view.minutesUntilWindow)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {broke ? "erken açıldı" : eating ? "pencere kapanır" : "pencere açılır"}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 w-full max-w-sm sm:mt-0">
          <p className="font-display text-2xl">{view.headline}</p>
          <p className="mt-1 text-sm text-ink-soft">{view.sub}</p>
          {!broke && !eating ? <PhaseBar hours={hoursFast} /> : null}
          {view.phase && !broke ? (
            <p className="mt-3 text-sm text-ink-soft">{view.phase.body}</p>
          ) : !broke ? (
            <p className="mt-3 text-sm text-ink-soft">
              Pencere açıkken listenizdeki öğünleri yavaş alın. Fotoğraf için aşağıdaki plan dışı kaydı kullanın;
              sistem pencere içi/dışı etiketler.
            </p>
          ) : null}

          {todayLog ? (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip chip-wait">
                  {todayLog.kind === "broke" ? breakLabel(todayLog.reason) : "Pencere açıldı"}
                </span>
                <button type="button" className="btn btn-sm btn-secondary" disabled={!!busy} onClick={() => void log("undo")}>
                  Geri al
                </button>
              </div>
              {todayLog.detail ? <p className="text-sm text-ink-soft">Tüketilen: {todayLog.detail}</p> : null}
              {todayLog.energy ? <p className="text-sm text-ink-soft">Enerji {todayLog.energy}/5</p> : null}
            </div>
          ) : !eating ? (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted">Orucu bozarsanız seçin</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FASTING_BREAK_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={choice === opt.key ? "btn btn-sm btn-primary" : "btn btn-sm btn-secondary"}
                    disabled={!!busy}
                    onClick={() => {
                      setChoice(opt.key);
                      setDetail("");
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {choice ? (
                <DiaryFields
                  detail={detail}
                  setDetail={setDetail}
                  energy={energy}
                  setEnergy={setEnergy}
                  dizzy={dizzy}
                  setDizzy={setDizzy}
                  endReason={endReason}
                  setEndReason={setEndReason}
                  busy={!!busy}
                  onSave={() => void log("broke", choice, detail)}
                  onCancel={() => {
                    setChoice(null);
                    setDetail("");
                  }}
                />
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              {opened ? null : (
                <DiaryFields
                  detail={detail}
                  setDetail={setDetail}
                  energy={energy}
                  setEnergy={setEnergy}
                  dizzy={dizzy}
                  setDizzy={setDizzy}
                  endReason={endReason}
                  setEndReason={setEndReason}
                  busy={!!busy}
                  saveLabel="Pencereyi açtım"
                  onSave={() => void log("opened", undefined, detail)}
                  onCancel={null}
                />
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-muted">{view.protocolLabel}. Aşamalar yaklaşık saattir, kişiye göre değişir.</p>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <button type="button" className="text-sm font-medium text-brand" onClick={() => setGuideOpen((v) => !v)}>
          {guideOpen ? "Rehberi gizle" : "X içersem orucum bozulur mu?"}
        </button>
        {guideOpen ? (
          <div className="mt-3">
            <div className="field">
              <label htmlFor="fast-guide">Hızlı ara</label>
              <input
                id="fast-guide"
                value={guideQ}
                onChange={(e) => setGuideQ(e.target.value)}
                placeholder="kahve, sakız, maden suyu…"
              />
            </div>
            <ul className="mt-2 space-y-1.5">
              {guide.map((g) => (
                <li key={g.name} className="flex items-start gap-2 text-sm">
                  <span
                    className={
                      g.ok === "yes" ? "chip chip-ok" : g.ok === "no" ? "chip chip-bad" : "chip chip-off"
                    }
                  >
                    {g.ok === "yes" ? "Olur" : g.ok === "no" ? "Bozar" : "Dikkat"}
                  </span>
                  <span>
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted"> — {g.note}</span>
                  </span>
                </li>
              ))}
              {guide.length === 0 ? <li className="text-sm text-muted">Eşleşme yok. Şüphenizde su tercih edin.</li> : null}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function PhaseBar({ hours }: { hours: number }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-muted">Vücut durumu</p>
      <div className="flex h-2 overflow-hidden rounded-full bg-sand-deep">
        {FASTING_PHASES.map((p, i) => {
          const from = i === 0 ? 0 : FASTING_PHASES[i - 1].untilHours;
          const active = hours >= from && hours < p.untilHours;
          return (
            <div
              key={p.key}
              className="h-full flex-1"
              style={{ background: active ? "var(--color-brand)" : "transparent" }}
              title={p.title}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>0</span>
        <span>4</span>
        <span>8</span>
        <span>12</span>
        <span>16+</span>
      </div>
    </div>
  );
}

function DiaryFields({
  detail,
  setDetail,
  energy,
  setEnergy,
  dizzy,
  setDizzy,
  endReason,
  setEndReason,
  busy,
  onSave,
  onCancel,
  saveLabel = "Kaydet",
}: {
  detail: string;
  setDetail: (v: string) => void;
  energy: number;
  setEnergy: (n: number) => void;
  dizzy: boolean;
  setDizzy: (v: boolean) => void;
  endReason: string;
  setEndReason: (v: string) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: (() => void) | null;
  saveLabel?: string;
}) {
  return (
    <div className="mt-3 space-y-2">
      <div className="field">
        <label htmlFor="fast-detail">Ne tükettiniz? (isteğe bağlı)</label>
        <input
          id="fast-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={400}
          placeholder="Örn. 1 dilim ekmek, ayran…"
        />
      </div>
      <div className="field">
        <label htmlFor="fast-energy">Enerji seviyen nasıldı?</label>
        <select id="fast-energy" value={energy} onChange={(e) => setEnergy(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}/5
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={dizzy} onChange={(e) => setDizzy(e.target.checked)} />
        Baş dönmesi / mide bulantısı oldu
      </label>
      <div className="field">
        <label htmlFor="fast-end">Erken sonlandırma nedeni (isteğe bağlı)</label>
        <select id="fast-end" value={endReason} onChange={(e) => setEndReason(e.target.value)}>
          <option value="">—</option>
          {FASTING_END_REASONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onSave}>
          {saveLabel}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCancel}>
            Vazgeç
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatShort(mins: number): string {
  const t = Math.max(0, Math.round(mins));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}
