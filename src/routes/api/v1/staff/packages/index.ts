import { createFileRoute } from "@tanstack/react-router";
import { nowTimeIstanbul, todayISO } from "@/lib/clinic";
import { packageRemaining } from "@/lib/packages";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

type PackageRow = {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  total: number;
  next_no: number;
  unit: string;
  notes: string | null;
  is_active: number;
  created_at: string;
  client_name: string;
  remaining: number;
  next_date: string | null;
  next_time: string | null;
};

export const Route = createFileRoute("/api/v1/staff/packages/")({
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
          const today = todayISO();
          const clock = nowTimeIstanbul();
          let rows: PackageRow[] = [];
          try {
            rows = await sql.query<PackageRow>(
              `select p.id, p.user_id, p.kind, p.title, p.total, p.next_no, p.unit, p.notes,
                      p.is_active, p.created_at::text as created_at,
                      u.full_name as client_name,
                      greatest(0, p.total - p.next_no + 1)::int as remaining,
                      na.appointment_date::text as next_date,
                      na.appointment_time as next_time
               from client_packages p
               join users u on u.id = p.user_id
               left join lateral (
                 select appointment_date, appointment_time
                 from appointments a
                 where a.user_id = p.user_id
                   and a.status in ('onaylandi', 'beklemede')
                   and (
                     a.appointment_date > $1
                     or (a.appointment_date = $1 and a.appointment_time >= $2)
                   )
                 order by a.appointment_date, a.appointment_time
                 limit 1
               ) na on true
               order by p.is_active desc, remaining asc, u.full_name
               limit 400`,
              [today, clock],
            );
          } catch (err) {
            console.error("[api/v1] staff/packages", err);
            rows = [];
          }

          const packages = rows.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            client_name: r.client_name,
            kind: r.kind,
            title: r.title,
            total: r.total,
            next_no: r.next_no,
            unit: r.unit,
            notes: r.notes ?? "",
            is_active: r.is_active === 1,
            remaining: r.remaining,
            next_date: r.next_date ? String(r.next_date).slice(0, 10) : null,
            next_time: r.next_time ?? null,
            created_at: String(r.created_at).slice(0, 19),
          }));

          const active = packages.filter((p) => p.is_active && p.remaining > 0);
          return jsonResponse(request, {
            auth: true,
            role,
            packages,
            counts: {
              active: active.length,
              last: active.filter((p) => p.remaining === 1).length,
              two: active.filter((p) => p.remaining === 2).length,
            },
          });
        }),
      PATCH: async ({ request }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { ok: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }

          const body = await readJsonBody<{
            id?: number;
            delta?: number;
            remaining?: number;
          }>(request);
          const id = Number(body?.id);
          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz paket." },
              { status: 400 },
            );
          }

          const sql = await db();
          const rows = await sql<{
            id: number;
            user_id: number;
            title: string;
            total: number;
            next_no: number;
            unit: string;
          }>`
            select id, user_id, title, total, next_no, unit
            from client_packages where id = ${id} limit 1
          `;
          const p = rows[0];
          if (!p) {
            return jsonResponse(
              request,
              { ok: false, error: "Paket bulunamadı." },
              { status: 404 },
            );
          }

          let next = p.next_no;
          if (body?.remaining != null && Number.isFinite(Number(body.remaining))) {
            const remaining = Math.max(0, Math.min(p.total, Math.floor(Number(body.remaining))));
            // remaining = total - next_no + 1  => next_no = total - remaining + 1
            next = Math.max(1, Math.min(p.total + 1, p.total - remaining + 1));
          } else {
            const delta = Number(body?.delta ?? 0);
            if (![-1, 0, 1].includes(delta)) {
              return jsonResponse(
                request,
                {
                  ok: false,
                  error: "delta -1/0/1 veya remaining gönderin.",
                },
                { status: 400 },
              );
            }
            next = Math.max(1, Math.min(p.total + 1, p.next_no + delta));
          }

          const active = next > p.total ? 0 : 1;
          await sql`update client_packages set next_no = ${next}, is_active = ${active} where id = ${p.id}`;
          const remaining = packageRemaining({ total: p.total, next_no: next });

          return jsonResponse(request, {
            ok: true,
            id: p.id,
            next_no: next,
            remaining,
            is_active: active === 1,
          });
        }),
    },
  },
});
