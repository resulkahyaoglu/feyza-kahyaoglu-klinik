import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addDiet, loadClients } from "@/lib/actions";

export function DietSendButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clients, setClients] = useState<Array<{ id: number; full_name: string }>>([]);
  useEffect(() => {
    if (!open) return;
    void loadClients({ data: {} }).then((r) => {
      if (r.auth) setClients(r.rows.filter((u) => Number(u.is_active) !== 0).map((u) => ({ id: u.id, full_name: u.full_name })));
    });
  }, [open]);

  if (!open) {
    return (
      <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>
        Diyet listesi gönder
      </button>
    );
  }

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
          setOpen(false);
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
      <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}>
        Kapat
      </button>
    </form>
  );
}
