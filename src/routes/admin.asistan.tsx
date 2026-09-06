import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { formatDateTimeTr } from "@/lib/clinic";
import { decideDeleteRequest, loadAssistantDay } from "@/lib/actions";

export const Route = createFileRoute("/admin/asistan")({
  loader: async () => {
    const data = await loadAssistantDay();
    if (!data.auth) throw redirect({ to: "/admin" });
    return data;
  },
  component: AssistantDayPage,
});

function AssistantDayPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;

  return (
    <AdminShell title="Asistanım bugün neler yaptı">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">İlk giriş</p>
          <p className="mt-1 font-medium">{formatDateTimeTr(data.firstLogin)}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Son çıkış</p>
          <p className="mt-1 font-medium">{formatDateTimeTr(data.lastLogout)}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Giriş sayısı</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{data.loginCount}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl">Silme onayları</h2>
        {data.pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bekleyen silme isteği yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.pending.map((r) => (
              <li key={r.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{r.summary}</p>
                  <p className="text-xs text-muted">{formatDateTimeTr(r.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={async () => {
                      await decideDeleteRequest({ data: { id: r.id, decision: "onaylandi" } });
                      toast.success("Silme onaylandı.");
                      await router.invalidate();
                    }}
                  >
                    Onayla ve sil
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={async () => {
                      await decideDeleteRequest({ data: { id: r.id, decision: "reddedildi" } });
                      toast.success("İstek reddedildi, kayıt duruyor.");
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
        <h2 className="text-xl">Bugünkü işlemler</h2>
        {data.logs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Bugün henüz işlem yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.logs.map((row) => (
              <li key={row.id} className="surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-muted">{formatDateTimeTr(row.created_at)}</p>
                </div>
                {row.body ? <p className="mt-1 text-sm text-ink-soft">{row.body}</p> : null}
                {row.href?.startsWith("/admin/danisan/") ? (
                  <Link
                    to="/admin/danisan/$id"
                    params={{ id: row.href.split("/").pop() ?? "" }}
                    className="mt-2 inline-block text-sm text-brand"
                  >
                    Danışanı aç
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
