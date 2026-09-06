import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import {
  bumpClientPackage,
  loadPackageTrack,
  type PackageTrackRow,
} from "@/lib/actions";
import { formatDateTr } from "@/lib/clinic";
import { packageBalance, packageSummary } from "@/lib/packages";
import { PackageBalanceBar } from "@/components/package-balance";

export const Route = createFileRoute("/admin/paketler")({
  loader: async () => {
    const data = await loadPackageTrack();
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: PaketlerPage,
});

function PaketlerPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;

  async function bump(id: number, delta: -1 | 1) {
    try {
      const res = await bumpClientPackage({ data: { id, delta } });
      if (!res.ok) {
        toast.error(res.error ?? "Güncellenemedi.");
        return;
      }
      await router.invalidate();
    } catch {
      toast.error("Güncellenemedi.");
    }
  }

  return (
    <AdminShell title="Paket takibi">
      <p className="text-sm text-muted">
        Bakiye: kullanılan + kalan = toplam. i-Shape/diyet kendi randevusunda düşer;
        i-Shape + Diyet paketi diyet veya i-Shape randevusunda düşer. Özel paket her randevuda düşer.
        İptalde geri gelir. Gelmedi işaretlenirse seans düşer.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="surface p-4">
          <p className="text-xs text-muted">Aktif</p>
          <p className="font-display text-2xl">{data.counts.active}</p>
        </article>
        <article className="surface p-4">
          <p className="text-xs text-muted">2 kaldı</p>
          <p className="font-display text-2xl">{data.counts.two ?? 0}</p>
        </article>
        <article className="surface p-4">
          <p className="text-xs text-muted">Son seans</p>
          <p className="font-display text-2xl">{data.counts.last}</p>
        </article>
        <article className="surface p-4">
          <p className="text-xs text-muted">Randevusu yok</p>
          <p className="font-display text-2xl">{data.counts.noAppt}</p>
        </article>
      </div>

      <TrackList
        title="2 kaldı"
        empty="2 seansı kalan yok."
        rows={data.two ?? []}
        onBump={bump}
      />
      <TrackList
        title="Son seans"
        empty="Son seansında kimse yok."
        rows={data.last}
        onBump={bump}
      />
      <TrackList
        title="Paketi var, sıradaki randevu yok"
        empty="Herkesin randevusu var."
        rows={data.noAppt}
        onBump={bump}
      />
      <TrackList
        title="Aktif paketler"
        empty="Aktif paket yok. Üstten Paket sat ile ekleyin."
        rows={data.active.filter((r) => r.remaining > 2 && r.next_date)}
        onBump={bump}
      />
      <TrackList
        title="Biten paketler"
        empty="Yakında biten paket yok."
        rows={data.done}
        onBump={bump}
        hideBump
      />
    </AdminShell>
  );
}

function TrackList({
  title,
  empty,
  rows,
  onBump,
  hideBump,
}: {
  title: string;
  empty: string;
  rows: PackageTrackRow[];
  onBump: (id: number, delta: -1 | 1) => void;
  hideBump?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="surface flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium">
                  <Link
                    to="/admin/danisan/$id"
                    params={{ id: String(row.user_id) }}
                    className="text-brand"
                  >
                    {row.client_name}
                  </Link>
                </p>
                <p className="text-sm text-ink-soft">{packageSummary(row)}</p>
                <PackageBalanceBar pkg={row} compact />
                {(() => {
                  const b = packageBalance(row);
                  if (b.done) return null;
                  if (row.next_date) {
                    return (
                      <p className="text-xs text-muted">
                        Sıradaki randevu: {formatDateTr(row.next_date)} {row.next_time}
                      </p>
                    );
                  }
                  return <p className="text-xs text-warn">Sıradaki randevu yok</p>;
                })()}
              </div>
              {hideBump ? null : (
                <span className="flex gap-1">
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => onBump(row.id, -1)}>
                    −1
                  </button>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => onBump(row.id, 1)}>
                    +1
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
