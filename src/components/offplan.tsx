import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  MEAL_SLOTS,
  OFFPLAN_KINDS,
  formatDateTimeTr,
  mealSlotLabel,
  offplanKindLabel,
} from "@/lib/clinic";
import { saveOffplan, deleteOffplan, getOffplanPhoto, type OffplanRow } from "@/lib/actions";
import { compressImageFile, downloadBase64 } from "@/lib/download";

export function OffplanComposer({ onSaved }: { onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<(typeof MEAL_SLOTS)[number]["key"] | "">("");
  const [kind, setKind] = useState<(typeof OFFPLAN_KINDS)[number]["key"]>("extra");
  const [detail, setDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<{ b64: string; mime: string; name: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setDetail("");
    setAmount("");
    setNote("");
    setPhoto(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressImageFile(file);
      setPhoto(compressed);
      setPreview(`data:${compressed.mime};base64,${compressed.b64}`);
    } catch (err) {
      toast.message(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    }
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) {
      toast.message("Öğün zamanını seçin.");
      return;
    }
    if (!detail.trim() && !photo) {
      toast.message("Kısa bir not yazın veya fotoğraf ekleyin.");
      return;
    }
    setBusy(true);
    try {
    const res = await saveOffplan({
      data: {
        slot,
        kind,
        detail: detail.trim() || undefined,
        amount: amount || undefined,
        note: note || undefined,
        photoB64: photo?.b64,
        photoMime: photo?.mime,
        photoName: photo?.name,
      },
    });
    if (!res.ok) {
      toast.message(res.error);
      return;
    }
    toast.success("Kaydedildi.");
    resetForm();
    setOpen(false);
    await onSaved();
    } catch {
      toast.error("Kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {open ? (
        <form className="surface p-5" onSubmit={submit}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Not
          </p>
          <h2 className="mt-1 text-xl">Plan dışı öğün kaydet</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Yazmak zorunda değilsiniz. İsterseniz tabağın fotoğrafını yükleyin,
            isterseniz kısaca not düşün.
          </p>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Öğün zamanı</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEAL_SLOTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={cn("choice", slot === s.key && "choice-on")}
                  onClick={() => setSlot(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium">Ne oldu?</legend>
            <div className="mt-2 grid gap-2">
              {OFFPLAN_KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  className={cn("choice text-left", kind === k.key && "choice-on")}
                  onClick={() => setKind(k.key)}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </fieldset>

          {kind === "extra" ? (
            <>
              <div className="field mt-5">
                <label htmlFor="off-detail">Ne yediniz? (isteğe bağlı)</label>
                <textarea
                  id="off-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  placeholder="İsterseniz kısaca yazın."
                />
              </div>
              <div className="field mt-3">
                <label htmlFor="off-amount">Miktar (isteğe bağlı)</label>
                <input
                  id="off-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Örn. 1 dilim, bir avuç"
                />
              </div>
              <div className="field mt-3">
                <label htmlFor="off-note">Not (isteğe bağlı)</label>
                <input
                  id="off-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Varsa kısa bir not"
                />
              </div>
            </>
          ) : (
            <>
              <div className="field mt-5">
                <label htmlFor="off-missing">Hangi ürünü bulamadınız? (isteğe bağlı)</label>
                <textarea
                  id="off-missing"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  placeholder="Listedeki ürünün adı."
                />
              </div>
              <div className="field mt-3">
                <label htmlFor="off-instead">Yerine ne yediniz? (isteğe bağlı)</label>
                <input
                  id="off-instead"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="mt-5">
            <p className="text-sm font-medium">Fotoğraf (isteğe bağlı)</p>
            <p className="mt-1 text-sm text-muted">
              Yazmak istemezseniz tabağın veya ürünün fotoğrafını eklemeniz yeterli.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onPickPhoto(e.target.files?.[0])}
            />
            {preview ? (
              <div className="mt-3">
                <img
                  src={preview}
                  alt="Yüklenen öğün fotoğrafı"
                  className="h-28 w-28 rounded-xl object-cover outline outline-1 -outline-offset-1 outline-ink/10"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                  >
                    Değiştir
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setPhoto(null);
                      setPreview(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    Kaldır
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary mt-3"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                Fotoğraf seç
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Kaydediliyor…" : "Kaydet"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
            >
              Vazgeç
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn-secondary w-full sm:w-auto"
          onClick={() => setOpen(true)}
        >
          Plan dışı öğün kaydet
        </button>
      )}
    </div>
  );
}

function photoSrc(row: OffplanRow) {
  if (Number(row.has_photo) === 1) return true;
  if (row.photo_b64) return true;
  return false;
}

export function OffplanPhoto({
  row,
  canDownload = false,
}: {
  row: OffplanRow;
  canDownload?: boolean;
}) {
  const has = photoSrc(row);
  if (!has) return null;
  if (!canDownload) {
    return <p className="mt-2 text-xs text-muted">Fotoğraf eklendi</p>;
  }
  const filename = row.photo_name || "ogun.jpg";
  return (
    <div className="mt-3">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={async () => {
          const file = await getOffplanPhoto({ data: { id: row.id } });
          if (!file.ok) {
            toast.error("Fotoğraf indirilemedi.");
            return;
          }
          downloadBase64(file.filename || filename, file.mime, file.b64);
        }}
      >
        Fotoğrafı indir
      </button>
    </div>
  );
}

export function OffplanHistory({
  items,
  onChanged,
}: {
  items: OffplanRow[];
  onChanged?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        className="btn btn-secondary w-full sm:w-auto"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Kayıtları gizle" : "Plan dışı öğün kayıtlarım"}
      </button>
      {open ? (
        <OffplanList
          items={items}
          empty="Henüz kayıt yok."
          canDelete
          onChanged={onChanged}
        />
      ) : null}
    </div>
  );
}

export function OffplanDeleteButton({
  id,
  onDeleted,
}: {
  id: number;
  onDeleted?: () => Promise<void>;
}) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ask) {
    return (
      <button type="button" className="btn btn-sm btn-danger mt-3" onClick={() => setAsk(true)}>
        Sil
      </button>
    );
  }
  return (
    <span className="mt-3 inline-flex flex-wrap gap-2">
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const res = await deleteOffplan({ data: { id } });
            if (!res.ok) {
              toast.error(res.error ?? "Silinemedi.");
              return;
            }
            toast.success("Kayıt silindi.");
            await onDeleted?.();
          } finally {
            setBusy(false);
            setAsk(false);
          }
        }}
      >
        {busy ? "Siliniyor…" : "Evet, sil"}
      </button>
      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAsk(false)}>
        Vazgeç
      </button>
    </span>
  );
}

export function OffplanList({
  items,
  empty,
  canDownload = false,
  canDelete = false,
  onChanged,
}: {
  items: OffplanRow[];
  empty: string;
  canDownload?: boolean;
  canDelete?: boolean;
  onChanged?: () => Promise<void>;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {items.map((row) => (
        <li key={row.id} className="surface p-4">
          <p className="text-xs text-muted">
            {mealSlotLabel(row.slot)} · {offplanKindLabel(row.kind)} · {formatDateTimeTr(row.created_at)}
          </p>
          {row.detail ? <p className="mt-1 text-sm">{row.detail}</p> : null}
          {row.amount ? <p className="mt-1 text-sm text-muted">{row.amount}</p> : null}
          {row.note ? <p className="mt-1 text-sm text-ink-soft">{row.note}</p> : null}
          <OffplanPhoto row={row} canDownload={canDownload} />
          {canDelete ? <OffplanDeleteButton id={row.id} onDeleted={onChanged} /> : null}
        </li>
      ))}
    </ul>
  );
}
