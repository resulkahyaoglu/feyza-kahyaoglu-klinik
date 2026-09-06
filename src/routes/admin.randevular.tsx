import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AddAppointmentDialog } from "@/components/add-appointment-dialog";
import { AdminShell } from "@/components/admin-shell";
import { AppointmentsCalendar } from "@/components/appointments-calendar";
import { StatusChip } from "@/components/status-chip";
import {
  STATUS_LABEL,
  addDaysISO,
  displayPhone,
  formatDateTr,
  cancelStamp,
  monthISO,
  monthRange,
  panelAccessMessage,
  reminderMessage,
  todayISO,
  weekdayTr,
  whatsappLink,
} from "@/lib/clinic";
import { downloadBase64 } from "@/lib/download";
import {
  deleteAppointment,
  exportAppointments,
  loadAppointments,
  loadClients,
  updateAppointmentStatus,
} from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { AppointmentRow } from "@/lib/actions";
import type { ClientRow } from "@/lib/session";

type View = "calendar" | "today" | "week" | "pending" | "approved" | "all";
type Search = { q?: string; date?: string; view?: View; month?: string };
type Creds = { password: string; phone: string; name: string; clientId: number };

const VIEWS: { id: View; label: string }[] = [
  { id: "calendar", label: "Takvim" },
  { id: "today", label: "Bugün" },
  { id: "week", label: "Bu hafta" },
  { id: "pending", label: "Bekleyen" },
  { id: "approved", label: "Onaylı" },
  { id: "all", label: "Tümü" },
];

function parseView(v: unknown): View | undefined {
  return v === "calendar" ||
    v === "today" ||
    v === "week" ||
    v === "pending" ||
    v === "approved" ||
    v === "all"
    ? v
    : undefined;
}

function parseMonth(v: unknown): string | undefined {
  return typeof v === "string" && /^\d{4}-\d{2}$/.test(v) ? v : undefined;
}

function groupByDate(rows: AppointmentRow[]) {
  const today = todayISO();
  const map = new Map<string, AppointmentRow[]>();
  for (const r of rows) {
    const k = r.appointment_date.slice(0, 10);
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }
  return [...map.entries()].sort(([a], [b]) => {
    const aPast = a < today;
    const bPast = b < today;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return a.localeCompare(b);
  });
}

export const Route = createFileRoute("/admin/randevular")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    date: typeof s.date === "string" ? s.date : undefined,
    view: parseView(s.view) ?? (typeof s.date === "string" && s.date ? undefined : "calendar"),
    month: parseMonth(s.month),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const today = todayISO();
    const view = deps.view ?? (deps.date ? undefined : "calendar");
    const month = deps.month ?? monthISO();
    const range = view === "calendar" ? monthRange(month) : null;
    const [data, clients] = await Promise.all([
      loadAppointments({
        data: {
          q: deps.q,
          date: deps.date || (view === "today" ? today : undefined),
          from:
            range?.from ??
            (!deps.date && view === "week" ? today : undefined),
          to:
            range?.to ??
            (!deps.date && view === "week" ? addDaysISO(today, 6) : undefined),
          status:
            view === "pending"
              ? "beklemede"
              : view === "approved"
                ? "onaylandi"
                : undefined,
        },
      }),
      loadClients({ data: {} }),
    ]);
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return {
      ...data,
      clients: clients.auth ? clients.rows : ([] as ClientRow[]),
      month,
    };
  },
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/randevular" });
  const router = useRouter();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [creds, setCreds] = useState<Record<number, Creds>>({});
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const today = todayISO();
  const view = search.view ?? (search.date ? undefined : "calendar");
  const month = search.month ?? data.month ?? monthISO();
  const [selectedDay, setSelectedDay] = useState(() =>
    view === "calendar" ? today : today,
  );

  useEffect(() => {
    const { from, to } = monthRange(month);
    if (selectedDay < from || selectedDay > to) {
      setSelectedDay(today >= from && today <= to ? today : from);
    }
  }, [month, selectedDay, today]);

  const groups = useMemo(
    () => (data.auth ? groupByDate(data.rows) : []),
    [data],
  );
  const dayRows = useMemo(() => {
    if (!data.auth) return [];
    return data.rows
      .filter((r) => r.appointment_date.slice(0, 10) === selectedDay)
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }, [data, selectedDay]);

  if (!data.auth) return null;

  function go(next: Partial<Search>) {
    void navigate({
      search: {
        q: next.q !== undefined ? next.q : search.q,
        date: next.date,
        view: next.view,
        month: next.month,
      },
    });
  }

  async function applyStatus(id: number, status: string, adminNotes: string) {
    const res = await updateAppointmentStatus({
      data: { id, status, adminNotes },
    });
    if (!res.ok) {
      toast.error("Durum güncellenemedi.");
      return;
    }
    if (res.clientCreated && res.tempPassword && res.clientId) {
      const row = data.rows.find((r) => r.id === id);
      setCreds((p) => ({
        ...p,
        [id]: {
          password: res.tempPassword!,
          phone: row?.client_phone ?? "",
          name: res.clientName ?? row?.client_name ?? "",
          clientId: res.clientId!,
        },
      }));
      toast.success(`${res.clientName} danışan listesine eklendi.`, {
        description: `Geçici şifre: ${res.tempPassword}`,
        duration: 16000,
        action: {
          label: "Danışanı aç",
          onClick: () =>
            void navigate({
              to: "/admin/danisan/$id",
              params: { id: String(res.clientId) },
            }),
        },
      });
    } else {
      toast.success("Durum güncellendi.");
    }
    await router.invalidate();
  }

  function renderRow(a: AppointmentRow) {
    return (
      <li key={a.id} className="py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="stat-num w-14 shrink-0 text-lg text-brand-dark">
            {a.appointment_time}
          </p>
          <div className="min-w-40 flex-1">
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
              {!a.user_id ? (
                <span className="ml-2 chip chip-off">Kayıtsız</span>
              ) : null}
            </p>
            <p className="text-sm text-muted">
              {a.service_name}
              {a.notes ? ` · ${a.notes}` : ""}
              {" · "}
              {displayPhone(a.client_phone)}
            </p>
            {cancelStamp(a.cancelled_at, a.cancelled_by) ? (
              <p className="mt-1 text-xs font-medium text-warn">
                {cancelStamp(a.cancelled_at, a.cancelled_by)}
              </p>
            ) : null}
          </div>
          <StatusChip status={a.status} />
          <select
            className="min-h-10 rounded-[12px] border border-line-strong bg-cream px-2 text-sm"
            value={a.status}
            onChange={(e) =>
              applyStatus(a.id, e.target.value, notes[a.id] ?? a.admin_notes ?? "")
            }
            aria-label="Durum"
          >
            {Object.entries(STATUS_LABEL).map(([k, lab]) => (
              <option key={k} value={k}>
                {lab}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
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
              Hatırlat
            </a>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setOpenNote(openNote === a.id ? null : a.id)}
            >
              Not
            </button>
            {pendingDelete === a.id ? (
              <>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    try {
                      const res = await deleteAppointment({ data: { id: a.id } });
                      toast.success("Randevu silindi.");
                      setPendingDelete(null);
                      await router.invalidate();
                    } catch {
                      toast.error("Silinemedi. Tekrar deneyin.");
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
        </div>
        {openNote === a.id ? (
          <div className="mt-2 ml-14 field max-w-md">
            <label htmlFor={`n-${a.id}`}>Admin notu</label>
            <input
              id={`n-${a.id}`}
              defaultValue={a.admin_notes ?? ""}
              onChange={(e) => setNotes((p) => ({ ...p, [a.id]: e.target.value }))}
              onBlur={(e) => applyStatus(a.id, a.status, e.target.value)}
            />
          </div>
        ) : a.admin_notes ? (
          <p className="mt-1 ml-14 text-xs text-muted">{a.admin_notes}</p>
        ) : null}
        {creds[a.id] ? (
          <p className="mt-2 ml-14 rounded-xl bg-brand-mist px-3 py-2 text-sm text-brand-dark">
            Danışan kaydı açıldı. Geçici şifre:{" "}
            <span className="font-medium">{creds[a.id]!.password}</span>
            {" · "}
            <Link
              to="/admin/danisan/$id"
              params={{ id: String(creds[a.id]!.clientId) }}
              className="underline"
            >
              Danışanı aç
            </Link>
            {" · "}
            <a
              className="underline"
              href={whatsappLink(
                creds[a.id]!.phone,
                panelAccessMessage(
                  creds[a.id]!.name,
                  creds[a.id]!.phone,
                  creds[a.id]!.password,
                ),
              )}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </p>
        ) : null}
      </li>
    );
  }

  let pastStarted = false;

  return (
    <AdminShell
      title="Randevular"
      action={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setOpenAdd(true)}
        >
          <Plus className="size-4" />
          Randevu ekle
        </button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={cn(
              "btn btn-sm",
              view === v.id && !search.date ? "btn-primary" : "btn-secondary",
            )}
            onClick={() =>
              go({
                view: v.id,
                date: undefined,
                q: search.q,
                month: v.id === "calendar" ? month : undefined,
              })
            }
          >
            {v.label}
          </button>
        ))}
        <form
          className="ml-auto flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const q = String(fd.get("q") || "") || undefined;
            const date = String(fd.get("date") || "") || undefined;
            go({
              q,
              date,
              view: date ? undefined : view,
              month: date ? undefined : month,
            });
          }}
        >
          <input
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Ad veya telefon"
            className="min-h-10 w-44 rounded-[14px] border border-line-strong bg-cream px-3 text-sm"
          />
          <input
            name="date"
            type="date"
            defaultValue={search.date ?? ""}
            className="min-h-10 rounded-[14px] border border-line-strong bg-cream px-3 text-sm"
          />
          <button type="submit" className="btn btn-sm btn-secondary">
            Göster
          </button>
          {data.role === "admin" ? (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={async () => {
              try {
                const file = await exportAppointments();
                downloadBase64(file.filename, file.mime, file.b64);
                toast.success("Excel indirildi.");
              } catch {
                toast.error("Excel indirilemedi.");
              }
            }}
          >
            Excel
          </button>
          ) : null}
        </form>
      </div>

      {view === "calendar" && !search.date ? (
        <>
          <div className="mt-5">
            <AppointmentsCalendar
              month={month}
              rows={data.rows}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onMonthChange={(ym) => {
                go({ view: "calendar", month: ym, date: undefined, q: search.q });
              }}
            />
          </div>
          <section className="mt-6">
            <header className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <h2 className="font-display text-xl text-brand-dark">
                {selectedDay === today ? "Bugün · " : ""}
                {weekdayTr(selectedDay)} {formatDateTr(selectedDay)}
              </h2>
              <button
                type="button"
                className="text-sm font-medium text-brand"
                onClick={() => setOpenAdd(true)}
              >
                Bu güne ekle
              </button>
            </header>
            {dayRows.length === 0 ? (
              <p className="py-4 text-sm text-muted">Bu günde randevu yok.</p>
            ) : (
              <ul className="divide-y divide-line">{dayRows.map(renderRow)}</ul>
            )}
          </section>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            {search.date
              ? `${weekdayTr(search.date)} ${formatDateTr(search.date)}`
              : view === "today"
                ? `Bugün · ${weekdayTr(today)} ${formatDateTr(today)}`
                : view === "week"
                  ? `Bu hafta · ${formatDateTr(today)} – ${formatDateTr(addDaysISO(today, 6))}`
                  : view === "pending"
                    ? "Onay bekleyen talepler"
                    : view === "approved"
                      ? "Onaylanan randevular"
                      : "Tüm randevular, güne göre"}
            {" · "}
            {data.rows.length} kayıt
          </p>

          <div className="mt-5 space-y-6">
            {data.rows.length === 0 ? (
              <p className="text-sm text-muted">Bu görünümde randevu yok.</p>
            ) : (
              groups.map(([day, items]) => {
                const isPast = day < today;
                const showPastLabel = isPast && !pastStarted;
                if (isPast) pastStarted = true;
                return (
                  <section key={day}>
                    {showPastLabel ? (
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        Geçmiş
                      </p>
                    ) : null}
                    <header
                      className={cn(
                        "mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-2",
                        day === today && "border-brand/30",
                      )}
                    >
                      <h2 className="font-display text-xl text-brand-dark">
                        {day === today ? "Bugün · " : isPast ? "" : ""}
                        {weekdayTr(day)} {formatDateTr(day)}
                      </h2>
                      <p className="text-xs text-muted">{items.length} seans</p>
                    </header>
                    <ul className="divide-y divide-line">{items.map(renderRow)}</ul>
                  </section>
                );
              })
            )}
          </div>
        </>
      )}

      <AddAppointmentDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        clients={data.clients}
        defaultDate={view === "calendar" ? selectedDay : today}
        appointments={data.rows}
        onCreated={() => router.invalidate()}
      />
    </AdminShell>
  );
}
