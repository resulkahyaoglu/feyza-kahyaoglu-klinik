import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteMindfulMeal,
  loadClients,
  saveDailyLog,
  saveMindfulMeal,
  saveLabValue,
  deleteLabValue,
  updateLabValue,
  type LabValue as LabValueRow,
  type MindfulMeal,
} from "@/lib/actions";
import { formatDateTr, todayISO } from "@/lib/clinic";
import {
  EAT_TRIGGERS,
  LAB_MARKERS,
  MINDFUL_SLOTS,
  eatTriggerLabel,
  electrolyteHint,
  hungerCaption,
  labMarkerMeta,
  labOutOfRange,
  labRefBounds,
  labTrends,
  mindfulSlotLabel,
  waterTargetMl,
  type DailyLog,
} from "@/lib/wellness";

function refsFromForm(fd: FormData): { refMin?: number; refMax?: number } {
  if (String(fd.get("refCustom") || "") !== "1") return {};
  const refMin = Number(String(fd.get("refMin") || "").replace(",", "."));
  const refMax = Number(String(fd.get("refMax") || "").replace(",", "."));
  if (!Number.isFinite(refMin) || !Number.isFinite(refMax)) return {};
  return { refMin, refMax };
}

export function LabRefToggle({
  marker,
  initialMin,
  initialMax,
}: {
  marker: string;
  initialMin?: number | null;
  initialMax?: number | null;
}) {
  const meta = labMarkerMeta(marker);
  const had = initialMin != null || initialMax != null;
  const [open, setOpen] = useState(had);
  return (
    <div className="col-span-full sm:col-span-2">
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setOpen((o) => !o)}>
        {open ? "Varsayılan aralığı kullan" : "Ref aralığını düzenle"}
      </button>
      {open ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input type="hidden" name="refCustom" value="1" />
          <div className="field">
            <label>Ref min</label>
            <input
              name="refMin"
              inputMode="decimal"
              required
              defaultValue={String(initialMin ?? meta?.min ?? "")}
            />
          </div>
          <div className="field">
            <label>Ref max</label>
            <input
              name="refMax"
              inputMode="decimal"
              required
              defaultValue={String(initialMax ?? meta?.max ?? "")}
            />
          </div>
          <p className="col-span-2 text-xs text-muted">
            Hastane kâğıdındaki aralığı yazın. Tıklamazsanız sistem aralığı kalır.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function DailyTrack({
  today,
  meals = [],
  weightKg,
  onSaved,
}: {
  today: DailyLog | null;
  meals?: MindfulMeal[];
  weightKg: number | null;
  onSaved: () => void;
}) {
  const [water, setWater] = useState(String(today?.water_ml ?? 0));
  const [sweaty, setSweaty] = useState(Number(today?.sweaty) === 1);
  const [sleep, setSleep] = useState(String(today?.sleep_hours ?? ""));
  const [stress, setStress] = useState(String(today?.stress ?? ""));
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const hint = electrolyteHint(sweaty);
  const ml = Math.max(0, Number(water) || 0);
  const target = waterTargetMl(weightKg);
  const pct = Math.min(100, Math.round((ml / Math.max(1, target)) * 100));

  async function saveBody() {
    setBusy(true);
    try {
      await saveDailyLog({
        data: {
          waterMl: ml,
          sweaty,
          sleepHours: sleep ? Number(sleep) : undefined,
          stress: stress ? Number(stress) : undefined,
        },
      });
      toast.success("Kaydedildi.");
      onSaved();
    } catch {
      toast.error("Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 space-y-4">
      <article className="surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Su</p>
            <p className="mt-1 font-display text-2xl">
              {ml} / {target} ml
            </p>
          </div>
          <p className="max-w-[9.5rem] text-right text-xs leading-snug text-muted">
            Günlük tüketmeniz gereken su miktarı diyetisyeniniz tarafından belirlenmiştir.
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">Bardak ≈ 250 ml.</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand-deep">
          <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[250, 500].map((n) => (
            <button
              key={n}
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setWater(String(ml + n))}
            >
              +{n} ml
            </button>
          ))}
        </div>
        <div className="field mt-3">
          <label htmlFor="water-ml">Bugün içtiğiniz su (ml)</label>
          <input id="water-ml" inputMode="numeric" value={water} onChange={(e) => setWater(e.target.value)} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={sweaty} onChange={(e) => setSweaty(e.currentTarget.checked)} />
          Çok terledim
        </label>
        {hint ? <p className="mt-3 rounded-xl bg-brand-mist px-3 py-2 text-sm text-brand-dark">{hint}</p> : null}
        <button className="btn btn-primary mt-4" type="button" disabled={busy} onClick={() => void saveBody()}>
          Suyu kaydet
        </button>
      </article>

      {more ? (
        <>
          <MindfulMealCard meals={meals} onSaved={onSaved} />
          <article className="surface p-5">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Uyku ve stres</p>
        <p className="mt-1 text-sm text-muted">
          Dün gece kaç saat uyudunuz, bu sabah stresiniz nasıldı? Az uyku ve yüksek stres kilo vermeyi yavaşlatabilir; diyetisyeniniz plato döneminde buna bakar.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="field">
            <label htmlFor="sleep">Uyku (saat)</label>
            <input id="sleep" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7.5" />
          </div>
          <div className="field">
            <label htmlFor="stress">Sabah stres 1–5</label>
            <select id="stress" value={stress} onChange={(e) => setStress(e.target.value)}>
              <option value="">Seçin</option>
              <option value="1">1 · sakin</option>
              <option value="2">2 · hafif</option>
              <option value="3">3 · orta</option>
              <option value="4">4 · gergin</option>
              <option value="5">5 · çok gergin</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary mt-4" type="button" disabled={busy} onClick={() => void saveBody()}>
          Uykuyu kaydet
        </button>
      </article>
        </>
      ) : null}
      <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={() => setMore((v) => !v)}>
        {more
          ? "Öğün ve uykuyu gizle"
          : meals.length
            ? `Öğün ve uyku yaz (${meals.length} öğün bugün)`
            : "Öğün ve uyku yaz"}
      </button>
    </div>
  );
}

function MindfulMealCard({ meals, onSaved }: { meals: MindfulMeal[]; onSaved: () => void }) {
  const [slot, setSlot] = useState<(typeof MINDFUL_SLOTS)[number]["key"]>("ogle");
  const [before, setBefore] = useState(4);
  const [after, setAfter] = useState(6);
  const [trigger, setTrigger] = useState("aclik");
  const [busy, setBusy] = useState(false);
  const trig = EAT_TRIGGERS.find((t) => t.key === trigger);

  return (
    <article className="surface p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">Öğün farkındalığı</p>
      <p className="mt-1 text-sm text-muted">
        Her öğünü ayrı kaydedin. Önce hangi öğün olduğunu seçin, sonra yemeden hemen önce ve yedikten sonra 1–10 puan verin. 3–4 civarı yemeye başlamak, 6–7 civarı durmak idealdir.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await saveMindfulMeal({
              data: { slot, hungerBefore: before, hungerAfter: after, eatTrigger: trigger },
            });
            toast.success(`${mindfulSlotLabel(slot)} kaydedildi.`);
            onSaved();
          } catch {
            toast.error("Kaydedilemedi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Hangi öğün?</p>
          <div className="flex flex-wrap gap-2">
            {MINDFUL_SLOTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={slot === s.key ? "btn btn-sm btn-primary" : "btn btn-sm btn-secondary"}
                onClick={() => setSlot(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="h-before">Yemeden önce ne kadar açıydınız? (1 çok aç — 10 tıkabasa)</label>
          <input
            id="h-before"
            type="range"
            min={1}
            max={10}
            value={before}
            onChange={(e) => setBefore(Number(e.target.value))}
          />
          <p className="text-sm font-medium text-brand-dark">
            {before}/10 · {hungerCaption(before)}
          </p>
        </div>
        <div className="field">
          <label htmlFor="h-after">Yedikten sonra ne kadar tok kaldınız?</label>
          <input
            id="h-after"
            type="range"
            min={1}
            max={10}
            value={after}
            onChange={(e) => setAfter(Number(e.target.value))}
          />
          <p className="text-sm font-medium text-brand-dark">
            {after}/10 · {hungerCaption(after)}
          </p>
        </div>
        <div className="field">
          <label htmlFor="trigger">Bu öğünü asıl neden yediniz?</label>
          <select id="trigger" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            {EAT_TRIGGERS.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
          {trig ? <p className="mt-1 text-sm text-muted">{trig.hint}</p> : null}
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : `${mindfulSlotLabel(slot)} öğününü kaydet`}
        </button>
      </form>
      {meals.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-line pt-3">
          {meals.map((m) => (
            <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 text-sm">
              <span>
                <span className="font-medium">{mindfulSlotLabel(m.slot)}</span>
                <span className="text-muted">
                  {" "}
                  · önce {m.hunger_before}/10 · sonra {m.hunger_after ?? "—"}/10
                  {m.eat_trigger ? ` · ${eatTriggerLabel(m.eat_trigger)}` : ""}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  await deleteMindfulMeal({ data: { id: m.id } });
                  onSaved();
                }}
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function LabTrendView({ items }: { items: LabValueRow[] }) {
  const trends = labTrends(items);
  return (
    <section className="mt-4">
      <h3 className="text-lg">Zaman içindeki değişim</h3>
      <p className="mt-1 text-sm text-muted">
        Değerleri diyetisyeniniz tahlilinizden yazar. Siz yalnızca PDF veya fotoğraf yüklersiniz. Kırmızı = referans dışı (tanı değil).
      </p>
      {trends.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Henüz işlenmiş kan değeri yok.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {trends.map((t) => {
            const meta = labMarkerMeta(t.marker);
            const flag = labOutOfRange(t.marker, Number(t.last.value), t.last.ref_min, t.last.ref_max);
            const bounds = labRefBounds(t.marker, t.last.ref_min, t.last.ref_max);
            const same = t.first.id === t.last.id;
            const delta = t.delta;
            const deltaTxt = same
              ? "ilk kayıt"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${t.last.unit}`;
            return (
              <li key={t.marker} className="rounded-xl border border-line px-3 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{meta?.label ?? t.marker}</p>
                  <p className={flag ? "font-semibold text-warn" : "font-medium"}>
                    {same ? (
                      <>
                        {t.last.value} {t.last.unit}
                        {flag === "high" ? " yüksek" : flag === "low" ? " düşük" : ""}
                      </>
                    ) : (
                      <>
                        {t.first.value} → {t.last.value} {t.last.unit}{" "}
                        <span className="text-muted">({deltaTxt})</span>
                        {flag === "high" ? " · son değer yüksek" : flag === "low" ? " · son değer düşük" : ""}
                      </>
                    )}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {same
                    ? formatDateTr(t.last.taken_at)
                    : `${formatDateTr(t.first.taken_at)} → ${formatDateTr(t.last.taken_at)} · ${t.count} ölçüm`}
                  {bounds ? ` · ref ${bounds.min}–${bounds.max} ${meta?.unit ?? ""}` : ""}
                  {bounds?.custom ? " (hastane)" : ""}
                </p>
                {t.history.length > 2 ? (
                  <p className="mt-1 text-xs text-muted">
                    {t.history
                      .map((h) => `${formatDateTr(h.taken_at)}: ${h.value}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function StaffLabValueForm({
  userId,
  defaultDate,
  onSaved,
}: {
  userId?: number;
  defaultDate?: string;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [marker, setMarker] = useState<string>(LAB_MARKERS[0]?.key ?? "glucose");
  const [clients, setClients] = useState<Array<{ id: number; full_name: string }>>([]);
  useEffect(() => {
    if (userId) return;
    void loadClients({ data: {} }).then((r) => {
      if (r.auth) {
        setClients(
          r.rows
            .filter((u) => Number(u.is_active) !== 0)
            .map((u) => ({ id: u.id, full_name: u.full_name })),
        );
      }
    });
  }, [userId]);

  return (
    <form
      className="mt-3 grid gap-2 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const marker = String(fd.get("marker") || "");
        const value = Number(String(fd.get("value") || "").replace(",", "."));
        const takenAt = String(fd.get("takenAt") || "");
        const picked = userId ?? Number(fd.get("userId") || 0);
        if (!picked) {
          toast.error("Danışan seçin.");
          return;
        }
        if (!marker || !Number.isFinite(value) || !takenAt) {
          toast.error("Parametre, değer ve tarih gerekli.");
          return;
        }
        if (marker === "__custom__" && !String(fd.get("customLabel") || "").trim()) {
          toast.error("Parametre adını yazın.");
          return;
        }
        setBusy(true);
        try {
          const res = await saveLabValue({
            data: {
              userId: picked,
              marker,
              value,
              takenAt,
              notes: String(fd.get("notes") || "") || undefined,
              customLabel: String(fd.get("customLabel") || "") || undefined,
              customUnit: String(fd.get("customUnit") || "") || undefined,
              ...refsFromForm(fd),
            },
          });
          if (!res.ok) {
            toast.error(res.error ?? "Kaydedilemedi.");
            return;
          }
          toast.success("Değer kaydedildi.");
          e.currentTarget.reset();
          setMarker(LAB_MARKERS[0]?.key ?? "glucose");
          onSaved();
        } finally {
          setBusy(false);
        }
      }}
    >
      {userId ? (
        <input type="hidden" name="userId" value={userId} />
      ) : (
        <div className="field sm:col-span-2">
          <label htmlFor="lab-user">Danışan</label>
          <select id="lab-user" name="userId" required defaultValue="">
            <option value="" disabled>
              Seçin
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="field sm:col-span-2">
        <label htmlFor="lab-marker">Parametre</label>
        <select
          id="lab-marker"
          name="marker"
          required
          value={marker}
          onChange={(e) => setMarker(e.target.value)}
        >
          {LAB_MARKERS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label} {m.unit ? `(${m.unit})` : ""}
            </option>
          ))}
          <option value="__custom__">Diğer (elle yazın)</option>
        </select>
      </div>
      {marker === "__custom__" ? (
        <>
          <div className="field">
            <label htmlFor="lab-custom">Parametre adı</label>
            <input id="lab-custom" name="customLabel" required placeholder="Örn. Ferritin" />
          </div>
          <div className="field">
            <label htmlFor="lab-unit">Birim</label>
            <input id="lab-unit" name="customUnit" placeholder="Örn. ng/mL" />
          </div>
        </>
      ) : null}
      <div className="field">
        <label htmlFor="lab-val">Değer</label>
        <input id="lab-val" name="value" inputMode="decimal" required />
      </div>
      <div className="field">
        <label htmlFor="lab-at">Tahlil tarihi</label>
        <input id="lab-at" name="takenAt" type="date" required defaultValue={defaultDate || todayISO()} />
      </div>
      <div className="field sm:col-span-2">
        <label htmlFor="lab-n">Not (isteğe bağlı)</label>
        <input id="lab-n" name="notes" />
      </div>
      <LabRefToggle key={marker} marker={marker} />
      <button className="btn btn-primary sm:col-span-2" type="submit" disabled={busy}>
        Değeri kaydet
      </button>
    </form>
  );
}

export function LabValuesBox({
  items,
  userId,
  staff,
  onChanged,
}: {
  items: LabValueRow[];
  userId?: number;
  staff?: boolean;
  onChanged: () => void;
}) {
  return (
    <div className={staff ? "mt-3" : "surface mt-4 p-5"}>
      <h3 className="text-sm font-medium">Kan değerini elle girin</h3>
      <p className="text-sm text-muted">
        Tahlil kâğıdındaki sayıları yazın. Listede yoksa Diğer’i seçin. Hatalıysa aşağıdan düzeltin.
      </p>
      {staff ? <StaffLabValueForm userId={userId} onSaved={onChanged} /> : null}
      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-muted">Sayısal değer yok.</li>
        ) : (
          items.map((v) => (
            <LabValueEditRow key={v.id} v={v} staff={!!staff} onChanged={onChanged} />
          ))
        )}
      </ul>
    </div>
  );
}

function LabValueEditRow({
  v,
  staff,
  onChanged,
}: {
  v: LabValueRow;
  staff: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = labMarkerMeta(v.marker);
  const flag = labOutOfRange(v.marker, Number(v.value), v.ref_min, v.ref_max);
  if (!staff) {
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          <span className="font-medium">{meta?.label ?? v.marker}</span>
          <span className="text-muted"> · {formatDateTr(v.taken_at)}</span>
        </span>
        <span className={flag ? "font-semibold text-warn" : ""}>
          {v.value} {v.unit}
          {flag === "high" ? " yüksek" : flag === "low" ? " düşük" : ""}
        </span>
      </li>
    );
  }
  if (editing) {
    return (
      <li className="rounded-xl border border-line p-3">
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const marker = String(fd.get("marker") || "");
            const value = Number(String(fd.get("value") || "").replace(",", "."));
            const takenAt = String(fd.get("takenAt") || "");
            if (!marker || !Number.isFinite(value) || !takenAt) {
              toast.error("Parametre, değer ve tarih gerekli.");
              return;
            }
            setBusy(true);
            try {
              const res = await updateLabValue({
                data: {
                  id: v.id,
                  marker,
                  value,
                  takenAt,
                  notes: String(fd.get("notes") || "") || undefined,
                  ...refsFromForm(fd),
                },
              });
              if (!res.ok) {
                toast.error(res.error ?? "Güncellenemedi.");
                return;
              }
              toast.success("Değer düzeltildi.");
              setEditing(false);
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field sm:col-span-2">
            <label>Parametre</label>
            <select name="marker" defaultValue={v.marker} required>
              {LAB_MARKERS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} {m.unit ? `(${m.unit})` : ""}
                </option>
              ))}
              {LAB_MARKERS.some((m) => m.key === v.marker) ? null : (
                <option value={v.marker}>{v.marker}</option>
              )}
            </select>
          </div>
          <div className="field">
            <label>Değer</label>
            <input name="value" inputMode="decimal" defaultValue={String(v.value)} required />
          </div>
          <div className="field">
            <label>Tahlil tarihi</label>
            <input name="takenAt" type="date" defaultValue={String(v.taken_at).slice(0, 10)} required />
          </div>
          <div className="field sm:col-span-2">
            <label>Not</label>
            <input name="notes" defaultValue={v.notes ?? ""} />
          </div>
          <LabRefToggle marker={v.marker} initialMin={v.ref_min} initialMax={v.ref_max} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Kaydediliyor…" : "Düzeltmeyi kaydet"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
          </div>
        </form>
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>
        <span className="font-medium">{meta?.label ?? v.marker}</span>
        <span className="text-muted">
          {" "}
          · {formatDateTr(v.taken_at)}
          {v.client_name ? ` · ${v.client_name}` : ""}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className={flag ? "font-semibold text-warn" : ""}>
          {v.value} {v.unit}
          {flag === "high" ? " yüksek" : flag === "low" ? " düşük" : ""}
        </span>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(true)}>
          Düzelt
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger"
          onClick={async () => {
            if (!window.confirm("Bu değer silinsin mi?")) return;
            await deleteLabValue({ data: { id: v.id } });
            toast.success("Silindi.");
            onChanged();
          }}
        >
          Sil
        </button>
      </span>
    </li>
  );
}
