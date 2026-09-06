import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { LabTrendView, StaffLabValueForm } from "@/components/daily-track";
import { deleteLab, getLabFile, saveLabStaffNote, uploadLab, type LabRow } from "@/lib/actions";
import type { LabValue } from "@/lib/wellness";
import { formatDateTimeTr } from "@/lib/clinic";
import { downloadBase64 } from "@/lib/download";

export function LabClientBox({
  items,
  values = [],
  onChanged,
}: {
  items: LabRow[];
  values?: LabValue[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  return (
    <section id="tahlil" className="mt-10 scroll-mt-24">
      <h2 className="text-2xl">Kan tahlillerim</h2>
      <LabTrendView items={values} />
      <p className="mt-1 text-sm text-muted">
        PDF veya fotoğraf yükleyin. Sayı girmeyin; diyetisyeniniz değerleri yazar, değişim aşağıda görünür.
      </p>
      {open ? (
        <form
          className="surface mt-4 space-y-3 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            if (!fd.get("file") || !(fd.get("file") instanceof File) || (fd.get("file") as File).size === 0) {
              toast.error("Dosya seçin.");
              return;
            }
            setBusy(true);
            try {
              const res = await uploadLab({ data: fd });
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("Tahlil yüklendi.");
              form.reset();
              setFileName("");
              setOpen(false);
              onChanged();
            } catch {
              toast.error("Yüklenemedi.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="field">
            <label htmlFor="lab-title">Başlık (isteğe bağlı)</label>
            <input id="lab-title" name="title" placeholder="Örn. Ağustos kan tahlili" />
          </div>
          <div className="field">
            <label htmlFor="lab-note">Not (isteğe bağlı)</label>
            <input id="lab-note" name="note" placeholder="Aç karnına alındı vb." />
          </div>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            name="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
          />
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            {fileName || "PDF veya fotoğraf seç"}
          </button>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Yükleniyor…" : "Yükle"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setOpen(false);
                setFileName("");
              }}
            >
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-secondary mt-4" onClick={() => setOpen(true)}>
          Tahlil yükle
        </button>
      )}
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Henüz tahlil yok.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((row) => (
            <LabRowItem key={row.id} row={row} staff={false} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function LabStaffList({
  items,
  showClient,
  onChanged,
}: {
  items: LabRow[];
  showClient?: boolean;
  onChanged: () => void;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-muted">Tahlil kaydı yok.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((row) => (
        <LabRowItem key={row.id} row={row} staff showClient={showClient} onChanged={onChanged} />
      ))}
    </ul>
  );
}

function LabRowItem({
  row,
  staff,
  showClient,
  onChanged,
}: {
  row: LabRow;
  staff: boolean;
  showClient?: boolean;
  onChanged: () => void;
}) {
  const [note, setNote] = useState(row.staff_note ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <li className="surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {showClient && row.client_name ? (
            <p className="text-sm font-medium">
              <Link to="/admin/danisan/$id" params={{ id: String(row.user_id) }} className="text-brand">
                {row.client_name}
              </Link>
            </p>
          ) : null}
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-muted">
            {formatDateTimeTr(row.created_at)} · {row.kind === "pdf" ? "PDF" : "fotoğraf"}
          </p>
          {row.note ? <p className="mt-1 text-sm text-ink-soft">{row.note}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const file = await getLabFile({ data: { id: row.id } });
                if (!file.ok) {
                  toast.error("Dosya açılamadı.");
                  return;
                }
                downloadBase64(file.filename, file.mime, file.b64);
              } finally {
                setBusy(false);
              }
            }}
          >
            İndir
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("Tahlil silinsin mi?")) return;
              setBusy(true);
              try {
                const res = await deleteLab({ data: { id: row.id } });
                if (!res.ok) {
                  toast.error(res.error ?? "Silinemedi.");
                  return;
                }
                toast.success("Silindi.");
                onChanged();
              } finally {
                setBusy(false);
              }
            }}
          >
            Sil
          </button>
        </div>
      </div>
      {staff ? (
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await saveLabStaffNote({ data: { id: row.id, note } });
              toast.success("Not kaydedildi.");
              onChanged();
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            className="min-w-[12rem] flex-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Personel notu (danışan görmez)"
          />
          <button className="btn btn-sm btn-secondary" type="submit" disabled={busy}>
            Notu kaydet
          </button>
        </form>
      ) : null}
      {staff ? (
        <div className="mt-3 rounded-xl bg-sand p-3">
          <p className="text-xs font-medium text-muted">Bu tahlilden değer girin</p>
          <StaffLabValueForm
            userId={row.user_id}
            defaultDate={String(row.created_at).slice(0, 10)}
            onSaved={onChanged}
          />
        </div>
      ) : null}
    </li>
  );
}
