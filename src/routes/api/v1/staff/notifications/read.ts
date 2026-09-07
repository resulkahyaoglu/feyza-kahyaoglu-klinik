import { createFileRoute } from "@tanstack/react-router";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/notifications/read")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      POST: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { ok: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }

          const body = await readJsonBody<{ id?: number; all?: boolean }>(request);
          const sql = await db();
          const hideBriefing = role === "assistant";

          if (body?.id != null && Number.isFinite(Number(body.id))) {
            const id = Number(body.id);
            if (hideBriefing) {
              await sql.query(
                `update admin_notifications set is_read = 1
                 where id = $1 and kind not in ('briefing','assistant')`,
                [id],
              );
            } else {
              await sql.query(
                `update admin_notifications set is_read = 1 where id = $1`,
                [id],
              );
            }
            return jsonResponse(request, { ok: true, id });
          }

          // default: mark all unread
          if (hideBriefing) {
            await sql.query(
              `update admin_notifications set is_read = 1
               where is_read = 0 and kind not in ('briefing','assistant')`,
            );
          } else {
            await sql.query(
              `update admin_notifications set is_read = 1 where is_read = 0`,
            );
          }
          return jsonResponse(request, { ok: true, all: true });
        }),
    },
  },
});
