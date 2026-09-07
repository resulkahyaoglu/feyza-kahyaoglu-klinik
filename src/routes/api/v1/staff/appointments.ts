import { createFileRoute } from "@tanstack/react-router";
import { addDaysISO, getService, todayISO, weeklyDates } from "@/lib/clinic";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { db, findClientById, getStaffRole } from "@/lib/session";

type ApptRow = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  service_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  status: string;
  notes: string | null;
  user_id: number | null;
};

const ALLOWED_STATUS = [
  "beklemede",
  "onaylandi",
  "iptal",
  "tamamlandi",
  "gelmedi",
] as const;

function isISODate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function mapAppt(a: ApptRow) {
  return {
    id: a.id,
    appointment_date: String(a.appointment_date).slice(0, 10),
    appointment_time: a.appointment_time,
    service_name: a.service_name ?? "",
    client_name: a.client_name ?? "",
    client_phone: a.client_phone ?? "",
    status: a.status,
    notes: a.notes ?? "",
    user_id: a.user_id,
  };
}

export const Route = createFileRoute("/api/v1/staff/appointments")({
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

          const url = new URL(request.url);
          const today = todayISO();
          const fromRaw = url.searchParams.get("from");
          const toRaw = url.searchParams.get("to");
          const from = isISODate(fromRaw) ? fromRaw : today;
          const to = isISODate(toRaw) ? toRaw : addDaysISO(today, 7);

          const sql = await db();
          const appointments = await sql.query<ApptRow>(
            `select id,
                    appointment_date::text as appointment_date,
                    appointment_time,
                    service_name,
                    client_name,
                    client_phone,
                    status,
                    notes,
                    user_id
             from appointments
             where appointment_date >= $1
               and appointment_date <= $2
               and status <> 'iptal'
             order by appointment_date asc, appointment_time asc
             limit 300`,
            [from, to],
          );

          return jsonResponse(request, {
            auth: true,
            role,
            from,
            to,
            appointments: appointments.map(mapAppt),
          });
        }),
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

          const body = await readJsonBody<{
            userId?: number;
            serviceKey?: string;
            date?: string;
            time?: string;
            weeks?: number;
            notes?: string;
            isMeasure?: boolean;
          }>(request);

          const userId = Number(body?.userId);
          const serviceKey = String(body?.serviceKey || "").trim();
          const date = String(body?.date || "").trim();
          const time = String(body?.time || "").trim();
          const weeksRaw = Number(body?.weeks ?? 1);
          const weeks = Number.isFinite(weeksRaw)
            ? Math.max(1, Math.min(9, Math.floor(weeksRaw)))
            : 1;

          if (!Number.isFinite(userId) || userId <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan seçin." },
              { status: 400 },
            );
          }
          const service = getService(serviceKey);
          if (!service) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz hizmet." },
              { status: 400 },
            );
          }
          if (!isISODate(date)) {
            return jsonResponse(
              request,
              { ok: false, error: "Tarih seçin." },
              { status: 400 },
            );
          }
          if (!/^\d{1,2}:\d{2}$/.test(time)) {
            return jsonResponse(
              request,
              { ok: false, error: "Saat seçin." },
              { status: 400 },
            );
          }

          const sql = await db();
          const user = await findClientById(sql, userId);
          if (!user || user.is_active !== 1) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan bulunamadı." },
              { status: 404 },
            );
          }

          const dates = weeklyDates(date, weeks);
          const notes = body?.notes?.trim() || null;
          const isMeasure = body?.isMeasure ? 1 : 0;
          try {
            await sql.query(
              "alter table appointments add column if not exists is_measure integer not null default 0",
            );
          } catch {
            /* exists */
          }

          const createdIds: number[] = [];
          for (const d of dates) {
            const rows = await sql<{ id: number }>`
              insert into appointments (
                user_id, service_key, service_name, duration, price,
                client_name, client_phone, client_email,
                appointment_date, appointment_time, notes, status, is_measure
              ) values (
                ${user.id}, ${service.key}, ${service.name}, ${service.duration}, ${service.price},
                ${user.full_name}, ${user.phone}, ${user.email},
                ${d}, ${time}, ${notes}, 'onaylandi', ${isMeasure}
              )
              returning id
            `;
            if (rows[0]?.id) createdIds.push(rows[0].id);
          }

          return jsonResponse(request, {
            ok: true,
            count: createdIds.length,
            ids: createdIds,
            dates,
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
            status?: string;
            adminNotes?: string;
          }>(request);
          const id = Number(body?.id);
          const status = String(body?.status || "").trim();

          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz randevu." },
              { status: 400 },
            );
          }
          if (
            !ALLOWED_STATUS.includes(
              status as (typeof ALLOWED_STATUS)[number],
            )
          ) {
            return jsonResponse(
              request,
              {
                ok: false,
                error:
                  "Geçersiz durum. beklemede/onaylandi/iptal/tamamlandi/gelmedi kullanın.",
              },
              { status: 400 },
            );
          }

          const sql = await db();
          const found = await sql.query<{ id: number }>(
            `select id from appointments where id = $1`,
            [id],
          );
          if (!found[0]) {
            return jsonResponse(
              request,
              { ok: false, error: "Randevu bulunamadı." },
              { status: 404 },
            );
          }

          const adminNotes =
            body?.adminNotes !== undefined
              ? body.adminNotes.trim() || null
              : null;

          if (status === "iptal") {
            try {
              const ticks = await sql.query<{ package_id: number }>(
                `select package_id from package_ticks where appointment_id = $1`,
                [id],
              );
              for (const t of ticks) {
                await sql`
                  update client_packages
                  set next_no = greatest(1, next_no - 1),
                      is_active = 1
                  where id = ${t.package_id}
                `;
              }
              await sql`delete from package_ticks where appointment_id = ${id}`;
            } catch {
              /* optional */
            }
            await sql`
              update appointments
              set status = ${status},
                  admin_notes = coalesce(${adminNotes}, admin_notes),
                  cancelled_at = coalesce(cancelled_at, now()),
                  cancelled_by = coalesce(cancelled_by, ${role})
              where id = ${id}
            `;
          } else if (status === "tamamlandi" || status === "gelmedi") {
            await sql`
              update appointments
              set status = ${status},
                  admin_notes = coalesce(${adminNotes}, admin_notes)
              where id = ${id}
            `;
          } else {
            await sql`
              update appointments
              set status = ${status},
                  admin_notes = coalesce(${adminNotes}, admin_notes),
                  cancelled_at = null,
                  cancelled_by = null
              where id = ${id}
            `;
          }

          return jsonResponse(request, { ok: true, id, status });
        }),
    },
  },
});
