import { useState } from "react";
import { toast } from "sonner";
import {
  bumpClientPackage,
  deleteClientPackage,
  saveClientPackage,
} from "@/lib/actions";
import {
  PACKAGE_KINDS,
  packageDone,
  packageKindMeta,
  packageSummary,
  type ClientPackage,
} from "@/lib/packages";
import { PackageBalanceBar } from "@/components/package-balance";

export function PackageAdmin({
  userId,
  packages,
  onSaved,
}: {
  userId: number;
  packages: ClientPackage[];
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<(typeof PACKAGE_KINDS)[number]["key"]>("ishape");
  const [title, setTitle] = useState("");
  const [totalRaw, setTotalRaw] = useState("8");
  const [nextRaw, setNextRaw] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = packageKindMeta(kind);

  function keepDigits(v: string) {
    if (v === "") return "";
    if (/^\d{1,2}$/.test(v)) return v;
    return null;
  }

  return (
    <section className="surface p-5">
      <h2 className="text-lg">Paket satışı</h2>
      <p className="mt-1 text-sm text-muted">
        Devam eden danışanda kaldığı yeri yazın. i-Shape ve diyet kendi türünden düşer.
        i-Shape + Diyet paketi, diyet veya i-Shape randevusunda 1 düşer (aynı gün ikisi birden olsa da tek seans).
        Özel paket her randevuda 1 düşer. İptalde geri gelir; gelmedi seansı düşer.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const total = Math.max(1, Math.min(99, Number(totalRaw) || 1));
            const nextNo = Math.max(1, Math.min(99, Number(nextRaw) || 1));
            const res = await saveClientPackage({
              data: {
                userId,
                kind,
                title: title.trim() || undefined,
                total,
                nextNo,
                notes: notes.trim() || undefined,
              },
            });
            if (!res.ok) {
              toast.error("Kaydedilemedi.");
              return;
            }
            toast.success("Paket eklendi.");
            setTitle("");
            setNotes("");
            setNextRaw("1");
            onSaved();
          } catch {
            toast.error("Kaydedilemedi.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="field sm:col-span-2">
          <label htmlFor="pkg-kind">Tür</label>
          <select
            id="pkg-kind"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as typeof kind;
              setKind(k);
              setTitle("");
            }}
          >
            {PACKAGE_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="pkg-title">Başlık (isteğe bağlı)</label>
          <input
            id="pkg-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={meta.label}
          />
        </div>
        <div className="field">
          <label htmlFor="pkg-total">Toplam {meta.unit}</label>
          <input
            id="pkg-total"
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
        <div className="field">
          <label htmlFor="pkg-next">Kaldığı yer</label>
          <input
            id="pkg-next"
            type="text"
            inputMode="numeric"
            value={nextRaw}
            onChange={(e) => {
              const next = keepDigits(e.target.value);
              if (next !== null) setNextRaw(next);
            }}
            required
          />
          <p className="text-xs text-muted">
            3 yazarsanız sıradaki 3. {meta.unit}tır. Kullanılan = 2, kalan = toplam − 2.
          </p>
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="pkg-notes">Not</label>
          <input id="pkg-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <button className="btn btn-primary sm:col-span-2" type="submit" disabled={busy}>
          {busy ? "Kaydediliyor…" : "Paketi kaydet"}
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {packages.length === 0 ? (
          <li className="text-sm text-muted">Paket yok.</li>
        ) : (
          packages.map((p) => (
            <li key={p.id} className="rounded-xl border border-line px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{packageSummary(p)}</span>
                <PackageBalanceBar pkg={p} compact />
              </div>
                <span className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={async () => {
                      await bumpClientPackage({ data: { id: p.id, delta: -1 } });
                      onSaved();
                    }}
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={packageDone(p)}
                    onClick={async () => {
                      await bumpClientPackage({ data: { id: p.id, delta: 1 } });
                      onSaved();
                    }}
                  >
                    +1 {p.unit} ilerle
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={async () => {
                      if (!window.confirm("Paket silinsin mi?")) return;
                      await deleteClientPackage({ data: { id: p.id } });
                      toast.success("Paket silindi.");
                      onSaved();
                    }}
                  >
                    Sil
                  </button>
                </span>
              </div>
              {p.notes ? <p className="mt-1 text-muted">{p.notes}</p> : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
