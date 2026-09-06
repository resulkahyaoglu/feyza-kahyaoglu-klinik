import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { formatDateTimeTr } from "@/lib/clinic";
import { deleteFeedback, loadFeedbackList } from "@/lib/actions";

export const Route = createFileRoute("/admin/gorusler")({
  loader: async () => {
    const data = await loadFeedbackList();
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: GoruslerPage,
});

function GoruslerPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;
  const rows = data.rows;

  return (
    <AdminShell title="Görüş ve öneriler">
      <p className="text-sm text-muted">
        Danışan panelinden gelen yazılar. Danışan kendi yazısını panelinde görmez.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Henüz görüş yok.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="surface p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to="/admin/danisan/$id"
                  params={{ id: String(row.user_id) }}
                  className="font-medium text-brand"
                >
                  {row.client_name}
                </Link>
                <p className="text-xs text-muted">{formatDateTimeTr(row.created_at)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{row.message}</p>
              <button
                type="button"
                className="btn btn-sm btn-danger mt-3"
                onClick={async () => {
                  if (!window.confirm("Bu görüş silinsin mi?")) return;
                  await deleteFeedback({ data: { id: row.id } });
                  toast.success("Silindi.");
                  await router.invalidate();
                }}
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
