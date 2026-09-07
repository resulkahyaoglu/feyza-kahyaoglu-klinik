import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

type ClientListRow = {
  id: number;
  full_name: string;
  phone: string;
  last_panel_visit: string | null;
  has_ishape: number;
  notes: string | null;
};

function truncateNotes(notes: string | null, max = 120): string {
  const t = (notes ?? "").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export const Route = createFileRoute("/api/v1/staff/clients/")({
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

          const sql = await db();
          const url = new URL(request.url);
          const q = (url.searchParams.get("q") || "").trim();

          const rows = q
            ? await sql.query<ClientListRow>(
                `select id, full_name, phone,
                        last_panel_visit::text as last_panel_visit,
                        has_ishape, notes
                 from users
                 where is_active = 1
                   and (full_name ilike $1 or phone ilike $1)
                 order by full_name asc
                 limit 200`,
                [`%${q}%`],
              )
            : await sql.query<ClientListRow>(
                `select id, full_name, phone,
                        last_panel_visit::text as last_panel_visit,
                        has_ishape, notes
                 from users
                 where is_active = 1
                 order by full_name asc
                 limit 200`,
              );

          return jsonResponse(request, {
            auth: true,
            role,
            clients: rows.map((r) => ({
              id: r.id,
              full_name: r.full_name,
              phone: r.phone,
              last_panel_visit: r.last_panel_visit
                ? String(r.last_panel_visit).slice(0, 19)
                : null,
              has_ishape: r.has_ishape === 1,
              notes: truncateNotes(r.notes),
            })),
          });
        }),
    },
  },
});
