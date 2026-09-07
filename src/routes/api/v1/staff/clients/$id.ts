import { createFileRoute } from "@tanstack/react-router";
import { normalizePhone } from "@/lib/clinic";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import {
  db,
  findClientById,
  findClientByPhone,
  getStaffRole,
} from "@/lib/session";

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
          if (!user) {
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
              is_active: user.is_active === 1,
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
      PATCH: async ({ request, params }) =>
        runApi(request, async () => {
          const role = getStaffRole();
          if (!role) {
            return jsonResponse(
              request,
              { ok: false, error: "Personel oturumu gerekli." },
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

          const body = await readJsonBody<{
            fullName?: string;
            name?: string;
            phone?: string;
            notes?: string;
            isActive?: boolean;
            active?: boolean;
            email?: string;
            hasIshape?: boolean;
            gender?: string;
            targetWeight?: number | null;
          }>(request);

          const sql = await db();
          const user = await findClientById(sql, id);
          if (!user) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan bulunamadı." },
              { status: 404 },
            );
          }

          const fullNameRaw = body?.fullName ?? body?.name;
          const fullName =
            fullNameRaw !== undefined
              ? String(fullNameRaw).trim() || user.full_name
              : user.full_name;
          if (fullName.length < 3) {
            return jsonResponse(
              request,
              { ok: false, error: "Ad soyad gerekli." },
              { status: 400 },
            );
          }

          let phone = user.phone;
          if (body?.phone !== undefined) {
            phone = normalizePhone(String(body.phone));
            if (phone.length !== 11) {
              return jsonResponse(
                request,
                { ok: false, error: "Geçerli telefon girin." },
                { status: 400 },
              );
            }
            if (phone !== user.phone) {
              const other = await findClientByPhone(sql, phone);
              if (other && other.id !== id) {
                return jsonResponse(
                  request,
                  { ok: false, error: "Bu telefon zaten kayıtlı." },
                  { status: 400 },
                );
              }
            }
          }

          const notes =
            body?.notes !== undefined
              ? String(body.notes).trim() || null
              : user.notes;
          const activeFlag =
            body?.isActive !== undefined
              ? body.isActive
              : body?.active !== undefined
                ? body.active
                : undefined;
          const isActive =
            activeFlag === undefined ? user.is_active : activeFlag ? 1 : 0;
          const email =
            body?.email !== undefined
              ? String(body.email).trim() || null
              : user.email;
          const hasI =
            body?.hasIshape === undefined
              ? user.has_ishape
              : body.hasIshape
                ? 1
                : 0;
          let gender = user.gender;
          if (body?.gender !== undefined) {
            const g = String(body.gender);
            if (g === "erkek" || g === "kadin") gender = g;
          }
          const target =
            body?.targetWeight === undefined
              ? user.target_weight
              : body.targetWeight;

          await sql`
            update users set
              full_name = ${fullName},
              phone = ${phone},
              email = ${email},
              notes = ${notes},
              target_weight = ${target},
              gender = ${gender},
              has_ishape = ${hasI},
              is_active = ${isActive}
            where id = ${id}
          `;

          return jsonResponse(request, {
            ok: true,
            id,
            client: {
              id,
              full_name: fullName,
              phone,
              notes: notes ?? "",
              is_active: isActive === 1,
            },
          });
        }),
    },
  },
});
