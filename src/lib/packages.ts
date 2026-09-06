export const PACKAGE_KINDS = [
  { key: "ishape", label: "i-Shape seans", unit: "seans" },
  { key: "diyet", label: "Diyet haftası", unit: "hafta" },
  { key: "combo", label: "i-Shape + Diyet", unit: "seans" },
  { key: "ozel", label: "Özel paket", unit: "adet" },
] as const;

export type PackageKind = (typeof PACKAGE_KINDS)[number]["key"];

export type ClientPackage = {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  total: number;
  next_no: number;
  unit: string;
  notes: string | null;
  is_active: number;
  created_at: string;
};

export function packageKindMeta(kind: string) {
  return PACKAGE_KINDS.find((k) => k.key === kind) ?? PACKAGE_KINDS.find((k) => k.key === "ozel")!;
}

export function packageUsed(p: Pick<ClientPackage, "total" | "next_no">) {
  return Math.max(0, Math.min(p.total, p.next_no - 1));
}

export function packageRemaining(p: Pick<ClientPackage, "total" | "next_no">) {
  return Math.max(0, p.total - packageUsed(p));
}

export function packageDone(p: Pick<ClientPackage, "total" | "next_no">) {
  return packageRemaining(p) <= 0;
}

export function packageBalance(p: Pick<ClientPackage, "title" | "total" | "next_no" | "unit">) {
  const used = packageUsed(p);
  const remaining = packageRemaining(p);
  const done = remaining <= 0;
  const pct = p.total > 0 ? Math.round((used / p.total) * 100) : 0;
  return {
    used,
    remaining,
    total: p.total,
    nextNo: done ? null : p.next_no,
    done,
    pct,
    unit: p.unit,
  };
}

export function packageSummary(p: ClientPackage) {
  const b = packageBalance(p);
  if (b.done) return `${p.title} · tamamlandı (${b.used}/${b.total} ${b.unit})`;
  return `${p.title} · kalan ${b.remaining} ${b.unit} · kullanılan ${b.used}/${b.total}`;
}

export function packageBalanceLine(p: Pick<ClientPackage, "title" | "total" | "next_no" | "unit">) {
  const b = packageBalance(p);
  if (b.done) return `Kullanılan ${b.used} · Kalan 0 · Toplam ${b.total} ${b.unit}`;
  return `Kullanılan ${b.used} · Kalan ${b.remaining} · Toplam ${b.total} ${b.unit} · sıradaki ${b.nextNo}. ${b.unit}`;
}

export function packageWarnLevel(p: Pick<ClientPackage, "total" | "next_no">) {
  const left = packageRemaining(p);
  if (left <= 0) return "done" as const;
  if (left === 1) return "last" as const;
  if (left === 2) return "two" as const;
  return null;
}

export function packageWarnText(p: Pick<ClientPackage, "title" | "total" | "next_no" | "unit">) {
  const level = packageWarnLevel(p);
  const b = packageBalance(p);
  if (level === "done") return `${p.title} paketiniz bitti. Yenilemek için diyetisyeninizle görüşün.`;
  if (level === "last") return `${p.title}: son ${b.unit}ınız.`;
  if (level === "two") return `${p.title}: 2 ${b.unit} kaldı.`;
  return null;
}

export const MEASURE_VISIT_NOTE =
  "Bu randevunuzda ölçümünüz olacaktır. Diyetisyeninizin belirttiği gibi geliniz, tüketim yapmayınız.";
