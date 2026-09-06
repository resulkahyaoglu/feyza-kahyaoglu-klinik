import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { DailyTrack } from "@/components/daily-track";
import { FastingRing } from "@/components/fasting-ring";
import { FeedbackBox } from "@/components/feedback-box";
import { LabClientBox } from "@/components/lab-uploads";
import { OffplanComposer, OffplanHistory } from "@/components/offplan";
import { PackageBalanceBar } from "@/components/package-balance";
import { ProgressSection } from "@/components/progress-section";
import { DietTextToggle } from "@/components/diet-text";
import { StatusChip } from "@/components/status-chip";
import { cn } from "@/lib/utils";
import {
  cancelStamp,
  formatCm,
  formatDateTr,
  formatKg,
  formatPrice,
  panelGreeting,
  weekdayTr,
} from "@/lib/clinic";
import { downloadBase64, downloadDietPdf } from "@/lib/download";
import { isFastingEnabled } from "@/lib/fasting";
import {
  MEASURE_VISIT_NOTE,
  packageBalance,
  packageWarnText,
  type ClientPackage,
} from "@/lib/packages";
import {
  clientCancelAppointment,
  getDietPdfFile,
  loadClientPanel,
} from "@/lib/actions";

export const Route = createFileRoute("/panel/")({
  loader: async () => {
    const data = await loadClientPanel();
    if (!data.auth) throw redirect({ to: "/giris" });
    return data;
  },
  errorComponent: PanelError,
  component: ClientPanel,
});

function Fold({
  id,
  title,
  hint,
  aside,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <h2 className="text-2xl">{title}</h2>
          {hint && !open ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {aside}
          <ChevronDown className={cn("size-5 text-muted transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function PanelError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-wrap py-16">
      <h1 className="text-2xl">Panel açılmadı</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "Beklenmeyen bir hata."}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Tekrar dene
        </button>
        <Link to="/giris" className="btn btn-secondary">
          Girişe dön
        </Link>
      </div>
    </div>
  );
}

function ClientPanel() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [pendingCancel, setPendingCancel] = useState<number | null>(null);
  if (!data.auth) return null;
  const {
    user,
    diets,
    measures,
    ishape,
    appts,
    progress,
    nextAppt,
    newDiets,
    offplans,
    debtBalance,
    fasting,
    fastingToday,
    fastingLogs,
    packages,
    labs,
    dailyToday,
    labValues,
    mindfulToday,
  } = data;
  const hello = panelGreeting(user.full_name, user.gender);
  const pkgList = (packages as ClientPackage[] | undefined) ?? [];

  return (
    <ClientShell name={user.full_name}>
      <section id="bugun" className="scroll-mt-24">
        <h1 className="font-display text-2xl tracking-tight md:text-4xl">{hello}</h1>

        {nextAppt ? (
          <article className="surface mt-6 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Sonraki randevu</p>
            <p className="mt-1 font-display text-3xl">{formatDateTr(nextAppt.appointment_date)}</p>
            <p className="mt-1 text-lg">
              {nextAppt.appointment_time}{" "}
              <span className="text-sm text-muted">{weekdayTr(nextAppt.appointment_date)}</span>
            </p>
            <p className="mt-1 text-sm text-muted">{nextAppt.service_name}</p>
            {Number(nextAppt.is_measure) === 1 ? (
              <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">{MEASURE_VISIT_NOTE}</p>
            ) : null}
          </article>
        ) : null}

        {pkgList.length > 0 || debtBalance > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pkgList.map((p) => {
              const b = packageBalance(p);
              const warn = packageWarnText(p);
              return (
                <article key={p.id} className="surface p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">{p.title}</p>
                  <p className="mt-1 font-display text-3xl">
                    {b.done ? "Tamamlandı" : `Kalan ${b.remaining} ${b.unit}`}
                  </p>
                  <PackageBalanceBar pkg={p} />
                  {warn ? <p className="mt-2 text-sm text-warn">{warn}</p> : null}
                </article>
              );
            })}
            {debtBalance > 0 ? (
              <article className="rounded-[20px] bg-warn-soft p-5">
                <p className="text-xs font-medium text-warn">Açık bakiye</p>
                <p className="font-display text-3xl text-warn">{formatPrice(debtBalance)}</p>
                <p className="mt-1 text-sm text-warn">Klinikte görüşebilirsiniz; buradan ödeme alınmaz.</p>
              </article>
            ) : null}
          </div>
        ) : null}

        {isFastingEnabled(fasting) && fasting ? (
          <div className="mt-4">
            <FastingRing
              plan={fasting}
              todayLog={fastingToday}
              logs={fastingLogs ?? []}
              onChanged={() => void router.invalidate()}
            />
          </div>
        ) : null}

        <div className="mt-4">
          <DailyTrack
            today={dailyToday ?? null}
            meals={mindfulToday ?? []}
            weightKg={[...measures].find((m) => m.weight != null)?.weight ?? null}
            onSaved={() => void router.invalidate()}
          />
        </div>

        <OffplanComposer onSaved={async () => { await router.invalidate(); }} />
        <OffplanHistory items={offplans} onChanged={async () => { await router.invalidate(); }} />
      </section>

      <section id="diyet" className="mt-10 scroll-mt-24">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl">Diyet listeleri</h2>
          {newDiets ? <span className="chip chip-ok">{newDiets} yeni</span> : null}
        </div>
        {diets.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Henüz diyet listeniz yüklenmedi.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {diets.map((d) => (
              <article key={d.id} className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">
                      {d.title} {d.is_new === 1 ? <span className="chip chip-ok">Yeni</span> : null}
                      {Number(d.has_pdf) === 1 ? <span className="chip chip-off ml-1">PDF</span> : null}
                    </h3>
                    <p className="text-xs text-muted">{formatDateTr(d.created_at)}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={async () => {
                      if (Number(d.has_pdf) === 1) {
                        const file = await getDietPdfFile({ data: { id: d.id } });
                        if (!file.ok) {
                          toast.error("PDF bulunamadı.");
                          return;
                        }
                        downloadBase64(file.filename, file.mime, file.b64);
                        return;
                      }
                      downloadDietPdf({
                        title: d.title,
                        content: d.content,
                        clientName: user.full_name,
                        createdAt: d.created_at,
                      });
                    }}
                  >
                    PDF indir
                  </button>
                </div>
                <DietTextToggle dietId={d.id} text={d.content || ""} />
              </article>
            ))}
          </div>
        )}
      </section>

      <Fold
        id="randevu"
        title="Randevularınız"
        defaultOpen
        hint={
          appts.length === 0
            ? "Randevu kaydınız yok."
            : `${appts.length} kayıt · yeni randevu diyetisyeniniz planlar`
        }
      >
        <p className="text-sm text-muted">
          Randevularınızı buradan görürsünüz. Yeni randevu diyetisyeniniz tarafından planlanır.
        </p>
        <ul className="mt-4 space-y-2">
          {appts.length === 0 ? (
            <li className="text-sm text-muted">Randevu kaydınız yok.</li>
          ) : (
            appts.map((a) => (
              <li key={a.id} className="surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {formatDateTr(a.appointment_date)} {a.appointment_time} · {a.service_name}
                    </p>
                    <StatusChip status={a.status} />
                    {cancelStamp(a.cancelled_at, a.cancelled_by) ? (
                      <p className="mt-1 text-xs text-muted">
                        {cancelStamp(a.cancelled_at, a.cancelled_by)}
                      </p>
                    ) : null}
                  </div>
                  {a.status === "onaylandi" || a.status === "beklemede" ? (
                    pendingCancel === a.id ? (
                      <div className="max-w-sm rounded-xl bg-warn-soft p-3 text-sm text-warn">
                        <p>
                          İptal paketten düşmez. Gelmedi olarak işaretlemek diyetisyeninizdedir.
                          Onaylayınca WhatsApp açılır.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                              const res = await clientCancelAppointment({
                                data: { appointmentId: a.id },
                              });
                              if (!res.ok) {
                                toast.error(res.error);
                                return;
                              }
                              if (res.whatsapp) {
                                window.location.assign(res.whatsapp);
                                return;
                              }
                              toast.success("Randevu iptal edildi.");
                              setPendingCancel(null);
                              await router.invalidate();
                            }}
                          >
                            WhatsApp ile bildir
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setPendingCancel(null)}
                          >
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setPendingCancel(a.id)}
                      >
                        Gelemeyeceğim
                      </button>
                    )
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </Fold>

      <LabClientBox items={labs ?? []} values={labValues ?? []} onChanged={() => router.invalidate()} />

      <ProgressSection
        measures={measures}
        targetWeight={user.target_weight}
        progress={progress}
      />

      <Fold
        id="olcu"
        title="Vücut ölçüleri"
        hint={
          measures.length === 0
            ? "Henüz ölçü kaydınız yok."
            : `${measures.length} kayıt`
        }
      >
        {measures.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Henüz ölçü kaydınız yok.</p>
        ) : (
          <>
            <div className="mt-3 space-y-3 md:hidden">
              {measures.map((m) => (
                <div key={m.id} className="surface p-4 text-sm">
                  <p className="font-medium">{formatDateTr(m.measure_date)}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      ["Kilo", formatKg(m.weight)],
                      ["Boy", formatCm(m.height)],
                      ["BMI", m.bmi ?? "—"],
                      ["Bel", formatCm(m.waist)],
                      ["Göbek", formatCm(m.belly)],
                      ["Kalça", formatCm(m.hip)],
                      ["Sağ kol", formatCm(m.arm_right)],
                      ["Sol kol", formatCm(m.arm_left)],
                      ["Sağ bacak", formatCm(m.leg_right)],
                      ["Sol bacak", formatCm(m.leg_left)],
                    ].map(([lab, val]) => (
                      <div key={lab}>
                        <dt className="text-xs uppercase tracking-[0.12em] text-muted">{lab}</dt>
                        <dd>{val}</dd>
                      </div>
                    ))}
                  </dl>
                  {m.notes ? <p className="mt-3 text-ink-soft">{m.notes}</p> : null}
                </div>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="py-2">Tarih</th>
                    <th>Kilo</th>
                    <th>Boy</th>
                    <th>BMI</th>
                    <th>Bel</th>
                    <th>Göbek</th>
                    <th>Kalça</th>
                    <th>Sağ kol</th>
                    <th>Sol kol</th>
                    <th>Sağ bacak</th>
                    <th>Sol bacak</th>
                  </tr>
                </thead>
                <tbody>
                  {measures.map((m) => (
                    <tr key={m.id} className="border-t border-line">
                      <td className="py-2">{formatDateTr(m.measure_date)}</td>
                      <td>{formatKg(m.weight)}</td>
                      <td>{m.height ?? "—"}</td>
                      <td>{m.bmi ?? "—"}</td>
                      <td>{m.waist ?? "—"}</td>
                      <td>{m.belly ?? "—"}</td>
                      <td>{m.hip ?? "—"}</td>
                      <td>{m.arm_right ?? "—"}</td>
                      <td>{m.arm_left ?? "—"}</td>
                      <td>{m.leg_right ?? "—"}</td>
                      <td>{m.leg_left ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Fold>

      {user.has_ishape === 1 ? (
        <Fold
          id="ems"
          title="i-Shape EMS"
          hint={
            ishape.length === 0 ? "Henüz EMS seans kaydınız yok." : `${ishape.length} seans`
          }
        >
          {ishape.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Henüz EMS seans kaydınız yok.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {ishape.map((s) => (
                <li key={s.id} className="surface p-4 text-sm">
                  <p className="font-medium">{formatDateTr(s.session_date)}</p>
                  <p className="text-muted">
                    {s.calories ?? "—"} kcal · {s.duration_min ?? "—"} dk
                    {s.notes ? ` · ${s.notes}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Fold>
      ) : null}

      <div className="mt-10">
        <FeedbackBox />
      </div>

      <p className="mt-10 text-sm">
        <Link to="/panel/mesaj" className="text-brand">
          Mesajlar
        </Link>
        {" · "}
        <Link to="/panel/profil" className="text-brand">
          Profil
        </Link>
      </p>
    </ClientShell>
  );
}
