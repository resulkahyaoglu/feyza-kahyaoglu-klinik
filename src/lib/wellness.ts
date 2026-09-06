export const EAT_TRIGGERS = [
  {
    key: "aclik",
    label: "Gerçek açlık",
    hint: "Mide boş, saatlerdir bir şey yemediniz. Bu normal.",
  },
  {
    key: "stres",
    label: "Stres / sinir",
    hint: "Gerginken elinize bir şey aldınız. Açlık değil, rahatlama arayışı.",
  },
  {
    key: "sikinti",
    label: "Sıkıntı / can sıkıntısı",
    hint: "Yapacak bir şey yokken atıştırma. Mide değil, alışkanlık.",
  },
  {
    key: "odul",
    label: "Ödül / hak ettim",
    hint: "Yoruldum, hak ettim diye yenilen. Kutlama da buna girer.",
  },
  {
    key: "sosyal",
    label: "Sosyal / ikram",
    hint: "Birlikte yenilen, ikram edilen. Reddetmek zor geldi.",
  },
] as const;

export function eatTriggerLabel(key: string | null | undefined) {
  return EAT_TRIGGERS.find((t) => t.key === key)?.label ?? key ?? "";
}

export const MINDFUL_SLOTS = [
  { key: "sabah", label: "Kahvaltı" },
  { key: "ogle", label: "Öğle" },
  { key: "aksam", label: "Akşam" },
  { key: "ara", label: "Ara öğün" },
] as const;

export function mindfulSlotLabel(key: string) {
  return MINDFUL_SLOTS.find((s) => s.key === key)?.label ?? key;
}

export function hungerCaption(n: number): string {
  if (n <= 2) return "Çok aç — mide boş, titreme olabilir";
  if (n <= 4) return "Rahat açlık — yemek zamanı";
  if (n === 5) return "Ne aç ne tok";
  if (n <= 7) return "Rahat tok — durmak iyi";
  return "Tıkabasa — rahatsız tok";
}

export const LAB_MARKERS = [
  { key: "glucose", label: "Açlık kan şekeri", unit: "mg/dL", min: 70, max: 99 },
  { key: "hba1c", label: "HbA1c", unit: "%", min: 4, max: 5.6 },
  { key: "insulin", label: "Açlık insülin", unit: "µIU/mL", min: 2, max: 25 },
  { key: "homa", label: "HOMA-IR", unit: "", min: 0.5, max: 2.5 },
  { key: "ldl", label: "LDL", unit: "mg/dL", min: 0, max: 129 },
  { key: "hdl", label: "HDL", unit: "mg/dL", min: 40, max: 100 },
  { key: "trig", label: "Trigliserid", unit: "mg/dL", min: 0, max: 149 },
  { key: "vitd", label: "D vitamini", unit: "ng/mL", min: 20, max: 100 },
  { key: "b12", label: "B12", unit: "pg/mL", min: 200, max: 900 },
] as const;

export type LabMarkerKey = (typeof LAB_MARKERS)[number]["key"];

export function labMarkerMeta(key: string) {
  return LAB_MARKERS.find((m) => m.key === key) ?? null;
}

export function labOutOfRange(
  key: string,
  value: number,
  refMin?: number | null,
  refMax?: number | null,
): "low" | "high" | null {
  const bounds = labRefBounds(key, refMin, refMax);
  if (!bounds) return null;
  if (value < bounds.min) return "low";
  if (value > bounds.max) return "high";
  return null;
}

export function labRefBounds(
  key: string,
  refMin?: number | null,
  refMax?: number | null,
): { min: number; max: number; custom: boolean } | null {
  const m = labMarkerMeta(key);
  const min = refMin != null && Number.isFinite(Number(refMin)) ? Number(refMin) : m?.min;
  const max = refMax != null && Number.isFinite(Number(refMax)) ? Number(refMax) : m?.max;
  if (min == null || max == null) return null;
  return { min, max, custom: refMin != null || refMax != null };
}

export function waterTargetMl(weightKg: number | null | undefined): number {
  if (!weightKg || weightKg < 30) return 2000;
  return Math.min(4000, Math.max(1500, Math.round(weightKg * 30)));
}

export type WeekHabits = {
  waterGoalDays: number;
  meals: number;
  activeDays: number;
  streak: number;
};

export function emptyWeekHabits(): WeekHabits {
  return { waterGoalDays: 0, meals: 0, activeDays: 0, streak: 0 };
}

export type DailyLog = {
  id: number;
  user_id: number;
  log_date: string;
  water_ml: number;
  sweaty: number;
  low_carb: number;
  hunger_before: number | null;
  hunger_after: number | null;
  eat_trigger: string | null;
  sleep_hours: number | null;
  stress: number | null;
  mood: string | null;
  energy: number | null;
  created_at: string;
  client_name?: string;
};

export type LabValue = {
  id: number;
  user_id: number;
  taken_at: string;
  marker: string;
  value: number;
  unit: string;
  notes: string | null;
  ref_min: number | null;
  ref_max: number | null;
  created_at: string;
  client_name?: string;
};

export type MindfulMeal = {
  id: number;
  user_id: number;
  log_date: string;
  slot: string;
  hunger_before: number;
  hunger_after: number | null;
  eat_trigger: string | null;
  created_at: string;
  client_name?: string;
};

export function electrolyteHint(sweaty: boolean): string | null {
  if (!sweaty) return null;
  return "Terle tuz (sodyum) gider. Sade maden suyu veya yemeğe biraz tuz yeterli. Hap önermiyoruz.";
}

export type LabTrend = {
  marker: string;
  first: LabValue;
  last: LabValue;
  delta: number;
  count: number;
  history: LabValue[];
};

export function labTrends(rows: LabValue[]): LabTrend[] {
  const by = new Map<string, LabValue[]>();
  for (const r of rows) {
    const list = by.get(r.marker) ?? [];
    list.push(r);
    by.set(r.marker, list);
  }
  const out: LabTrend[] = [];
  for (const [marker, list] of by) {
    const sorted = [...list].sort((a, b) => {
      const d = String(a.taken_at).slice(0, 10).localeCompare(String(b.taken_at).slice(0, 10));
      return d || a.id - b.id;
    });
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    out.push({
      marker,
      first,
      last,
      delta: Number(last.value) - Number(first.value),
      count: sorted.length,
      history: sorted,
    });
  }
  return out.sort((a, b) => (labMarkerMeta(a.marker)?.label ?? a.marker).localeCompare(labMarkerMeta(b.marker)?.label ?? b.marker, "tr"));
}
