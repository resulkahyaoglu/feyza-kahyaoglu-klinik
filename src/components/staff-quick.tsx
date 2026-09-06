import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addDiet, adminCreateAppointments, loadClients, saveClientPackage } from "@/lib/actions";
import { SERVICES, TIME_SLOTS, todayISO } from "@/lib/clinic";
import { PACKAGE_KINDS, packageKindMeta } from "@/lib/packages";

type ClientOpt = { id: number; full_name: string };

export function StaffQuickBar() {
  const [open, setOpen] = useState<null | "diet" | "appt" | "pkg">(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  useEffect(() => {
    if (!open) return;
    void loadClients({ data: {} }).then((r) => {
      if (r.auth) {
        setClients(
          r.rows
            .filter((u) => Number(u.is_active) !== 0)
            .map((u) => ({ id: u.id, full_name: u.full_name })),
        );
      }
    });
  }, [open]);

  return (
    <div className="flex min-w-0 flex-wrap items-end justify-end gap-2">
      {open === "diet" ? (
        <DietSendForm clients={clients} onClose={() => setOpen(null)} />
      ) : (
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen("diet")}>
          Diyet listesi gönder
        </button>
      )}
      {open === "appt" ? (
        <ApptGiveForm clients={clients} onClose={() => setOpen(null)} />
      ) : (
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen("appt")}>
          Randevu ver
        </button>
      )}
      {open === "pkg" ? (
        <PkgSellForm clients={clients} onClose={() => setOpen(null)} />
      ) : (
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen("pkg")}>
          Paket sat
        </button>
      )}
    </div>
  );
}

function DietSendForm({ clients, onClose }: { clients: ClientOpt[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex max-w-xl flex-wrap items-end gap-2 rounded-xl border border-line bg-cream p-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const userId = String(fd.get("userId") || "");
        const file = fd.get("pdf");
        if (!userId) {
          toast.error("Danışan seçin.");
          return;
        }
        if (!(file instanceof File) || file.size === 0) {
          toast.error("PDF seçin.");
          return;
        }
        const title =
          String(fd.get("title") || "").trim() || file.name.replace(/\.pdf$/i, "") || "Diyet listesi";
        const payload = new FormData();
        payload.set("userId", userId);
        payload.set("title", title);
        payload.set("content", "");
        payload.set("pdf", file);
        setBusy(true);
        try {
          const res = await addDiet({ data: payload });
          if (!res.ok) {
            toast.error(("error" in res && res.error) || "Gönderilemedi.");
            return;
          }
          toast.success("Diyet listesi gönderildi.");
          form.reset();
          onClose();
        } catch {
          toast.error("Gönderilemedi.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field min-w-[8rem] flex-1">
        <label htmlFor="diet-send-user">Danışan</label>
        <select id="diet-send-user" name="userId" required>
          <option value="">Seçin</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-[7rem] flex-1">
        <label htmlFor="diet-send-title">Başlık</label>
        <input id="diet-send-title" name="title" placeholder="İsteğe bağlı" />
      </div>
      <div className="field min-w-[8rem]">
        <label htmlFor="diet-send-pdf">PDF</label>
        <input id="diet-send-pdf" name="pdf" type="file" accept="application/pdf,.pdf" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Gönderiliyor…" : "Gönder"}
      </button>
      <button className="btn btn-secondary" type="button" onClick={onClose}>
        Kapat
      </button>
    </form>
  );
}

function ApptGiveForm({ clients, onClose }: { clients: ClientOpt[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex max-w-2xl flex-wrap items-end gap-2 rounded-xl border border-line bg-cream p-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const userId = Number(fd.get("userId") || 0);
        const date = String(fd.get("date") || "");
        const time = String(fd.get("time") || "");
        const serviceKey = String(fd.get("serviceKey") || "");
        const weeks = Number(fd.get("weeks") || 1);
        if (!userId) {
          toast.error("Danışan seçin.");
          return;
        }
        setBusy(true);
        try {
          const res = await adminCreateAppointments({
            data: {
              userId,
              serviceKey,
              date,
              time,
              weeks: Number.isFinite(weeks) && weeks >= 1 ? weeks : 1,
              notes: String(fd.get("notes") || "") || undefined,
              isMeasure: fd.get("isMeasure") === "on",
            },
          });
          if (!res.ok) {
            toast.error(res.error ?? "Eklenemedi.");
            return;
          }
          toast.success(res.count === 1 ? "Randevu verildi." : `${res.count} randevu verildi.`);
          form.reset();
          onClose();
        } catch {
          toast.error("Eklenemedi.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field min-w-[8rem] flex-1">
        <label htmlFor="quick-appt-user">Danışan</label>
        <select id="quick-appt-user" name="userId" required>
          <option value="">Seçin</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-[7rem]">
        <label htmlFor="quick-appt-service">Hizmet</label>
        <select id="quick-appt-service" name="serviceKey" defaultValue={SERVICES[0]?.key} required>
          {SERVICES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-[8rem]">
        <label htmlFor="quick-appt-date">Tarih</label>
        <input id="quick-appt-date" name="date" type="date" defaultValue={todayISO()} required />
      </div>
      <div className="field min-w-[5.5rem]">
        <label htmlFor="quick-appt-time">Saat</label>
        <select id="quick-appt-time" name="time" defaultValue="10:00" required>
          {TIME_SLOTS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-[5rem]">
        <label htmlFor="quick-appt-weeks">Hafta</label>
        <select id="quick-appt-weeks" name="weeks" defaultValue="1">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <label className="mb-2 flex items-center gap-2 text-xs">
        <input type="checkbox" name="isMeasure" />
        Ölçüm
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Ekleniyor…" : "Randevu ver"}
      </button>
      <button className="btn btn-secondary" type="button" onClick={onClose}>
        Kapat
      </button>
    </form>
  );
}

function PkgSellForm({ clients, onClose }: { clients: ClientOpt[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<(typeof PACKAGE_KINDS)[number]["key"]>("ishape");
  const [totalRaw, setTotalRaw] = useState("8");
  const [nextRaw, setNextRaw] = useState("1");
  const meta = packageKindMeta(kind);

  function keepDigits(v: string) {
    if (v === "") return "";
    if (/^\d{1,2}$/.test(v)) return v;
    return null;
  }

  return (
    <form
      className="flex max-w-2xl flex-wrap items-end gap-2 rounded-xl border border-line bg-cream p-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const userId = Number(fd.get("userId") || 0);
        if (!userId) {
          toast.error("Danışan seçin.");
          return;
        }
        const total = Math.max(1, Math.min(99, Number(totalRaw) || 1));
        const nextNo = Math.max(1, Math.min(99, Number(nextRaw) || 1));
        setBusy(true);
        try {
          const res = await saveClientPackage({
            data: {
              userId,
              kind,
              title: String(fd.get("title") || "").trim() || undefined,
              total,
              nextNo,
              notes: String(fd.get("notes") || "").trim() || undefined,
            },
          });
          if (!res.ok) {
            toast.error("Kaydedilemedi.");
            return;
          }
          toast.success("Paket kaydedildi.");
          form.reset();
          setTotalRaw("8");
          setNextRaw("1");
          setKind("ishape");
          onClose();
        } catch {
          toast.error("Kaydedilemedi.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field min-w-[8rem] flex-1">
        <label htmlFor="quick-pkg-user">Danışan</label>
        <select id="quick-pkg-user" name="userId" required>
          <option value="">Seçin</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-[7rem]">
        <label htmlFor="quick-pkg-kind">Tür</label>
        <select
          id="quick-pkg-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          {PACKAGE_KINDS.map((k) => (
            <option key={k.key} value={k.key}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field min-w-[5rem]">
        <label htmlFor="quick-pkg-total">Toplam {meta.unit}</label>
        <input
          id="quick-pkg-total"
          type="text"
          inputMode="numeric"
          value={totalRaw}
          onChange={(e) => {
            const next = keepDigits(e.target.value);
            if (next !== null) setTotalRaw(next);
          }}
          required
        />
      </div>
      <div className="field min-w-[5.5rem]">
        <label htmlFor="quick-pkg-next">Kaldığı yer</label>
        <input
          id="quick-pkg-next"
          type="text"
          inputMode="numeric"
          value={nextRaw}
          onChange={(e) => {
            const next = keepDigits(e.target.value);
            if (next !== null) setNextRaw(next);
          }}
          required
        />
      </div>
      <div className="field min-w-[7rem] flex-1">
        <label htmlFor="quick-pkg-notes">Not</label>
        <input id="quick-pkg-notes" name="notes" placeholder="İsteğe bağlı" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Kaydediliyor…" : "Paketi kaydet"}
      </button>
      <button className="btn btn-secondary" type="button" onClick={onClose}>
        Kapat
      </button>
    </form>
  );
}
