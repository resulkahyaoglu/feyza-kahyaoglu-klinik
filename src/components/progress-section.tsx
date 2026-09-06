import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCm, formatDateTr, formatKg } from "@/lib/clinic";
import type { MeasureRow } from "@/lib/actions";
import type { ProgressSummary } from "@/lib/clinic";
import { cn } from "@/lib/utils";

const ZONES = [
  { key: "waist", label: "Bel", unit: "cm" },
  { key: "belly", label: "Göbek", unit: "cm" },
  { key: "hip", label: "Kalça", unit: "cm" },
  { key: "arm_right", label: "Sağ kol", unit: "cm" },
  { key: "arm_left", label: "Sol kol", unit: "cm" },
  { key: "leg_right", label: "Sağ bacak", unit: "cm" },
  { key: "leg_left", label: "Sol bacak", unit: "cm" },
  { key: "weight", label: "Kilo", unit: "kg" },
] as const;

const FALLBACK = [
  { key: "waist", label: "Bel", unit: "cm" },
  { key: "belly", label: "Göbek", unit: "cm" },
  { key: "hip", label: "Kalça", unit: "cm" },
] as const;

type ZoneKey = (typeof ZONES)[number]["key"];

type ZoneCard = {
  label: string;
  current: number | null;
  delta: number | null;
  unit: "cm" | "kg";
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function zoneValue(m: MeasureRow, key: ZoneKey): number | null {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function zoneDelta(chrono: MeasureRow[], key: ZoneKey) {
  const vals: number[] = [];
  for (let i = chrono.length - 1; i >= 0 && vals.length < 2; i--) {
    const v = zoneValue(chrono[i]!, key);
    if (v != null) vals.push(v);
  }
  if (vals.length === 0) return { current: null, delta: null };
  if (vals.length === 1) return { current: vals[0]!, delta: null };
  return { current: vals[0]!, delta: round1(vals[0]! - vals[1]!) };
}

function pickProgressCards(chrono: MeasureRow[]): { cards: ZoneCard[]; hasLoss: boolean } {
  if (chrono.length === 0) {
    return {
      cards: FALLBACK.map((z) => ({ label: z.label, current: null, delta: null, unit: z.unit })),
      hasLoss: false,
    };
  }
  if (chrono.length === 1) {
    const last = chrono[0]!;
    return {
      cards: FALLBACK.map((z) => ({
        label: z.label,
        current: zoneValue(last, z.key),
        delta: null,
        unit: z.unit,
      })),
      hasLoss: false,
    };
  }

  const ranked = ZONES.map((z) => {
    const { current, delta } = zoneDelta(chrono, z.key);
    return { label: z.label, current, delta, unit: z.unit };
  })
    .filter((z) => z.delta != null && z.delta < -0.05)
    .sort((a, b) => a.delta! - b.delta!);

  if (ranked.length === 0) {
    return {
      cards: FALLBACK.map((z) => {
        const { current, delta } = zoneDelta(chrono, z.key);
        return { label: z.label, current, delta, unit: z.unit };
      }),
      hasLoss: false,
    };
  }

  return { cards: ranked.slice(0, 3), hasLoss: true };
}

function formatValue(n: number | null, unit: "cm" | "kg") {
  return unit === "kg" ? formatKg(n) : formatCm(n);
}

function formatDelta(delta: number | null, unit: "cm" | "kg") {
  if (delta == null) return null;
  if (Math.abs(delta) < 0.05) return `0 ${unit}`;
  const n = Math.abs(delta).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  return `${delta < 0 ? "−" : "+"}${n} ${unit}`;
}

function journeyCopy(
  count: number,
  progress: ProgressSummary | null,
  remaining: number | null,
) {
  if (count === 0) return "Ölçüleriniz kaydedildiğinde süreç burada görünecek.";
  if (count === 1) return "İlk ölçümleriniz kaydedildi.";
  if (!progress || progress.direction === "hold" || Math.abs(progress.change) < 0.05) {
    return "Henüz değişim yok, süreç devam ediyor.";
  }
  if (Math.abs(progress.change) < 0.5) {
    return "Küçük bir değişim var, süreç sakin ilerliyor.";
  }
  if (progress.direction === "loss") {
    return `${Math.abs(progress.change).toLocaleString("tr-TR")} kg yol alındı.`;
  }
  if (remaining !== null && remaining <= 0) return "Hedef aralığındasınız.";
  return "Ölçüler güncellendi, süreç devam ediyor.";
}

function remainingCopy(remaining: number | null) {
  if (remaining === null) return "Hedef kilo henüz netleşmedi.";
  if (remaining <= 0) return "Hedef aralığındasınız.";
  if (remaining < 1) return "Hedefe çok yakınsınız.";
  return `Hedefe doğru ${remaining.toLocaleString("tr-TR")} kg · süreç devam ediyor.`;
}

function JourneySpark({
  points,
  target,
  unit,
}: {
  points: { label: string; value: number }[];
  target?: number | null;
  unit: "kg" | "cm";
}) {
  const W = 360;
  const H = 148;
  const pad = { t: 18, r: 14, b: 32, l: 10 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const ys = points.map((p) => p.value);
  if (target != null) ys.push(target);
  const min = Math.min(...ys) - 0.6;
  const max = Math.max(...ys) + 0.6;
  const span = max - min || 1;
  const xAt = (i: number) =>
    pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) => pad.t + (1 - (v - min) / span) * innerH;
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");
  const lastX = xAt(points.length - 1);
  const area = `${line} L${lastX.toFixed(1)} ${(pad.t + innerH).toFixed(1)} L${xAt(0).toFixed(1)} ${(pad.t + innerH).toFixed(1)} Z`;
  const targetY = target != null ? yAt(target) : null;
  const fmt = (n: number) => (unit === "kg" ? formatKg(n) : formatCm(n));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full overflow-visible" role="img">
      <title>Ölçüm grafiği</title>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {targetY != null ? (
        <g>
          <line
            x1={pad.l}
            x2={W - pad.r}
            y1={targetY}
            y2={targetY}
            stroke="var(--color-muted)"
            strokeDasharray="4 5"
            strokeWidth="1"
          />
          <text
            x={W - pad.r}
            y={targetY - 6}
            textAnchor="end"
            className="fill-muted"
            fontSize="10"
          >
            hedef {fmt(target!)}
          </text>
        </g>
      ) : null}
      <path d={area} fill="url(#spark-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => {
        const last = i === points.length - 1;
        return (
          <g key={`${p.label}-${i}`}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.value)}
              r={last ? 5 : 3.2}
              fill={last ? "var(--color-brand)" : "var(--color-cream)"}
              stroke="var(--color-brand)"
              strokeWidth={last ? 0 : 1.8}
            />
            <text
              x={xAt(i)}
              y={H - 10}
              textAnchor="middle"
              className="fill-muted"
              fontSize="10"
            >
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ProgressSection({
  measures,
  targetWeight,
  progress,
}: {
  measures: MeasureRow[];
  targetWeight: number | null;
  progress: ProgressSummary | null;
}) {
  const [open, setOpen] = useState(true);
  const [metric, setMetric] = useState<"kilo" | "bel">("kilo");

  const chrono = useMemo(
    () => [...measures].sort((a, b) => a.measure_date.localeCompare(b.measure_date)),
    [measures],
  );
  const series = chrono.slice(-8);
  const remaining =
    targetWeight != null && progress
      ? round1(progress.now - targetWeight)
      : targetWeight != null && series.at(-1)?.weight != null
        ? round1(series.at(-1)!.weight! - targetWeight)
        : null;

  const weightPts = series
    .filter((m) => m.weight != null)
    .map((m) => ({
      label: `${m.measure_date.slice(8, 10)}.${m.measure_date.slice(5, 7)}`,
      value: m.weight as number,
    }));
  const waistPts = series
    .filter((m) => m.waist != null)
    .map((m) => ({
      label: `${m.measure_date.slice(8, 10)}.${m.measure_date.slice(5, 7)}`,
      value: m.waist as number,
    }));
  const active = metric === "kilo" ? weightPts : waistPts;
  const last = chrono.at(-1);
  const { cards, hasLoss } = pickProgressCards(chrono);
  const lastVal = metric === "kilo" ? last?.weight : last?.waist;
  const lastDelta =
    active.length >= 2 ? round1(active[active.length - 1]!.value - active[active.length - 2]!.value) : null;

  return (
    <section id="ilerleme" className="mt-8 scroll-mt-24">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Süreç</p>
          <h2 className="mt-1 text-2xl">İlerlemeniz</h2>
          <p className="mt-1 text-sm text-ink-soft">{journeyCopy(chrono.length, progress, remaining)}</p>
        </div>
        <ChevronDown
          className={cn("mt-2 size-5 shrink-0 text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <article className="surface p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Kilo</p>
              <p className="stat-num mt-1 text-2xl text-brand-dark">
                {progress ? (
                  <>
                    {formatKg(progress.start)}
                    <span className="mx-1.5 text-base font-normal text-muted">→</span>
                    {formatKg(progress.now)}
                  </>
                ) : last?.weight != null ? (
                  formatKg(last.weight)
                ) : (
                  "—"
                )}
              </p>
            </article>
            <article className="surface p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Hedef</p>
              <p className="stat-num mt-1 text-2xl text-brand-dark">{formatKg(targetWeight)}</p>
            </article>
            <article className="surface p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Mesafe</p>
              <p className="mt-2 text-sm leading-snug text-ink-soft">{remainingCopy(remaining)}</p>
            </article>
          </div>

          <div className="surface mt-4 p-4 md:p-5">
            {chrono.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">
                İlk ölçümleriniz kaydedildiğinde grafik burada durur.
              </p>
            ) : chrono.length === 1 ? (
              <div className="py-6 text-center">
                <p className="font-display text-xl text-brand-dark">İlk ölçümleriniz kaydedildi</p>
                <p className="mt-2 text-sm text-muted">
                  {formatDateTr(chrono[0]!.measure_date)}
                  {chrono[0]!.weight != null ? ` · ${formatKg(chrono[0]!.weight)}` : ""}
                  {chrono[0]!.waist != null ? ` · bel ${formatCm(chrono[0]!.waist)}` : ""}
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted">
                      {metric === "kilo" ? "Son kilo" : "Son bel"}
                    </p>
                    <p className="stat-num mt-1 text-3xl text-brand-dark">
                      {metric === "kilo" ? formatKg(lastVal ?? null) : formatCm(lastVal ?? null)}
                    </p>
                    {lastDelta != null ? (
                      <p className={cn("mt-1 text-sm", lastDelta < 0 ? "text-brand" : "text-muted")}>
                        {formatDelta(lastDelta, metric === "kilo" ? "kg" : "cm")} önceki ölçüye göre
                      </p>
                    ) : null}
                  </div>
                  <div className="flex rounded-full bg-sand-deep p-1">
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium",
                        metric === "kilo" ? "bg-cream text-brand-dark shadow-soft" : "text-muted",
                      )}
                      onClick={() => setMetric("kilo")}
                    >
                      Kilo
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium",
                        metric === "bel" ? "bg-cream text-brand-dark shadow-soft" : "text-muted",
                      )}
                      onClick={() => setMetric("bel")}
                    >
                      Bel
                    </button>
                  </div>
                </div>
                {active.length >= 2 ? (
                  <div className="mt-2">
                    <JourneySpark
                      points={active}
                      target={metric === "kilo" ? targetWeight : null}
                      unit={metric === "kilo" ? "kg" : "cm"}
                    />
                  </div>
                ) : (
                  <p className="mt-6 text-center text-sm text-muted">
                    Bu ölçü için en az iki kayıt gerekir.
                  </p>
                )}
              </>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Kilo dalgalanması normaldir. Bel ve kalça ölçüleri daha anlamlıdır.
            </p>
          </div>

          <div className="mt-5">
            <h3 className="text-base font-medium">En çok ilerleme kaydedilen bölgeler</h3>
            {!hasLoss && chrono.length > 1 ? (
              <p className="mt-1 text-sm text-ink-soft">
                Henüz belirgin bir değişim yok, süreç devam ediyor.
              </p>
            ) : chrono.length <= 1 ? (
              <p className="mt-1 text-sm text-ink-soft">İlk ölçümleriniz kaydedildi.</p>
            ) : null}
            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {cards.map((card) => {
                const deltaText = formatDelta(card.delta, card.unit);
                const isLoss = card.delta != null && card.delta < -0.05;
                return (
                  <article key={card.label} className="surface p-3 sm:p-4">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{card.label}</p>
                    <p className="stat-num mt-1 text-lg text-brand-dark sm:text-xl">
                      {formatValue(card.current, card.unit)}
                    </p>
                    {deltaText ? (
                      <p className={`mt-1 text-xs font-medium ${isLoss ? "text-brand" : "text-muted"}`}>
                        {deltaText}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted">Başlangıç</p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
