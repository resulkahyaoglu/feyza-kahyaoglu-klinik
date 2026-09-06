import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { LabValuesBox } from "@/components/daily-track";
import { LabStaffList } from "@/components/lab-uploads";
import { loadLabReport } from "@/lib/actions";
import { formatDateTr } from "@/lib/clinic";
import { eatTriggerLabel, labMarkerMeta, labOutOfRange, waterTargetMl } from "@/lib/wellness";

export const Route = createFileRoute("/admin/tahliller")({
  loader: async () => {
    const data = await loadLabReport();
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: TahlillerPage,
});

function TahlillerPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;
  const s = data.stats;
  const logs = data.todayLogs ?? [];
  const lowWater = logs.filter((row) => {
    const target = waterTargetMl(row.weight);
    return Number(row.water_ml) < target * 0.7;
  });
  const shortSleep = logs.filter((row) => row.sleep_hours != null && Number(row.sleep_hours) < 6);
  const highStress = logs.filter((row) => row.stress != null && Number(row.stress) >= 4);
  const flagged = (data.labValues ?? []).filter((v) =>
    labOutOfRange(v.marker, Number(v.value), v.ref_min, v.ref_max),
  );

  return (
    <AdminShell title="Takip">
      <p className="text-sm text-muted">
        Bugün kime bakmalısınız. Ortalama yok; isimler var. Kan değerleri tanı değildir.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Bugün yazan</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{logs.length}</p>
        </article>
        <article className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Takibi bırakan</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{(data.skipped ?? []).length}</p>
        </article>
        <article className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Suyu az</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{lowWater.length}</p>
        </article>
        <article className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Ref. dışı kan</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{flagged.length}</p>
        </article>
      </div>

      <section className="mt-8">
        <h2 className="text-xl">Bugün suyu hedefin altında</h2>
        <p className="mt-1 text-sm text-muted">Hedefin %70’inden az içenler. Son kiloya göre kg × 30 ml.</p>
        {lowWater.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bugün yazanlarda düşük su yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lowWater.map((row) => {
              const target = waterTargetMl(row.weight);
              return (
                <li key={row.id} className="surface flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                  <Link to="/admin/danisan/$id" params={{ id: String(row.id) }} className="font-medium">
                    {row.full_name}
                  </Link>
                  <span className="text-warn">
                    {row.water_ml} / {target} ml
                    {Number(row.sweaty) === 1 ? " · terleme" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Az uyku / yüksek stres</h2>
        {shortSleep.length === 0 && highStress.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bugün yazanlarda 6 saatten az uyku veya stres 4–5 yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {[...shortSleep, ...highStress.filter((r) => !shortSleep.some((s) => s.id === r.id))].map((row) => (
              <li key={row.id} className="surface flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                <Link to="/admin/danisan/$id" params={{ id: String(row.id) }} className="font-medium">
                  {row.full_name}
                </Link>
                <span className="text-muted">
                  {row.sleep_hours != null && Number(row.sleep_hours) < 6 ? `uyku ${row.sleep_hours} sa` : ""}
                  {row.sleep_hours != null && Number(row.sleep_hours) < 6 && row.stress != null && Number(row.stress) >= 4
                    ? " · "
                    : ""}
                  {row.stress != null && Number(row.stress) >= 4 ? `stres ${row.stress}/5` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Bu hafta duygusal yeme</h2>
        <p className="mt-1 text-sm text-muted">Stres, sıkıntı veya ödül diye kaydedilen öğünler.</p>
        {(data.emotionalWeek ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bu hafta yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.emotionalWeek.map((row) => (
              <li key={row.id} className="surface flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                <Link to="/admin/danisan/$id" params={{ id: String(row.id) }} className="font-medium">
                  {row.full_name}
                </Link>
                <span className="text-muted">
                  {row.n} öğün
                  {row.last_trigger ? ` · son: ${eatTriggerLabel(row.last_trigger)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Yazıyordu, bugün yazmadı</h2>
        <p className="mt-1 text-sm text-muted">Son 7 günde kayıt var, bugün yok. Hiç kullanmayanlar listelenmez.</p>
        {(data.skipped ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">Takibi bırakan yok.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.skipped.map((u) => (
              <li key={u.id}>
                <Link to="/admin/danisan/$id" params={{ id: String(u.id) }} className="chip chip-off">
                  {u.full_name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Referans dışı kan değerleri</h2>
        {flagged.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Dışarıda değer yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {flagged.map((v) => {
              const meta = labMarkerMeta(v.marker);
              const flag = labOutOfRange(v.marker, Number(v.value), v.ref_min, v.ref_max);
              return (
                <li key={v.id} className="surface flex flex-wrap items-baseline justify-between gap-2 p-4 text-sm">
                  <span>
                    <Link to="/admin/danisan/$id" params={{ id: String(v.user_id) }} className="font-medium">
                      {v.client_name}
                    </Link>
                    <span className="text-muted">
                      {" "}
                      · {meta?.label} · {formatDateTr(v.taken_at)}
                    </span>
                  </span>
                  <span className="font-semibold text-warn">
                    {v.value} {v.unit} {flag === "high" ? "yüksek" : "düşük"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Kan değeri gir</h2>
        <p className="mt-1 text-sm text-muted">
          Tahlil kâğıdından danışan seçip parametreyi yazın. Dosya yüklemek zorunlu değil.
        </p>
        <LabValuesBox items={data.labValues ?? []} staff onChanged={() => router.invalidate()} />
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Yüklenen tahlil dosyaları</h2>
        <p className="mt-1 text-sm text-muted">
          Bu ay {s.month_n} dosya · toplam {s.total} ({s.pdf_n} PDF / {s.image_n} foto).
        </p>
        <LabStaffList items={data.rows} showClient onChanged={() => router.invalidate()} />
      </section>
    </AdminShell>
  );
}
