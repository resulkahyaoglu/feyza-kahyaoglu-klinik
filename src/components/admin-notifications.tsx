import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatDateTimeTr, NOTIF_KIND_LABEL } from "@/lib/clinic";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type AdminNotif,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

export function NotifKind({ kind }: { kind: string }) {
  return (
    <span className="chip chip-off">
      {NOTIF_KIND_LABEL[kind] ?? kind}
    </span>
  );
}

export function NotificationList({
  items,
  empty,
}: {
  items: AdminNotif[];
  empty: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();

  if (items.length === 0) {
    return <p className="mt-3 text-sm text-muted">{empty}</p>;
  }

  return (
    <ul className="mt-3 space-y-2">
      {items.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            className={cn(
              "surface w-full p-4 text-left hover:bg-brand-mist",
              row.is_read === 0 && "outline outline-1 -outline-offset-1 outline-brand/25",
            )}
            onClick={async () => {
              if (row.is_read === 0) {
                await markNotificationRead({ data: { id: row.id } });
                await router.invalidate();
              }
              if (row.user_id) {
                await navigate({
                  to: "/admin/danisan/$id",
                  params: { id: String(row.user_id) },
                });
              } else if (row.href === "/admin/randevular") {
                await navigate({ to: "/admin/randevular", search: { view: "pending" } });
              }
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <NotifKind kind={row.kind} />
              {row.is_read === 0 ? (
                <span className="size-2 rounded-full bg-brand" aria-label="Okunmadı" />
              ) : null}
              <span className="ml-auto text-xs text-muted">
                {formatDateTimeTr(row.created_at)}
              </span>
            </div>
            <p className="mt-2 font-medium">{row.title}</p>
            {row.body ? (
              <p className={cn("mt-1 text-sm text-ink-soft", row.kind === "briefing" ? "whitespace-pre-wrap" : "line-clamp-2")}>
                {row.body}
              </p>
            ) : null}
            {row.client_name && !row.title.includes(row.client_name) ? (
              <p className="mt-1 text-xs text-muted">{row.client_name}</p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={disabled}
      onClick={async () => {
        await markAllNotificationsRead();
        toast.success("Tümü okundu sayıldı.");
        await router.invalidate();
      }}
    >
      Tümünü okundu say
    </button>
  );
}

export function NotificationsLink({ count }: { count: number }) {
  return (
    <Link to="/admin/bildirimler" search={{ all: false }} className="text-sm text-brand">
      Tümü{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
