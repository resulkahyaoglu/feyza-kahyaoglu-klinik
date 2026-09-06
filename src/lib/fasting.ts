import { clockHHMM, nowTimeIstanbul } from "@/lib/clinic";

export type FastingProtocol = "kapali" | "14-10" | "16-8" | "16-8-erken" | "ozel";

export type FastingPlan = {
  user_id: number;
  enabled: number;
  protocol: FastingProtocol;
  window_start: string;
  window_end: string;
  days: string;
  notes: string | null;
  pause_reason?: string | null;
  pause_until?: string | null;
  updated_at?: string;
};

export const FASTING_PRESETS: {
  key: FastingProtocol;
  label: string;
  start: string;
  end: string;
  hint: string;
}[] = [
  {
    key: "kapali",
    label: "Kapalı",
    start: "12:00",
    end: "20:00",
    hint: "Danışan panelinde hiçbir şey görünmez.",
  },
  {
    key: "14-10",
    label: "14:10 · 10:00–20:00",
    start: "10:00",
    end: "20:00",
    hint: "14 saat oruç, 10 saat yeme. Yeni başlayan ve kadın danışanlar için uygun.",
  },
  {
    key: "16-8",
    label: "16:8 · 12:00–20:00",
    start: "12:00",
    end: "20:00",
    hint: "16 saat oruç, 8 saat yeme. En sık kullanılan pencere.",
  },
  {
    key: "16-8-erken",
    label: "16:8 erken · 09:00–17:00",
    start: "09:00",
    end: "17:00",
    hint: "Aynı 16:8, öğünler güne yayılır. Metabolik olarak daha güçlü.",
  },
  {
    key: "ozel",
    label: "Özel saat",
    start: "11:00",
    end: "19:00",
    hint: "Yeme penceresinin başlangıç ve bitişini siz girin.",
  },
];

export const FASTING_DAYS = [
  { n: 1, label: "Pzt" },
  { n: 2, label: "Sal" },
  { n: 3, label: "Çar" },
  { n: 4, label: "Per" },
  { n: 5, label: "Cum" },
  { n: 6, label: "Cmt" },
  { n: 7, label: "Paz" },
] as const;

export const FASTING_PAUSE_REASONS = [
  { key: "ramazan", label: "Ramazan" },
  { key: "regl", label: "Regl" },
  { key: "diger", label: "Diğer (seyahat, hastalık)" },
] as const;

export function pauseLabel(reason: string | null | undefined) {
  return FASTING_PAUSE_REASONS.find((r) => r.key === reason)?.label ?? "Duraklatıldı";
}

export function isFastingPaused(
  plan: Pick<FastingPlan, "pause_until"> | null | undefined,
  today = "",
) {
  const until = String(plan?.pause_until || "").slice(0, 10);
  if (!until) return false;
  const day =
    today ||
    new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  return until >= day;
}

export function isFastingEnabled(
  plan: Pick<FastingPlan, "enabled" | "protocol"> | null | undefined,
): boolean {
  if (!plan) return false;
  if (String(plan.protocol) === "kapali") return false;
  const raw = plan.enabled as unknown;
  if (raw === true || raw === "true" || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "0" || raw == null) return false;
  return Number(raw) === 1;
}

export function parseDays(raw: string | null | undefined): number[] {
  const nums = String(raw || "1,2,3,4,5,6,7")
    .split(/[,\s]+/)
    .map((x) => Number(x))
    .filter((n) => n >= 1 && n <= 7);
  return nums.length ? [...new Set(nums)].sort() : [1, 2, 3, 4, 5, 6, 7];
}

export function istanbulWeekday(): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(new Date());
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

function minutesOf(hhmm: string): number {
  const t = clockHHMM(hhmm);
  const h = Number(t.slice(0, 2));
  const m = Number(t.slice(3, 5));
  return h * 60 + m;
}

function wrapDiff(from: number, to: number): number {
  return (to - from + 24 * 60) % (24 * 60);
}

export function isInEatingWindow(nowHHMM: string, start: string, end: string): boolean {
  const n = minutesOf(nowHHMM);
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s === e) return true;
  if (s < e) return n >= s && n < e;
  return n >= s || n < e;
}

export function formatMinutes(total: number): string {
  const t = Math.max(0, Math.round(total));
  const h = Math.floor(t / 60);
  const m = t % 60;
  if (h <= 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export type FastingPhase = {
  key: string;
  title: string;
  body: string;
};

export function fastingPhase(minutesFasting: number): FastingPhase {
  const hours = minutesFasting / 60;
  const hit = FASTING_PHASES.find((p) => hours < p.untilHours) ?? FASTING_PHASES[FASTING_PHASES.length - 1];
  return { key: hit.key, title: hit.title, body: hit.body };
}

export const FASTING_PHASES = [
  {
    key: "digest",
    untilHours: 4,
    title: "Sindirim",
    body: "0–4. saat · son öğün işleniyor, kan şekeri dengeleniyor. Su için.",
  },
  {
    key: "insulin",
    untilHours: 8,
    title: "İnsülin düşüşü",
    body: "4–8. saat · glikojen kullanımı. Açlık gelebilir; geçer.",
  },
  {
    key: "glycogen",
    untilHours: 12,
    title: "Glikojen tükenmesi",
    body: "8–12. saat · metabolik geçiş. Saat kişiye göre değişir.",
  },
  {
    key: "fat",
    untilHours: 16,
    title: "Yağ kullanımı",
    body: "12–16. saat · yağ asitleri enerjiye döner. İlk öğünü yavaş açın.",
  },
  {
    key: "auto",
    untilHours: 99,
    title: "Hücresel temizlik",
    body: "16+ saat · otofaji spektrumu kişiden kişiye değişir, iddia değil yaklaşık dilim.",
  },
] as const;

export type FastingView = {
  activeToday: boolean;
  inWindow: boolean;
  windowStart: string;
  windowEnd: string;
  protocolLabel: string;
  minutesFasting: number;
  minutesUntilWindow: number;
  minutesUntilClose: number;
  totalFast: number;
  totalWindow: number;
  remainingRatio: number;
  phase: FastingPhase | null;
  headline: string;
  sub: string;
};

export function describeProtocol(protocol: string, start: string, end: string): string {
  const preset = FASTING_PRESETS.find((p) => p.key === protocol);
  if (protocol === "ozel") return `Özel · ${clockHHMM(start)}–${clockHHMM(end)}`;
  return preset?.label ?? `${clockHHMM(start)}–${clockHHMM(end)}`;
}

export function buildFastingView(
  plan: Pick<FastingPlan, "enabled" | "protocol" | "window_start" | "window_end" | "days">,
  nowHHMM = nowTimeIstanbul(),
  weekday = istanbulWeekday(),
  todayLog: Pick<FastingLog, "kind" | "reason"> | null = null,
): FastingView | null {
  if (!isFastingEnabled(plan)) return null;
  const days = parseDays(plan.days);
  const start = clockHHMM(plan.window_start);
  const end = clockHHMM(plan.window_end);
  const inWindow = isInEatingWindow(nowHHMM, start, end);
  const activeToday = days.includes(weekday);
  if (!activeToday) return null;

  const s = minutesOf(start);
  const e = minutesOf(end);
  const n = minutesOf(nowHHMM);
  const totalWindow = wrapDiff(s, e) || 8 * 60;
  const totalFast = 24 * 60 - totalWindow;
  const minutesUntilWindow = inWindow ? 0 : wrapDiff(n, s);
  const minutesUntilClose = inWindow ? wrapDiff(n, e) : 0;
  const minutesFasting = inWindow ? 0 : wrapDiff(e, n);
  const remainingRatio = inWindow
    ? Math.min(1, minutesUntilClose / totalWindow)
    : Math.min(1, minutesUntilWindow / totalFast);
  const phase = inWindow ? null : fastingPhase(minutesFasting);
  const protocolLabel = describeProtocol(plan.protocol, start, end);
  const broke = todayLog?.kind === "broke";

  if (broke) {
    return {
      activeToday,
      inWindow: true,
      windowStart: start,
      windowEnd: end,
      protocolLabel,
      minutesFasting: 0,
      minutesUntilWindow: 0,
      minutesUntilClose: wrapDiff(n, e),
      totalFast,
      totalWindow,
      remainingRatio: 0,
      phase: null,
      headline: "Bugün pencere erken açıldı",
      sub: `${breakLabel(todayLog?.reason ?? null)} · yargı yok, yarın kaldığınız yerden devam.`,
    };
  }

  if (inWindow) {
    return {
      activeToday,
      inWindow,
      windowStart: start,
      windowEnd: end,
      protocolLabel,
      minutesFasting,
      minutesUntilWindow,
      minutesUntilClose,
      totalFast,
      totalWindow,
      remainingRatio,
      phase: null,
      headline: "Yeme pencereniz açık",
      sub: `${end}'e ${formatMinutes(minutesUntilClose)} · ${start}–${end}`,
    };
  }

  return {
    activeToday,
    inWindow,
    windowStart: start,
    windowEnd: end,
    protocolLabel,
    minutesFasting,
    minutesUntilWindow,
    minutesUntilClose,
    totalFast,
    totalWindow,
    remainingRatio,
    phase,
    headline: phase?.title ?? "Oruçtasınız",
    sub: `Son öğünden beri ${formatMinutes(minutesFasting)} · pencere ${start}`,
  };
}

export const FASTING_BREAK_OPTIONS = [
  { key: "yemek", label: "Yemek yedim" },
  { key: "atistirma", label: "Atıştırdım" },
  { key: "icecek", label: "Kalorili içecek içtim" },
  { key: "ara", label: "Bugün ara veriyorum" },
] as const;

export type FastingBreakKey = (typeof FASTING_BREAK_OPTIONS)[number]["key"];

export type FastingLog = {
  id: number;
  user_id: number;
  log_date: string;
  kind: "broke" | "opened";
  reason: string | null;
  detail: string | null;
  energy?: number | null;
  dizzy?: number | null;
  end_reason?: string | null;
  created_at: string;
};

export function breakLabel(reason: string | null): string {
  const hit = FASTING_BREAK_OPTIONS.find((o) => o.key === reason);
  return hit?.label ?? reason ?? "Oruç bozuldu";
}

export const FASTING_END_REASONS = [
  { key: "sosyal", label: "Sosyal aktivite" },
  { key: "halsizlik", label: "Halsizlik" },
  { key: "aclik", label: "Açlık krizi" },
  { key: "diger", label: "Diğer" },
] as const;

export function endReasonLabel(key: string | null | undefined) {
  return FASTING_END_REASONS.find((r) => r.key === key)?.label ?? key ?? "";
}

export const FASTING_GUIDE: { name: string; ok: "yes" | "no" | "maybe"; note: string }[] = [
  { name: "Su", ok: "yes", note: "Serbest." },
  { name: "Sade maden suyu", ok: "yes", note: "Aromasız, şekersiz." },
  { name: "Filtre kahve", ok: "yes", note: "Süt ve şeker yoksa." },
  { name: "Türk kahvesi sade", ok: "yes", note: "Şekersiz." },
  { name: "Şekersiz çay", ok: "yes", note: "Bitki çayı da, tatlandırıcı yoksa." },
  { name: "Limonlu su (az)", ok: "yes", note: "Birkaç damla. Bardak limonata değil." },
  { name: "Siyah kahve", ok: "yes", note: "Süt/krema yoksa." },
  { name: "Sakız şekersiz", ok: "maybe", note: "Azı idare eder; çoğu kişide insülini tetikleyebilir." },
  { name: "Sakız şekerli", ok: "no", note: "Orucu bozar." },
  { name: "Sütlü kahve / latte", ok: "no", note: "Süt kalori ve insülin." },
  { name: "Meyve suyu", ok: "no", note: "Şeker yükü." },
  { name: "Ayran", ok: "no", note: "Kalorili." },
  { name: "Kola zero / gazoz lights", ok: "maybe", note: "Kalorisiz ama tatlandırıcı; tercihen su." },
  { name: "Et suyu / bone broth", ok: "no", note: "Kalori var, orucu bozar." },
  { name: "Stevia damla", ok: "maybe", note: "Kişiye göre. Güvenli taraf su." },
];

export function searchFastingGuide(q: string) {
  const s = q.trim().toLocaleLowerCase("tr");
  if (!s) return FASTING_GUIDE;
  return FASTING_GUIDE.filter(
    (g) => g.name.toLocaleLowerCase("tr").includes(s) || g.note.toLocaleLowerCase("tr").includes(s),
  );
}

export function addDaysISO(iso: string, days: number): string {
  const t = new Date(`${String(iso).slice(0, 10)}T12:00:00+03:00`);
  t.setTime(t.getTime() + days * 86_400_000);
  return t.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

export function istanbulWeekdayOf(iso: string): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(new Date(`${String(iso).slice(0, 10)}T12:00:00+03:00`));
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

export function istanbulHour(iso: string): number {
  const h = Number(
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      hour12: false,
    }),
  );
  return Number.isFinite(h) ? h % 24 : 0;
}

export type FastingStats = {
  scheduled30: number;
  kept30: number;
  rate30: number;
  streak: number;
  heatmap: number[];
};

export function computeFastingStats(
  plan: Pick<FastingPlan, "days" | "pause_until">,
  logs: Pick<FastingLog, "log_date" | "kind" | "created_at">[],
  today: string,
): FastingStats {
  const allowed = parseDays(plan.days);
  const byDate = new Map(logs.map((l) => [String(l.log_date).slice(0, 10), l]));
  let scheduled30 = 0;
  let kept30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDaysISO(today, -i);
    if (isFastingPaused(plan, d)) continue;
    if (!allowed.includes(istanbulWeekdayOf(d))) continue;
    scheduled30 += 1;
    const log = byDate.get(d);
    if (!log || log.kind !== "broke") kept30 += 1;
  }
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = addDaysISO(today, -i);
    if (isFastingPaused(plan, d)) continue;
    if (!allowed.includes(istanbulWeekdayOf(d))) continue;
    const log = byDate.get(d);
    if (log?.kind === "broke") break;
    streak += 1;
  }
  const heatmap = Array.from({ length: 24 }, () => 0);
  for (const l of logs) {
    if (l.kind !== "broke") continue;
    heatmap[istanbulHour(l.created_at)] += 1;
  }
  const rate30 = scheduled30 ? Math.round((kept30 / scheduled30) * 100) : 0;
  return { scheduled30, kept30, rate30, streak, heatmap };
}

export const EMPTY_FASTING: FastingPlan = {
  user_id: 0,
  enabled: 0,
  protocol: "kapali",
  window_start: "12:00",
  window_end: "20:00",
  days: "1,2,3,4,5,6,7",
  notes: null,
};
