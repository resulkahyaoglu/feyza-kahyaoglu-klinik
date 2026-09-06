import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { SERVICES, TIME_SLOTS, displayPhone, formatDateTr, todayISO, weekdayTr, weeklyDates } from "@/lib/clinic";
import { adminCreateAppointments } from "@/lib/actions";
import type { AppointmentRow } from "@/lib/actions";
import type { ClientRow } from "@/lib/session";
import { cn } from "@/lib/utils";

export function AddAppointmentDialog({
  open,
  onClose,
  clients,
  defaultDate,
  appointments,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  clients: ClientRow[];
  defaultDate: string;
  appointments: AppointmentRow[];
  onCreated: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [date, setDate] = useState(defaultDate || todayISO());
  const [time, setTime] = useState("10:00");
  const [weeks, setWeeks] = useState(1);
  const [serviceKey, setServiceKey] = useState<string>(SERVICES[0]?.key ?? "diyet");
  const [notes, setNotes] = useState("");
  const [isMeasure, setIsMeasure] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setClientId(null);
    setDate(defaultDate || todayISO());
    setTime("10:00");
    setWeeks(1);
    setServiceKey(SERVICES[0]?.key ?? "diyet");
    setNotes("");
    setIsMeasure(false);
    setPending(false);
  }, [open, defaultDate]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...clients].sort((a, b) => {
      if (a.is_active !== b.is_active) return b.is_active - a.is_active;
      return a.full_name.localeCompare(b.full_name, "tr");
    });
    if (!q) return list;
    return list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [clients, query]);

  const selected = clients.find((c) => c.id === clientId) ?? null;
  const previewDates = date ? weeklyDates(date, weeks) : [];
  const busy = useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) {
      if (a.appointment_date.slice(0, 10) !== date) continue;
      if (a.status === "iptal") continue;
      set.add(a.appointment_time);
    }
    return set;
  }, [appointments, date]);

  if (!open) return null;

  function pickClient(id: number) {
    setClientId(id);
  }

  async function submit() {
    if (!selected) {
      toast.error("Danışan seçin.");
      return;
    }
    setPending(true);
    try {
      const res = await adminCreateAppointments({
        data: {
          userId: selected.id,
          serviceKey,
          date,
          time,
          weeks,
          notes,
          isMeasure,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Eklenemedi.");
        return;
      }
      toast.success(
        res.count === 1
          ? `${selected.full_name} için randevu eklendi.`
          : `${selected.full_name} · ${res.count} haftalık randevu eklendi.`,
      );
      await onCreated();
      onClose();
    } catch {
      toast.error("Eklenemedi. Tekrar deneyin.");
    } finally {
      setPending(false);
    }
  }

  const listPane = (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim veya telefon"
          className="min-h-11 w-full rounded-[14px] border border-line-strong bg-cream py-2 pl-10 pr-3 text-sm"
        />
      </div>
      <ul className="mt-3 min-h-[10.5rem] space-y-1 overflow-y-auto rounded-xl border border-line p-1 md:min-h-0 md:flex-1">
        {filtered.length === 0 ? (
          <li className="px-1 py-6 text-sm text-muted">
            Eşleşen danışan yok.{" "}
            <Link to="/admin/danisan/ekle" className="text-brand underline" onClick={onClose}>
              Yeni danışan ekle
            </Link>
          </li>
        ) : (
          filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pickClient(c.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  clientId === c.id
                    ? "bg-brand-soft text-brand-dark"
                    : "hover:bg-brand-mist",
                )}
              >
                <span>
                  <span className="block text-sm font-medium">{c.full_name}</span>
                  <span className="block text-xs text-muted">{displayPhone(c.phone)}</span>
                </span>
                {c.is_active !== 1 ? <span className="chip chip-off">Pasif</span> : null}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  const formPane = (
    <form
      className="flex min-h-0 flex-1 flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {selected ? (
        <div className="rounded-xl bg-brand-mist px-3 py-2.5">
          <p className="text-sm font-medium text-brand-dark">{selected.full_name}</p>
          <p className="text-xs text-muted">{displayPhone(selected.phone)}</p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-3 py-4 text-sm text-muted">
          Bir danışan seçin.
        </p>
      )}
      <div className="field">
        <label htmlFor="add-service">Hizmet</label>
        <select
          id="add-service"
          value={serviceKey}
          onChange={(e) => setServiceKey(e.target.value)}
          required
        >
          {SERVICES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="add-date">Tarih</label>
          <input
            id="add-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="add-time">Saat</label>
          <select
            id="add-time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {busy.has(t) ? `${t} · dolu` : t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="add-weeks">Hafta sayısı</label>
        <select
          id="add-weeks"
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} hafta
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="add-notes">Not</label>
        <input
          id="add-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="İsteğe bağlı"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-brand"
          checked={isMeasure}
          onChange={(e) => setIsMeasure(e.target.checked)}
        />
        Bu seansta ölçüm var
      </label>
      {previewDates.length ? (
        <p className="text-sm text-muted">
          {weekdayTr(previewDates[0]!)} {time}
          {" · "}
          {previewDates.length} seans:{" "}
          {previewDates.map((d) => formatDateTr(d)).join(", ")}
        </p>
      ) : null}
      <button
        className="btn btn-primary mt-auto"
        type="submit"
        disabled={!selected || pending}
      >
        {pending
          ? "Ekleniyor…"
          : weeks === 1
            ? "Randevuyu ekle"
            : `${weeks} haftayı ekle`}
      </button>
    </form>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-appt-title"
        className="relative flex h-[100dvh] max-h-[100dvh] w-full flex-col bg-cream shadow-lift sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="add-appt-title" className="font-display text-xl">
              Randevu ekle
            </h2>
            <p className="text-sm text-muted">Danışanı seçin, tarih ve saati girin.</p>
          </div>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-sand-deep"
            onClick={onClose}
            aria-label="Kapat"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 md:grid-cols-2 md:min-h-[28rem] md:overflow-hidden">
          {listPane}
          {formPane}
        </div>
      </div>
    </div>
  );
}
