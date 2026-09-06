import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { MarkAllReadButton, NotificationList } from "@/components/admin-notifications";
import { OffplanPhoto, OffplanDeleteButton } from "@/components/offplan";
import { StatusChip } from "@/components/status-chip";
import {
  displayPhone,
  formatDateTr,
  cancelStamp,
  formatDateTimeTr,
  mealSlotLabel,
  offplanKindLabel,
  panelAccessMessage,
  reminderMessage,
  whatsappLink,
} from "@/lib/clinic";
import {
  decideRequest,
  deleteAppointment,
  loadAdminDashboard,
  updateAppointmentStatus,
} from "@/lib/actions";

export const Route = createFileRoute("/admin/")({
  loader: async () => {
    const data = await loadAdminDashboard();
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: AdminHome,
});

function AdminHome() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [creds, setCreds] = useState<
    Record<number, { password: string; phone: string; name: string; clientId: number }>
  >({});
  if (!data.auth) return null;
  const { counts, todayList, upcoming, pending, requests, unread, cancels, offplans, notifs, measureDue, topLoss, topSlim, topKcal, pkgAlerts } = data;

  async function approveBooking(
    a: { id: number; client_phone: string; client_name: string },
    status: "onaylandi" | "iptal",
  ) {
    const res = await updateAppointmentStatus({ data: { id: a.id, status } });
    if (!res.ok) {
      toast.error("Durum güncellenemedi.");
      return;
    }
    if (res.clientCreated && res.tempPassword && res.clientId) {
      setCreds((p) => ({
        ...p,
        [res.clientId!]: {
          password: res.tempPassword!,
          phone: a.client_phone,
          name: res.clientName ?? a.client_name,
          clientId: res.clientId!,
        },
      }));
      toast.success(`${res.clientName} danışan listesine eklendi.`, {
        description: `Geçici şifre: ${res.tempPassword}`,
        duration: 16000,
      });
    } else {
      toast.success(status === "onaylandi" ? "Randevu onaylandı." : "Randevu iptal edildi.");
    }
    await router.invalidate();
  }

  return (
    <AdminShell
      title="Bugün ne var?"
      action={
        counts.notif_n > 0 ? (
          <MarkAllReadButton />
        ) : null
      }
    >
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <Link
          to="/admin/randevular"
          search={{ view: "today" }}
          className="surface p-4 hover:bg-brand-mist"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Bugün</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{counts.today_n}</p>
        </Link>
        <Link
          to="/admin/randevular"
          search={{ view: "pending" }}
          className="surface p-4 hover:bg-brand-mist"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Bekleyen</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{counts.pending_n}</p>
        </Link>
        <Link
          to="/admin/randevular"
          search={{ view: "approved" }}
          className="surface p-4 hover:bg-brand-mist"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Onaylı</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{counts.approved_n}</p>
        </Link>
        <Link
          to="/admin/randevular"
          search={{ view: "all" }}
          className="surface p-4 hover:bg-brand-mist"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted">İptaller</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{counts.cancel_n}</p>
        </Link>
        <Link
          to="/admin/bildirimler"
          search={{ all: false }}
          className="surface p-4 hover:bg-brand-mist"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Bildirimler</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{counts.notif_n}</p>
        </Link>
        <div className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Okunmamış mesaj</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{counts.unread_n}</p>
        </div>
      </div>

      {(pkgAlerts ?? []).length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl">Paket bakiyesi uyarıları</h2>
          <ul className="mt-3 space-y-2">
            {(pkgAlerts ?? []).map((row) => (
              <li key={`${row.reason}-${row.id}`} className="surface flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-medium">
                    <Link to="/admin/danisan/$id" params={{ id: String(row.user_id) }} className="text-brand">
                      {row.full_name}
                    </Link>
                  </p>
                  <p className="text-sm text-ink-soft">
                    {row.title}
                    {row.reason === "last"
                      ? ` · son ${row.unit}`
                      : row.reason === "two"
                        ? ` · 2 ${row.unit} kaldı`
                        : " · paketi var, sıradaki randevu yok"}
                  </p>
                </div>
                <Link to="/admin/paketler" className="btn btn-sm btn-secondary">
                  Paketler
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <article className="surface p-5">
          <h2 className="text-lg">En çok zayıflayan</h2>
          <LeaderList rows={topLoss ?? []} empty="Henüz kilo kaybı kaydı yok." />
        </article>
        <article className="surface p-5">
          <h2 className="text-lg">Ölçümde en çok incelen</h2>
          <p className="text-xs text-muted">Bel + kalça + göbek</p>
          <LeaderList rows={topSlim ?? []} empty="Henüz ölçü azalması yok." />
        </article>
        <article className="surface p-5">
          <h2 className="text-lg">i-Shape en çok kalori</h2>
          <LeaderList rows={topKcal ?? []} empty="Henüz EMS kaydı yok." />
        </article>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Ölçü alınmayanlar</h2>
        <p className="text-sm text-muted">Hiç ölçü yok veya son ölçü 14 günden eski.</p>
        {(measureDue ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted">Güncel ölçüsü olmayan aktif danışan yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(measureDue ?? []).map((u) => (
              <li key={u.id} className="surface flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <Link to="/admin/danisan/$id" params={{ id: String(u.id) }} className="font-medium">
                    {u.full_name}
                  </Link>
                  <p className="text-sm text-muted">
                    {u.last_date ? `Son ölçü ${formatDateTr(u.last_date)}` : "Hiç ölçü yok"}
                  </p>
                </div>
                <Link to="/admin/danisan/$id" params={{ id: String(u.id) }} className="btn btn-sm btn-secondary">
                  Aç
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl">Bildirimler</h2>
          <Link to="/admin/bildirimler" search={{ all: false }} className="text-sm text-brand">
            Tümü
          </Link>
        </div>
        <NotificationList
          items={notifs}
          empty="Danışan panelinden gelen yeni bildirim yok."
        />
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Danışan iptalleri</h2>
        {cancels.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Henüz danışan iptali yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cancels.map((a) => (
              <li key={a.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {a.user_id ? (
                      <Link
                        to="/admin/danisan/$id"
                        params={{ id: String(a.user_id) }}
                        className="text-brand"
                      >
                        {a.client_name}
                      </Link>
                    ) : (
                      a.client_name
                    )}
                    {" · "}
                    {formatDateTr(a.appointment_date)} {a.appointment_time}
                  </p>
                  <p className="text-sm text-muted">{a.service_name}</p>
                  <p className="mt-1 text-xs font-medium text-warn">
                    {cancelStamp(a.cancelled_at, a.cancelled_by) ??
                      `İptal · ${formatDateTimeTr(a.cancelled_at)}`}
                  </p>
                </div>
                <StatusChip status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Plan dışı öğünler</h2>
        {offplans.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Yeni kayıt yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {offplans.map((row) => (
              <li key={row.id} className="surface p-4">
                <p className="font-medium">
                  {row.user_id ? (
                    <Link
                      to="/admin/danisan/$id"
                      params={{ id: String(row.user_id) }}
                      className="text-brand"
                    >
                      {row.client_name}
                    </Link>
                  ) : (
                    row.client_name
                  )}
                  <span className="ml-2 text-sm font-normal text-muted">
                    {mealSlotLabel(row.slot)} · {offplanKindLabel(row.kind)}
                  </span>
                </p>
                {row.detail ? <p className="mt-1 text-sm">{row.detail}</p> : null}
                {row.amount ? <p className="text-sm text-muted">{row.amount}</p> : null}
                {row.note ? <p className="text-sm text-ink-soft">{row.note}</p> : null}
                <OffplanPhoto row={row} canDownload />
                <OffplanDeleteButton id={row.id} onDeleted={() => router.invalidate()} />
                <p className="mt-1 text-xs text-muted">{formatDateTimeTr(row.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Yeni randevu talepleri</h2>
        {Object.values(creds).length > 0 ? (
          <ul className="mt-3 space-y-2">
            {Object.values(creds).map((c) => (
              <li key={c.clientId} className="rounded-2xl bg-brand-mist px-4 py-3 text-sm text-brand-dark">
                <p>
                  <span className="font-medium">{c.name}</span> danışan listesine eklendi.
                  Geçici şifre: <span className="font-medium">{c.password}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <a
                    className="btn btn-sm btn-primary"
                    href={whatsappLink(
                      c.phone,
                      panelAccessMessage(c.name, c.phone, c.password),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Şifreyi WhatsApp’tan gönder
                  </a>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() =>
                      void navigate({
                        to: "/admin/danisan/$id",
                        params: { id: String(c.clientId) },
                      })
                    }
                  >
                    Danışanı aç
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bekleyen talep yok.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {a.client_name} · {displayPhone(a.client_phone)}
                      {!a.user_id ? (
                        <span className="ml-2 chip chip-off">Kayıtsız</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDateTr(a.appointment_date)} {a.appointment_time} · {a.service_name}
                    </p>
                    {a.notes ? <p className="mt-1 text-sm text-ink-soft">{a.notes}</p> : null}
                  </div>
                  <StatusChip status={a.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => approveBooking(a, "onaylandi")}
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => approveBooking(a, "iptal")}
                  >
                    İptal
                  </button>
                  <a
                    className="btn btn-sm btn-secondary"
                    href={whatsappLink(
                      a.client_phone,
                      reminderMessage("appointment", a.client_name, {
                        date: formatDateTr(a.appointment_date),
                        time: a.appointment_time,
                        gender: a.client_gender,
                      }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                  {pendingDelete === a.id ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          try {
                            const res = await deleteAppointment({ data: { id: a.id } });
                            toast.success("Talep silindi.");
                            setPendingDelete(null);
                            await router.invalidate();
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
                        onClick={() => setPendingDelete(null)}
                      >
                        Vazgeç
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setPendingDelete(a.id)}
                    >
                      Sil
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Bugünkü randevular</h2>
        {todayList.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bugün randevu yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {todayList.map((a) => (
              <li key={a.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {a.appointment_time} ·{" "}
                    {a.user_id ? (
                      <Link
                        to="/admin/danisan/$id"
                        params={{ id: String(a.user_id) }}
                        className="text-brand"
                      >
                        {a.client_name}
                      </Link>
                    ) : (
                      a.client_name
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {a.service_name} · {displayPhone(a.client_phone)}
                  </p>
                  {cancelStamp(a.cancelled_at, a.cancelled_by) ? (
                    <p className="mt-1 text-xs font-medium text-warn">
                      {cancelStamp(a.cancelled_at, a.cancelled_by)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={a.status} />
                  {a.status === "beklemede" ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => approveBooking(a, "onaylandi")}
                    >
                      Onayla
                    </button>
                  ) : null}
                  <a
                    className="btn btn-sm btn-secondary"
                    href={whatsappLink(
                      a.client_phone,
                      reminderMessage("appointment", a.client_name, {
                        date: formatDateTr(a.appointment_date),
                        time: a.appointment_time,
                        gender: a.client_gender,
                      }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Ertele / iptal talepleri</h2>
        {requests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bekleyen talep yok.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((r) => (
              <li key={r.id} className="surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.client_name} · {r.request_type === "iptal" ? "İptal" : "Erteleme"}
                    </p>
                    <p className="text-sm text-muted">
                      Mevcut: {formatDateTr(r.appointment_date)} {r.appointment_time} · {r.service_name}
                    </p>
                    {r.request_type === "ertele" ? (
                      <p className="text-sm text-ink-soft">
                        Tercih: {formatDateTr(r.preferred_date)} {r.preferred_time}
                      </p>
                    ) : null}
                    {r.reason ? <p className="mt-1 text-sm text-muted">{r.reason}</p> : null}
                  </div>
                  <a
                    className="btn btn-sm btn-secondary"
                    href={whatsappLink(
                      r.client_phone ?? "",
                      reminderMessage("generic", r.client_name ?? "", {
                        gender: r.client_gender,
                      }),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={async () => {
                      await decideRequest({ data: { id: r.id, decision: "onaylandi" } });
                      toast.success("Talep onaylandı, danışana mesaj yazıldı.");
                      await router.invalidate();
                    }}
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={async () => {
                      await decideRequest({ data: { id: r.id, decision: "reddedildi" } });
                      toast.success("Talep reddedildi.");
                      await router.invalidate();
                    }}
                  >
                    Reddet
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl">Okunmamış danışan mesajları</h2>
        {unread.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Okunmamış mesaj yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {unread.map((m) => (
              <li key={m.id}>
                <Link
                  to="/admin/danisan/$id"
                  params={{ id: String(m.user_id) }}
                  className="surface block p-4 hover:bg-brand-mist"
                >
                  <p className="font-medium">{m.client_name}</p>
                  <p className="line-clamp-2 text-sm text-muted">{m.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Yaklaşan randevular</h2>
          <Link to="/admin/randevular" className="text-sm text-brand">
            Tümü
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="py-2">Tarih</th>
                <th>Saat</th>
                <th>Danışan</th>
                <th>Hizmet</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="py-3">{formatDateTr(a.appointment_date)}</td>
                  <td>{a.appointment_time}</td>
                  <td>
                    {a.user_id ? (
                      <Link
                        to="/admin/danisan/$id"
                        params={{ id: String(a.user_id) }}
                        className="text-brand"
                      >
                        {a.client_name}
                      </Link>
                    ) : (
                      a.client_name
                    )}
                  </td>
                  <td>{a.service_name}</td>
                  <td>
                    <StatusChip status={a.status} />
                    {cancelStamp(a.cancelled_at, a.cancelled_by) ? (
                      <p className="mt-1 text-xs font-medium text-warn">
                        {cancelStamp(a.cancelled_at, a.cancelled_by)}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function LeaderList({
  rows,
  empty,
}: {
  rows: Array<{ id: number; full_name: string; value: number; detail: string }>;
  empty: string;
}) {
  if (!rows.length) return <p className="mt-3 text-sm text-muted">{empty}</p>;
  return (
    <ol className="mt-3 space-y-2">
      {rows.map((r, i) => (
        <li key={r.id} className="flex items-baseline justify-between gap-2 text-sm">
          <Link to="/admin/danisan/$id" params={{ id: String(r.id) }} className="min-w-0 truncate">
            {i + 1}. {r.full_name}
          </Link>
          <span className="shrink-0 font-medium text-brand-dark">{r.detail}</span>
        </li>
      ))}
    </ol>
  );
}
