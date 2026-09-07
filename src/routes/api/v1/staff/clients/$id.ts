import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { db, findClientById, getStaffRole } from "@/lib/session";

type ApptBrief = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  service_name: string | null;
  status: string;
};

type MeasureBrief = {
  id: number;
  measure_date: string;
  weight: number | null;
};

type DietBrief = {
  id: number;
  title: string;
  is_active: number;
  created_at: string;
};

export const Route = createFileRoute("/api/v1/staff/clients/$id")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => optionsResponse(request),
      GET: async ({ request, params }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { auth: false, error: "Personel oturumu gerekli." },
              { status: 401 },
            );
          }

          const id = Number(params.id);
          if (!Number.isFinite(id) || id <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz danışan." },
              { status: 400 },
            );
          }

          const sql = await db();
          const user = await findClientById(sql, id);
          if (!user || user.is_active !== 1) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan bulunamadı." },
              { status: 404 },
            );
          }

          const [appts, measures, diets, counts] = await Promise.all([
            sql.query<ApptBrief>(
              `select id,
                      appointment_date::text as appointment_date,
                      appointment_time,
                      service_name,
                      status
               from appointments
               where user_id = $1 and status <> 'iptal'
               order by appointment_date desc, appointment_time desc
               limit 8`,
              [id],
            ),
            sql.query<MeasureBrief>(
              `select id, measure_date::text as measure_date, weight
               from measurements
               where user_id = $1
               order by measure_date desc
               limit 5`,
              [id],
            ),
            sql.query<DietBrief>(
              `select id, title, is_active, created_at::text as created_at
               from diet_lists
               where user_id = $1
               order by created_at desc
               limit 5`,
              [id],
            ),
            sql.query<{
              appointments: number;
              measures: number;
              diets: number;
            }>(
              `select
                 (select count(*)::int from appointments where user_id = $1) as appointments,
                 (select count(*)::int from measurements where user_id = $1) as measures,
                 (select count(*)::int from diet_lists where user_id = $1) as diets`,
              [id],
            ),
          ]);

          const c = counts[0] ?? { appointments: 0, measures: 0, diets: 0 };

          return jsonResponse(request, {
            auth: true,
            role,
            client: {
              id: user.id,
              full_name: user.full_name,
              phone: user.phone,
              email: user.email ?? "",
              gender: user.gender ?? "",
              has_ishape: user.has_ishape === 1,
              target_weight: user.target_weight ?? null,
              last_panel_visit: user.last_panel_visit
                ? String(user.last_panel_visit).slice(0, 19)
                : null,
              notes: (user.notes ?? "").trim(),
            },
            counts: {
              appointments: c.appointments,
              measures: c.measures,
              diets: c.diets,
            },
            recentAppointments: appts.map((a) => ({
              id: a.id,
              appointment_date: String(a.appointment_date).slice(0, 10),
              appointment_time: a.appointment_time,
              service_name: a.service_name ?? "",
              status: a.status,
            })),
            recentMeasures: measures.map((m) => ({
              id: m.id,
              measure_date: String(m.measure_date).slice(0, 10),
              weight: m.weight,
            })),
            recentDiets: diets.map((d) => ({
              id: d.id,
              title: d.title,
              is_active: d.is_active === 1,
              created_at: String(d.created_at).slice(0, 19),
            })),
          });
        }),
    },
  },
});
