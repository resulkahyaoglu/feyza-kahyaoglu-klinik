import { createFileRoute } from "@tanstack/react-router";
import { addDaysISO, todayISO } from "@/lib/clinic";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

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

function isISODate(s: string | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
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
            appointments: appointments.map((a) => ({
              id: a.id,
              appointment_date: String(a.appointment_date).slice(0, 10),
              appointment_time: a.appointment_time,
              service_name: a.service_name ?? "",
              client_name: a.client_name ?? "",
              client_phone: a.client_phone ?? "",
              status: a.status,
              notes: a.notes ?? "",
              user_id: a.user_id,
            })),
          });
        }),
    },
  },
});
