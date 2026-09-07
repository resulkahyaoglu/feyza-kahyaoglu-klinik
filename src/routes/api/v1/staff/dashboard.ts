import { createFileRoute } from "@tanstack/react-router";
import { todayISO } from "@/lib/clinic";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

type TodayAppt = {
  id: number;
  appointment_date: string;
  appointment_time: string;
  service_name: string | null;
  client_name: string | null;
  client_phone: string | null;
  status: string;
  notes: string | null;
};

export const Route = createFileRoute("/api/v1/staff/dashboard")({
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
          const hideBriefing = role === "assistant";

          let username: string | undefined;
          try {
            const rows = await sql.query<{ username: string }>(
              `select username from staff_accounts where role = $1 limit 1`,
              [role],
            );
            const u = rows[0]?.username?.trim();
            if (u) username = u;
          } catch {
            /* optional */
          }

          const appointments = await sql.query<TodayAppt>(
            `select id,
                    appointment_date::text as appointment_date,
                    appointment_time,
                    service_name,
                    client_name,
                    client_phone,
                    status,
                    notes
             from appointments
             where appointment_date = $1 and status <> 'iptal'
             order by appointment_time`,
            [today],
          );

          const counts = await sql.query<{
            appointments_today: number;
            clients_active: number;
            pending_requests: number;
            unread_notifications: number;
          }>(
            `select
              (select count(*)::int from appointments
                 where appointment_date = $1 and status <> 'iptal') as appointments_today,
              (select count(*)::int from users where is_active = 1) as clients_active,
              (select count(*)::int from appointment_requests
                 where status = 'beklemede') as pending_requests,
              (select count(*)::int from admin_notifications
                 where is_read = 0${hideBriefing ? " and kind not in ('briefing','assistant')" : ""}) as unread_notifications
            `,
            [today],
          );

          const c = counts[0] ?? {
            appointments_today: 0,
            clients_active: 0,
            pending_requests: 0,
            unread_notifications: 0,
          };

          return jsonResponse(request, {
            auth: true,
            role,
            ...(username ? { username } : {}),
            today,
            summary: {
              appointmentsToday: c.appointments_today,
              clientsActive: c.clients_active,
              pendingRequests: c.pending_requests,
              unreadNotifications: c.unread_notifications,
            },
            appointments: appointments.map((a) => ({
              id: a.id,
              appointment_date: String(a.appointment_date).slice(0, 10),
              appointment_time: a.appointment_time,
              service_name: a.service_name ?? "",
              client_name: a.client_name ?? "",
              client_phone: a.client_phone ?? "",
              status: a.status,
              notes: a.notes ?? "",
            })),
          });
        }),
    },
  },
});
