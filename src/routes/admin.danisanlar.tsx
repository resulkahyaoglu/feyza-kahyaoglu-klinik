import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { displayPhone, formatDateTr, formatPrice } from "@/lib/clinic";
import { deleteClient, loadClients } from "@/lib/actions";

type Search = { q?: string };

export const Route = createFileRoute("/admin/danisanlar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const data = await loadClients({ data: { q: deps.q } });
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: ClientsPage,
});

function ClientsPage() {
  const data = Route.useLoaderData();
  const { q } = Route.useSearch();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);
  if (!data.auth) return null;

  return (
    <AdminShell title="Danışanlar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-1 gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Ad veya telefon"
            className="min-h-11 flex-1 rounded-[14px] border border-line-strong bg-cream px-3"
          />
          <button className="btn btn-secondary" type="submit">
            Ara
          </button>
        </form>
        <Link to="/admin/danisan/ekle" className="btn btn-primary">
          Yeni danışan
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="py-2">Ad</th>
              <th>Telefon</th>
              <th>Borç</th>
              <th>i-Shape EMS</th>
              <th>Hedef</th>
              <th>Kayıt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="py-3">
                  <Link
                    to="/admin/danisan/$id"
                    params={{ id: String(u.id) }}
                    className="font-medium text-brand"
                  >
                    {u.full_name}
                  </Link>
                  {u.is_active !== 1 ? (
                    <span className="ml-2 chip chip-off">Pasif</span>
                  ) : null}
                </td>
                <td>{displayPhone(u.phone)}</td>
                <td>
                  {(u.debt_balance ?? 0) > 0 ? (
                    <span className="chip chip-wait">{formatPrice(u.debt_balance ?? 0)}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{u.has_ishape ? "Açık" : "Kapalı"}</td>
                <td>{u.target_weight ? `${u.target_weight} kg` : "—"}</td>
                <td>{formatDateTr(u.created_at)}</td>
                <td className="text-right">
                  {pendingId === u.id ? (
                    <span className="inline-flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={async () => {
                          try {
                            const res = await deleteClient({ data: { id: u.id } });
                            if (!res.ok) {
                              toast.error(res.error ?? "Silinemedi.");
                              return;
                            }
                            toast.success(`${res.name} silindi.`);
                            setPendingId(null);
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
                        onClick={() => setPendingId(null)}
                      >
                        Vazgeç
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => setPendingId(u.id)}
                    >
                      Sil
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Danışan yok. Hesapları siz açarsınız.</p>
        ) : null}
      </div>
    </AdminShell>
  );
}
