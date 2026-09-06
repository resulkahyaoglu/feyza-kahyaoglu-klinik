import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { FastingAdmin } from "@/components/fasting-admin";
import { LabValuesBox, LabTrendView } from "@/components/daily-track";
import { LabStaffList } from "@/components/lab-uploads";
import { PackageAdmin } from "@/components/package-admin";
import { OffplanList } from "@/components/offplan";
import { StatusChip } from "@/components/status-chip";
import {
  PAYMENT_METHODS,
  CLINIC,
  SERVICES,
  TIME_SLOTS,
  displayPhone,
  formatDateTr,
  formatDateTimeTr,
  formatKg,
  formatPrice,
  cancelStamp,
  paymentMethodLabel,
  reminderMessage,
  todayISO,
  weekdayTr,
  weeklyDates,
  whatsappLink,
  isUpcomingSlot,
} from "@/lib/clinic";
import { downloadBase64 } from "@/lib/download";
import { eatTriggerLabel, mindfulSlotLabel } from "@/lib/wellness";
import {
  addDiet,
  addDebt,
  addIshape,
  addMeasurement,
  addPayment,
  adminCreateAppointments,
  deleteClient,
  deleteDebt,
  deleteDiet,
  deleteFeedback,
  deleteIshape,
  deleteMeasurement,
  deletePayment,
  getDietPdfFile,
  sendAdminMessage,
  loadClientDetail,
  toggleAppointmentMeasure,
  updateClientProfile,
} from "@/lib/actions";

export const Route = createFileRoute("/admin/danisan/$id")({
  loader: async ({ params }) => {
    const data = await loadClientDetail({ data: { id: Number(params.id) } });
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: ClientDetail,
});

function ClientDetail() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [apptDate, setApptDate] = useState(todayISO());
  const [apptTime, setApptTime] = useState("14:00");
  const [apptWeeks, setApptWeeks] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingPay, setPendingPay] = useState<number | null>(null);
  const [pendingDebt, setPendingDebt] = useState<number | null>(null);
  const [pendingMeasure, setPendingMeasure] = useState<number | null>(null);
  const [pendingIshape, setPendingIshape] = useState<number | null>(null);
  const [pendingDiet, setPendingDiet] = useState<number | null>(null);
  const [dietBusy, setDietBusy] = useState(false);
  const [dietBusyLabel, setDietBusyLabel] = useState("Yükleniyor…");
  const previewDates = useMemo(
    () => (apptDate ? weeklyDates(apptDate, apptWeeks) : []),
    [apptDate, apptWeeks],
  );
  if (!data.auth) return null;
  if (data.missing) {
    return (
      <AdminShell title="Danışan">
        <p className="text-muted">Danışan bulunamadı.</p>
      </AdminShell>
    );
  }
  const {
    user,
    diets,
    measures,
    ishape,
    messages,
    appts,
    payments,
    offplans,
    feedback,
    fasting,
    fastingLogs,
    packages,
    labs,
    dailyLogs,
    labValues,
    mindfulMeals,
    debts,
    debtBalance,
    role,
    pendingPayments,
    pendingDebts,
  } = data;
  const isOwner = role === "admin";
  const nextUpcoming =
    [...appts]
      .filter(
        (a) =>
          (a.status === "onaylandi" || a.status === "beklemede") &&
          isUpcomingSlot(a.appointment_date, a.appointment_time),
      )
      .sort((a, b) =>
        `${a.appointment_date.slice(0, 10)} ${a.appointment_time}`.localeCompare(
          `${b.appointment_date.slice(0, 10)} ${b.appointment_time}`,
        ),
      )[0] ?? null;
  const wa = (
    kind: "diet" | "appointment" | "measure" | "generic",
    extra?: { title?: string },
  ) =>
    whatsappLink(
      user.phone,
      reminderMessage(kind, user.full_name, {
        ...extra,
        gender: user.gender,
        date: nextUpcoming ? formatDateTr(nextUpcoming.appointment_date) : undefined,
        time: nextUpcoming?.appointment_time,
        isMeasure: Number(nextUpcoming?.is_measure) === 1,
      }),
    );

  return (
    <AdminShell title={user.full_name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {displayPhone(user.phone)}
          {user.email ? ` · ${user.email}` : ""}
          {debtBalance > 0 ? (
            <span className="ml-2 chip chip-wait">Borçlu · {formatPrice(debtBalance)}</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-sm btn-secondary" href={wa("diet")} target="_blank" rel="noreferrer">
            Diyet listesi bildir
          </a>
          <a className="btn btn-sm btn-secondary" href={wa("appointment")} target="_blank" rel="noreferrer">
            Randevu hatırlat
          </a>
          <a className="btn btn-sm btn-secondary" href={wa("measure")} target="_blank" rel="noreferrer">
            Ölçüm bildir
          </a>
          {isOwner ? (
          confirmDelete ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={async () => {
                  try {
                    const res = await deleteClient({ data: { id: user.id } });
                    if (!res.ok) {
                      toast.error(res.error ?? "Silinemedi.");
                      return;
                    }
                    toast.success(`${res.name} silindi.`);
                    await navigate({ to: "/admin/danisanlar" });
                  } catch {
                    toast.error("Silinemedi.");
                  }
                }}
              >
                Evet, sil
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setConfirmDelete(false)}
              >
                Vazgeç
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Danışanı sil
            </button>
          )
          ) : null}
        </div>
      </div>

      <div className="mt-8">
        <FastingAdmin
          userId={user.id}
          plan={fasting}
          logs={fastingLogs ?? []}
          onSaved={() => router.invalidate()}
        />
      </div>

      <div className="mt-8">
        <PackageAdmin
          userId={user.id}
          packages={packages ?? []}
          onSaved={() => router.invalidate()}
        />
      </div>

      <section className="surface mt-8 p-5">
        <h2 className="text-lg">Tahliller</h2>
        <p className="text-sm text-muted">Danışanın yüklediği PDF veya fotoğraf.</p>
        <LabStaffList items={labs ?? []} onChanged={() => router.invalidate()} />
        <LabValuesBox
          items={labValues ?? []}
          userId={user.id}
          staff
          onChanged={() => router.invalidate()}
        />
        <LabTrendView items={labValues ?? []} />
      </section>
      {(dailyLogs ?? []).length > 0 || (mindfulMeals ?? []).length > 0 ? (
        <section className="surface mt-8 p-5">
          <h2 className="text-lg">Günlük takip</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(dailyLogs ?? []).slice(0, 14).map((row) => (
              <li key={`d-${row.id}`} className="rounded-xl border border-line px-3 py-2">
                {formatDateTr(row.log_date)} · su {row.water_ml} ml
                {Number(row.sweaty) === 1 ? " · terleme" : ""}
                {row.sleep_hours != null ? ` · uyku ${row.sleep_hours} sa` : ""}
                {row.stress ? ` · stres ${row.stress}` : ""}
              </li>
            ))}
            {(mindfulMeals ?? []).slice(0, 20).map((m) => (
              <li key={`m-${m.id}`} className="rounded-xl border border-line px-3 py-2">
                {formatDateTr(m.log_date)} · {mindfulSlotLabel(m.slot)} · önce {m.hunger_before}/10 · sonra{" "}
                {m.hunger_after ?? "—"}/10
                {m.eat_trigger ? ` · ${eatTriggerLabel(m.eat_trigger)}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="surface space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const tw = String(fd.get("targetWeight") || "");
            await updateClientProfile({
              data: {
                id: user.id,
                fullName: String(fd.get("fullName") || ""),
                email: String(fd.get("email") || ""),
                notes: String(fd.get("notes") || ""),
                targetWeight: tw ? Number(tw) : null,
                gender:
                  String(fd.get("gender") || "") === "erkek"
                    ? "erkek"
                    : String(fd.get("gender") || "") === "kadin"
                      ? "kadin"
                      : null,
                hasIshape: fd.get("hasIshape") === "on",
                isActive: fd.get("isActive") === "on",
                password: isOwner ? String(fd.get("password") || "") || undefined : undefined,
              },
            });
            toast.success("Profil güncellendi.");
            await router.invalidate();
          }}
        >
          <h2 className="text-lg">Profil</h2>
          <div className="field">
            <label htmlFor="fullName">Ad soyad</label>
            <input id="fullName" name="fullName" defaultValue={user.full_name} />
          </div>
          <div className="field">
            <span>Cinsiyet</span>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  value="kadin"
                  defaultChecked={user.gender === "kadin"}
                  required
                  className="accent-brand"
                />
                Kadın
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  value="erkek"
                  defaultChecked={user.gender === "erkek"}
                  className="accent-brand"
                />
                Erkek
              </label>
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input id="email" name="email" defaultValue={user.email ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="targetWeight">Hedef kilo</label>
            <input
              id="targetWeight"
              name="targetWeight"
              type="number"
              step="0.1"
              defaultValue={user.target_weight ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="notes">Not</label>
            <textarea id="notes" name="notes" defaultValue={user.notes ?? ""} />
          </div>
          {isOwner ? (
          <div className="field">
            <label htmlFor="password">Yeni şifre (boş bırakın)</label>
            <input id="password" name="password" autoComplete="new-password" />
          </div>
          ) : (
            <p className="text-sm text-muted">Şifre değişikliği yalnızca yöneticide (Şifrelerim).</p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasIshape" defaultChecked={user.has_ishape === 1} className="size-4 accent-brand" />
            i-Shape EMS açık
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={user.is_active === 1} className="size-4 accent-brand" />
            Aktif
          </label>
          <p className="text-xs text-muted">Giriş telefonu: {displayPhone(user.phone)}</p>
          <button className="btn btn-primary" type="submit">
            Kaydet
          </button>
        </form>

        <form
          className="surface space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const text = String(fd.get("message") || "").trim();
            if (!text) return;
            await sendAdminMessage({ data: { userId: user.id, message: text } });
            toast.success("Mesaj gönderildi.");
            form.reset();
            await router.invalidate();
          }}
        >
          <h2 className="text-lg">Mesajlar</h2>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl bg-sand p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">Henüz mesaj yok.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.sender === "admin"
                      ? "ml-6 rounded-2xl bg-brand px-3 py-2 text-sm text-sand"
                      : "mr-6 rounded-2xl bg-cream px-3 py-2 text-sm"
                  }
                >
                  <p>{m.message}</p>
                  <p className="mt-1 text-[10px] opacity-70">{formatDateTr(m.created_at)}</p>
                </div>
              ))
            )}
          </div>
          <div className="field">
            <label htmlFor="message">Yeni mesaj</label>
            <textarea id="message" name="message" required />
          </div>
          <button className="btn btn-primary" type="submit">
            Gönder
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="text-lg">Görüş ve öneriler</h2>
        {feedback.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Bu danışandan henüz görüş yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {feedback.map((row) => (
              <li key={row.id} className="surface p-4">
                <p className="whitespace-pre-wrap text-sm text-ink-soft">{row.message}</p>
                <p className="mt-2 text-xs text-muted">{formatDateTimeTr(row.created_at)}</p>
                <button
                  type="button"
                  className="btn btn-sm btn-danger mt-2"
                  onClick={async () => {
                    if (!window.confirm("Bu görüş silinsin mi?")) return;
                    await deleteFeedback({ data: { id: row.id } });
                    toast.success("Silindi.");
                    await router.invalidate();
                  }}
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg">Plan dışı öğünler</h2>
        <OffplanList
          items={offplans}
          empty="Kayıt yok."
          canDownload
          canDelete
          onChanged={() => router.invalidate()}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="surface space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const files = fd
              .getAll("pdf")
              .filter((x): x is File => x instanceof File && x.size > 0);
            for (const file of files) {
              const isPdf =
                file.type === "application/pdf" ||
                file.type === "application/x-pdf" ||
                file.type === "application/octet-stream" ||
                file.name.toLowerCase().endsWith(".pdf");
              if (!isPdf) {
                toast.error(`${file.name}: yalnızca PDF yükleyin.`);
                return;
              }
              if (file.size > 8 * 1024 * 1024) {
                toast.error(`${file.name}: en fazla 8 MB olmalı.`);
                return;
              }
            }
            const content = String(fd.get("content") || "");
            const title = String(fd.get("title") || "").trim();
            if (!title) {
              toast.error("Başlık gerekli.");
              return;
            }
            if (!content.trim() && files.length === 0) {
              toast.error("Metin yazın veya PDF yükleyin.");
              return;
            }
            setDietBusy(true);
            try {
              if (files.length === 0) {
                const payload = new FormData();
                payload.set("userId", String(user.id));
                payload.set("title", title);
                payload.set("content", content);
                const res = await addDiet({ data: payload });
                if (!res.ok) {
                  toast.error(("error" in res && res.error) || "Kaydedilemedi.");
                  return;
                }
                toast.success("Diyet listesi eklendi.");
              } else {
                let ok = 0;
                const failed: string[] = [];
                for (let i = 0; i < files.length; i++) {
                  const file = files[i]!;
                  setDietBusyLabel(`${i + 1} / ${files.length} yükleniyor…`);
                  const payload = new FormData();
                  payload.set("userId", String(user.id));
                  payload.set(
                    "title",
                    files.length === 1 ? title : `${title} · ${file.name.replace(/\.pdf$/i, "")}`,
                  );
                  payload.set("content", i === 0 ? content : "");
                  payload.set("pdf", file);
                  try {
                    const res = await addDiet({ data: payload });
                    if (!res.ok) {
                      failed.push(`${file.name}: ${("error" in res && res.error) || "hata"}`);
                    } else {
                      ok += 1;
                    }
                  } catch {
                    failed.push(`${file.name}: yüklenemedi`);
                  }
                }
                if (ok) toast.success(ok === 1 ? "PDF eklendi." : `${ok} PDF eklendi.`);
                if (failed.length) toast.error(failed.join(" · "));
              }
              form.reset();
              await router.invalidate();
            } catch (err) {
              toast.error(
                err instanceof Error && err.message
                  ? err.message
                  : "PDF yüklenemedi. Dosyayı küçültüp tekrar deneyin.",
              );
            } finally {
              setDietBusy(false);
              setDietBusyLabel("Yükleniyor…");
            }
          }}
        >
          <h2 className="text-lg">Diyet listesi ekle</h2>
          <div className="field">
            <label htmlFor="title">Başlık</label>
            <input id="title" name="title" required />
          </div>
          <div className="field">
            <label htmlFor="pdf">PDF yükle (birden fazla seçebilirsiniz, her biri en fazla 8 MB)</label>
            <input id="pdf" name="pdf" type="file" accept="application/pdf,.pdf" multiple />
          </div>
          <div className="field">
            <label htmlFor="content">Metin (isteğe bağlı)</label>
            <textarea id="content" name="content" className="min-h-40" placeholder="PDF yüklüyorsanız boş bırakabilirsiniz." />
          </div>
          <button className="btn btn-primary" type="submit" disabled={dietBusy}>
            {dietBusy ? dietBusyLabel : "Listeyi kaydet"}
          </button>
        </form>
        <div className="space-y-3">
          {diets.length === 0 ? (
            <p className="text-sm text-muted">Henüz liste yok.</p>
          ) : (
            diets.map((d) => (
              <article key={d.id} className="surface p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">
                      {d.title}{" "}
                      {d.is_new === 1 ? <span className="chip chip-ok">Yeni</span> : null}
                      {Number(d.has_pdf) === 1 ? (
                        <span className="chip chip-off ml-1">PDF</span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-muted">{formatDateTr(d.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {Number(d.has_pdf) === 1 ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={async () => {
                          const file = await getDietPdfFile({ data: { id: d.id } });
                          if (!file.ok) {
                            toast.error("PDF bulunamadı.");
                            return;
                          }
                          downloadBase64(file.filename, file.mime, file.b64);
                        }}
                      >
                        PDF indir
                      </button>
                    ) : null}
                    <a
                      className="btn btn-sm btn-secondary"
                      href={wa("diet", { title: d.title })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      WhatsApp bildir
                    </a>
                    {pendingDiet === d.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            const res = await deleteDiet({ data: { id: d.id } });
                            if (!res.ok) {
                              toast.error(("error" in res && res.error) || "Silinemedi.");
                              return;
                            }
                            toast.success("Liste silindi.");
                            setPendingDiet(null);
                            await router.invalidate();
                          }}
                        >
                          Evet, sil
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setPendingDiet(null)}
                        >
                          Vazgeç
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingDiet(d.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </div>
                {Number(d.has_pdf) === 1 ? null : d.content ? (
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink-soft">
                    {d.content}
                  </pre>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="surface grid grid-cols-2 gap-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const n = (k: string) => {
              const v = String(fd.get(k) || "");
              return v ? Number(v) : undefined;
            };
            await addMeasurement({
              data: {
                userId: user.id,
                measureDate: String(fd.get("measureDate") || todayISO()),
                weight: n("weight"),
                height: n("height"),
                waist: n("waist"),
                belly: n("belly"),
                hip: n("hip"),
                armRight: n("armRight"),
                armLeft: n("armLeft"),
                legRight: n("legRight"),
                legLeft: n("legLeft"),
                notes: String(fd.get("mnotes") || ""),
              },
            });
            toast.success("Ölçü kaydedildi.");
            form.reset();
            await router.invalidate();
          }}
        >
          <h2 className="col-span-2 text-lg">Ölçü ekle</h2>
          <div className="field col-span-2">
            <label htmlFor="measureDate">Tarih</label>
            <input id="measureDate" name="measureDate" type="date" defaultValue={todayISO()} required />
          </div>
          {[
            ["weight", "Kilo"],
            ["height", "Boy (cm)"],
            ["waist", "Bel"],
            ["belly", "Göbek"],
            ["hip", "Kalça"],
            ["armRight", "Sağ kol"],
            ["armLeft", "Sol kol"],
            ["legRight", "Sağ bacak"],
            ["legLeft", "Sol bacak"],
          ].map(([k, lab]) => (
            <div className="field" key={k}>
              <label htmlFor={k}>{lab}</label>
              <input id={k} name={k} type="number" step="0.1" />
            </div>
          ))}
          <div className="field col-span-2">
            <label htmlFor="mnotes">Not</label>
            <input id="mnotes" name="mnotes" />
          </div>
          <button className="btn btn-primary col-span-2" type="submit">
            Ölçüyü kaydet
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="py-2">Tarih</th>
                <th>Kilo</th>
                <th>BMI</th>
                <th>Bel</th>
                <th>Göbek</th>
                <th>Kalça</th>
                <th>Sağ kol</th>
                <th>Sol kol</th>
                <th>Sağ bacak</th>
                <th>Sol bacak</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {measures.map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="py-2">{formatDateTr(m.measure_date)}</td>
                  <td>{formatKg(m.weight)}</td>
                  <td>{m.bmi ?? "—"}</td>
                  <td>{m.waist ?? "—"}</td>
                  <td>{m.belly ?? "—"}</td>
                  <td>{m.hip ?? "—"}</td>
                  <td>{m.arm_right ?? "—"}</td>
                  <td>{m.arm_left ?? "—"}</td>
                  <td>{m.leg_right ?? "—"}</td>
                  <td>{m.leg_left ?? "—"}</td>
                  <td className="whitespace-nowrap py-2">
                    {pendingMeasure === m.id ? (
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            const res = await deleteMeasurement({ data: { id: m.id } });
                            if (!res.ok) {
                              toast.error(res.error ?? "Silinemedi.");
                              return;
                            }
                            toast.success("Ölçü silindi.");
                            setPendingMeasure(null);
                            await router.invalidate();
                          }}
                        >
                          Evet, sil
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setPendingMeasure(null)}
                        >
                          Vazgeç
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingMeasure(m.id)}
                      >
                        Sil
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {measures.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Ölçü yok.</p>
          ) : null}
        </div>
      </section>

      {user.has_ishape === 1 ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <form
            className="surface space-y-3 p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const n = (k: string) => {
                const v = String(fd.get(k) || "");
                return v ? Number(v) : undefined;
              };
              await addIshape({
                data: {
                  userId: user.id,
                  sessionDate: String(fd.get("sessionDate") || todayISO()),
                  calories: n("calories"),
                  durationMin: n("durationMin"),
                  notes: String(fd.get("inotes") || ""),
                },
              });
              toast.success("i-Shape seansı eklendi.");
              form.reset();
              await router.invalidate();
            }}
          >
            <h2 className="text-lg">i-Shape EMS seansı</h2>
            <div className="field">
              <label htmlFor="sessionDate">Tarih</label>
              <input id="sessionDate" name="sessionDate" type="date" defaultValue={todayISO()} required />
            </div>
            <div className="field">
              <label htmlFor="calories">E-Kcal (kcal)</label>
              <input id="calories" name="calories" type="number" placeholder="Cihazın bildirdiği kalori" />
            </div>
            <div className="field">
              <label htmlFor="durationMin">Süre (dk)</label>
              <input id="durationMin" name="durationMin" type="number" defaultValue={25} />
            </div>
            <div className="field">
              <label htmlFor="inotes">Not</label>
              <input id="inotes" name="inotes" />
            </div>
            <button className="btn btn-primary" type="submit">
              Seansı kaydet
            </button>
          </form>
          <ul className="space-y-2">
            {ishape.length === 0 ? (
              <li className="surface p-4 text-sm text-muted">Kayıtlı EMS seansı yok.</li>
            ) : (
              ishape.map((s) => (
                <li key={s.id} className="surface flex items-start justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium">{formatDateTr(s.session_date)}</p>
                    <p className="text-muted">
                      {s.calories ?? "—"} kcal · {s.duration_min ?? "—"} dk
                    </p>
                    {s.notes ? <p>{s.notes}</p> : null}
                  </div>
                  {pendingIshape === s.id ? (
                    <span className="inline-flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          const res = await deleteIshape({ data: { id: s.id } });
                          if (!res.ok) {
                            toast.error(res.error ?? "Silinemedi.");
                            return;
                          }
                          toast.success("EMS seansı silindi.");
                          setPendingIshape(null);
                          await router.invalidate();
                        }}
                      >
                        Evet, sil
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setPendingIshape(null)}
                      >
                        Vazgeç
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger shrink-0"
                      onClick={() => setPendingIshape(s.id)}
                    >
                      Sil
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg">Randevular</h2>
        <form
          className="surface mt-3 grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const weeks = Number(fd.get("weeks") || 1);
            try {
              const res = await adminCreateAppointments({
                data: {
                  userId: user.id,
                  serviceKey: String(fd.get("serviceKey") || ""),
                  date: String(fd.get("date") || ""),
                  time: String(fd.get("time") || ""),
                  weeks,
                  notes: String(fd.get("anotes") || ""),
                  isMeasure: fd.get("isMeasure") === "on",
                },
              });
              if (!res.ok) {
                toast.error(res.error ?? "Eklenemedi.");
                return;
              }
              toast.success(
                res.count === 1
                  ? "Randevu eklendi."
                  : `${res.count} haftalık randevu eklendi.`,
              );
              form.reset();
              setApptDate(todayISO());
              setApptTime("14:00");
              setApptWeeks(1);
              await router.invalidate();
            } catch {
              toast.error("Eklenemedi. Tekrar deneyin.");
            }
          }}
        >
          <h3 className="sm:col-span-2 text-base font-medium">Manuel randevu ekle</h3>
          <div className="field sm:col-span-2">
            <label htmlFor="serviceKey">Hizmet</label>
            <select id="serviceKey" name="serviceKey" required>
              {SERVICES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="date">Tarih</label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="time">Saat</label>
            <select
              id="time"
              name="time"
              required
              value={apptTime}
              onChange={(e) => setApptTime(e.target.value)}
            >
              {TIME_SLOTS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="weeks">Hafta sayısı</label>
            <select
              id="weeks"
              name="weeks"
              value={apptWeeks}
              onChange={(e) => setApptWeeks(Number(e.target.value))}
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} hafta
                </option>
              ))}
            </select>
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="anotes">Not</label>
            <input id="anotes" name="anotes" />
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="isMeasure" className="accent-brand" />
            Bu seansta ölçüm var
          </label>
          {previewDates.length ? (
            <p className="sm:col-span-2 text-sm text-muted">
              {weekdayTr(previewDates[0]!)} {apptTime}
              {" · "}
              {previewDates.length} seans:{" "}
              {previewDates.map((d) => formatDateTr(d)).join(", ")}
            </p>
          ) : null}
          <button className="btn btn-primary sm:col-span-2" type="submit">
            {apptWeeks === 1 ? "Randevuyu ekle" : `${apptWeeks} haftayı ekle`}
          </button>
        </form>
        <ul className="mt-3 space-y-2">
          {appts.length === 0 ? (
            <li className="text-sm text-muted">Randevu yok.</li>
          ) : (
            appts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm">
                <span>
                  {formatDateTr(a.appointment_date)} {weekdayTr(a.appointment_date)} {a.appointment_time} · {a.service_name}
                  {Number(a.is_measure) === 1 ? (
                    <span className="ml-2 chip chip-wait">Ölçüm</span>
                  ) : null}
                  {cancelStamp(a.cancelled_at, a.cancelled_by) ? (
                    <span className="mt-0.5 block text-xs font-medium text-warn">
                      {cancelStamp(a.cancelled_at, a.cancelled_by)}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={async () => {
                      await toggleAppointmentMeasure({
                        data: { id: a.id, isMeasure: Number(a.is_measure) !== 1 },
                      });
                      await router.invalidate();
                    }}
                  >
                    {Number(a.is_measure) === 1 ? "Ölçümü kaldır" : "Ölçüm günü"}
                  </button>
                  <StatusChip status={a.status} />
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="surface grid gap-3 p-5 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const res = await addPayment({
              data: {
                userId: user.id,
                paidAt: String(fd.get("paidAt") || todayISO()),
                amount: Number(fd.get("amount")),
                method: String(fd.get("method")) as "nakit" | "kredi-karti" | "havale" | "diger",
                notes: String(fd.get("pnotes") || ""),
                applyToDebt: fd.get("applyDebt") === "on",
              },
            });
            if (!res.ok) {
              toast.error(res.error ?? "Kaydedilemedi.");
              return;
            }
            toast.success("Ödeme kaydedildi.");
            form.reset();
            await router.invalidate();
          }}
        >
          <h2 className="col-span-2 text-lg">Ödeme kaydet</h2>
          <p className="col-span-2 text-sm text-muted">
            Sadece yönetim görür. Danışan panelinde görünmez.
          </p>
          <div className="field">
            <label htmlFor="paidAt">Tarih</label>
            <input id="paidAt" name="paidAt" type="date" defaultValue={todayISO()} required />
          </div>
          <div className="field">
            <label htmlFor="amount">Tutar (TL)</label>
            <input id="amount" name="amount" type="number" min="1" step="1" required />
          </div>
          <div className="field">
            <label htmlFor="method">Yöntem</label>
            <select id="method" name="method" required defaultValue="nakit">
              {PAYMENT_METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pnotes">Not</label>
            <input id="pnotes" name="pnotes" placeholder="Seans, paket…" />
          </div>
          {debtBalance > 0 ? (
            <label className="col-span-2 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" name="applyDebt" defaultChecked className="size-4 accent-[var(--color-brand)]" />
              Borçtan düş (kalan {formatPrice(debtBalance)})
            </label>
          ) : null}
          <button className="btn btn-primary col-span-2" type="submit">
            Ödemeyi kaydet
          </button>
        </form>
        <div>
          <h2 className="text-lg">Ödemeler</h2>
          <ul className="mt-3 space-y-2">
            {payments.length === 0 ? (
              <li className="text-sm text-muted">Ödeme yok.</li>
            ) : (
              payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
                >
                  <span>
                    {formatDateTr(p.paid_at)} · {paymentMethodLabel(p.method)}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="stat-num">{formatPrice(p.amount)}</span>
                    {role === "assistant" && pendingPayments.includes(p.id) ? (
                      <span className="chip chip-wait">Yönetici onayında</span>
                    ) : pendingPay === p.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            const res = await deletePayment({ data: { id: p.id } });
                            toast.success(
                              res.pending ? "Silme isteği yöneticiye iletildi." : "Ödeme silindi.",
                            );
                            setPendingPay(null);
                            await router.invalidate();
                          }}
                        >
                          Evet, sil
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setPendingPay(null)}
                        >
                          Vazgeç
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingPay(p.id)}
                      >
                        Sil
                      </button>
                    )}
                  </span>
                </li>
              ))
            )}
          </ul>
          <p className="mt-3 text-sm">
            <Link to="/admin/mali" className="text-brand">
              Aylık mali özet
            </Link>
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form
          className="surface grid gap-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const res = await addDebt({
              data: {
                userId: user.id,
                amount: Number(fd.get("debtAmount")),
                notes: String(fd.get("debtNotes") || ""),
              },
            });
            if (!res.ok) {
              toast.error(res.error ?? "Kaydedilemedi.");
              return;
            }
            toast.success("Borç kaydedildi.");
            form.reset();
            await router.invalidate();
          }}
        >
          <h2 className="text-lg">Borç ekle</h2>
          <p className="text-sm text-muted">
            Üyeliği şimdi başlatıp ödemeyi sonra alıyorsanız tutarı buraya yazın.
            Mali sayfasındaki borçlular listesine ve danışan paneline düşer.
          </p>
          <div className="field">
            <label htmlFor="debtAmount">Tutar (TL)</label>
            <input id="debtAmount" name="debtAmount" type="number" min="1" step="1" required placeholder="5000" />
          </div>
          <div className="field">
            <label htmlFor="debtNotes">Not</label>
            <input id="debtNotes" name="debtNotes" placeholder="Aylık üyelik, paket…" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Borçlu olarak kaydet
          </button>
        </form>
        <div>
          <h2 className="text-lg">
            Borç durumu
            {debtBalance > 0 ? (
              <span className="ml-2 chip chip-wait">{formatPrice(debtBalance)}</span>
            ) : (
              <span className="ml-2 text-sm font-normal text-muted">borç yok</span>
            )}
          </h2>
          <ul className="mt-3 space-y-2">
            {debts.length === 0 ? (
              <li className="text-sm text-muted">Borç kaydı yok.</li>
            ) : (
              debts.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
                >
                  <span>
                    {d.kind === "borc" ? "Borç" : "Tahsilat"}
                    {d.notes ? ` · ${d.notes}` : ""}
                    <span className="mt-0.5 block text-xs text-muted">
                      {formatDateTr(d.created_at)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={d.kind === "borc" ? "stat-num text-warn" : "stat-num text-brand"}>
                      {d.kind === "borc" ? "+" : "−"}
                      {formatPrice(d.amount)}
                    </span>
                    {role === "assistant" && pendingDebts.includes(d.id) ? (
                      <span className="chip chip-wait">Yönetici onayında</span>
                    ) : pendingDebt === d.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            const res = await deleteDebt({ data: { id: d.id } });
                            toast.success(
                              res.pending
                                ? "Silme isteği yöneticiye iletildi."
                                : "Kayıt silindi.",
                            );
                            setPendingDebt(null);
                            await router.invalidate();
                          }}
                        >
                          Evet, sil
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setPendingDebt(null)}
                        >
                          Vazgeç
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingDebt(d.id)}
                      >
                        Sil
                      </button>
                    )}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <p className="mt-6 text-xs text-muted">
        Klinik: {CLINIC.phone} · <Link to="/admin/danisanlar">Listeye dön</Link>
      </p>
    </AdminShell>
  );
}

