import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { MarkAllReadButton, NotificationList } from "@/components/admin-notifications";
import { loadAdminNotifications } from "@/lib/actions";

export const Route = createFileRoute("/admin/bildirimler")({
  validateSearch: (s: Record<string, unknown>): { all: boolean } => ({
    all: s.all === "1" || s.all === true,
  }),
  loaderDeps: ({ search }) => ({ all: search.all }),
  loader: async ({ deps }) => {
    const data = await loadAdminNotifications({ data: { all: deps.all } });
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: BildirimlerPage,
});

function BildirimlerPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  if (!data.auth) return null;
  const showingAll = Boolean(search.all);

  return (
    <AdminShell
      title="Bildirimler"
      action={<MarkAllReadButton disabled={data.unread === 0} />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={showingAll ? "chip chip-off" : "chip chip-ok"}
          onClick={() => void navigate({ search: { all: false } })}
        >
          Okunmamış{data.unread ? ` · ${data.unread}` : ""}
        </button>
        <button
          type="button"
          className={showingAll ? "chip chip-ok" : "chip chip-off"}
          onClick={() => void navigate({ search: { all: true } })}
        >
          Tümü
        </button>
      </div>
      <NotificationList
        items={data.items}
        empty={showingAll ? "Henüz bildirim yok." : "Okunmamış bildirim yok."}
      />
    </AdminShell>
  );
}
