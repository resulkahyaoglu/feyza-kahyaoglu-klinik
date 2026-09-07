import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

type NotifRow = {
  id: number;
  user_id: number | null;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  is_read: number;
  created_at: string;
  client_name: string | null;
};

export const Route = createFileRoute("/api/v1/staff/notifications/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }

          const hideBriefing = role === "assistant";
          const sql = await db();
          const items = await sql.query<NotifRow>(
            `select n.id, n.user_id, n.kind, n.title, n.body, n.href, n.is_read,
                    n.created_at::text as created_at, u.full_name as client_name
             from admin_notifications n
             left join users u on u.id = n.user_id
             ${hideBriefing ? "where n.kind not in ('briefing','assistant')" : ""}
             order by n.created_at desc
             limit 50`,
          );
          const countRows = await sql.query<{ n: number }>(
            `select count(*)::int as n from admin_notifications
             where is_read = 0${hideBriefing ? " and kind not in ('briefing','assistant')" : ""}`,
          );

          return jsonResponse(request, {
            auth: true,
            role,
            unread: countRows[0]?.n ?? 0,
            notifications: items.map((n) => ({
              id: n.id,
              user_id: n.user_id,
              kind: n.kind,
              title: n.title,
              body: n.body ?? "",
              href: n.href ?? "",
              is_read: n.is_read === 1,
              created_at: String(n.created_at).slice(0, 19),
              client_name: n.client_name ?? "",
            })),
          });
        }),
    },
  },
});
