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
  findClientByPhone,
  getStaffRole,
  hashPassword,
  makeTempPassword,
} from "@/lib/session";

type ClientListRow = {
  id: number;
  full_name: string;
  phone: string;
  last_panel_visit: string | null;
  has_ishape: number;
  notes: string | null;
  is_active?: number;
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
                        has_ishape, notes, is_active
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
                        has_ishape, notes, is_active
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
              is_active: (r.is_active ?? 1) === 1,
              notes: truncateNotes(r.notes),
            })),
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
            fullName?: string;
            name?: string;
            phone?: string;
            password?: string;
            email?: string;
            gender?: string;
            hasIshape?: boolean;
            notes?: string;
            targetWeight?: number;
          }>(request);

          const name = String(body?.fullName || body?.name || "").trim();
          const phone = normalizePhone(String(body?.phone || ""));
          const gender = String(body?.gender || "").trim() === "erkek" ? "erkek" : "kadin";
          const password =
            String(body?.password || "").trim() || makeTempPassword(phone);

          if (name.length < 3) {
            return jsonResponse(
              request,
              { ok: false, error: "Ad soyad gerekli." },
              { status: 400 },
            );
          }
          if (phone.length !== 11) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçerli telefon girin." },
              { status: 400 },
            );
          }
          if (password.length < 4) {
            return jsonResponse(
              request,
              { ok: false, error: "Şifre en az 4 karakter olmalı." },
              { status: 400 },
            );
          }

          const sql = await db();
          const existing = await findClientByPhone(sql, phone);
          if (existing) {
            return jsonResponse(
              request,
              { ok: false, error: "Bu telefon zaten kayıtlı." },
              { status: 400 },
            );
          }

          const rows = await sql<{ id: number }>`
            insert into users (full_name, phone, email, password, has_ishape, is_active, notes, target_weight, gender)
            values (
              ${name}, ${phone}, ${body?.email?.trim() || null}, ${hashPassword(password)},
              ${body?.hasIshape ? 1 : 0}, 1, ${body?.notes?.trim() || null},
              ${body?.targetWeight ?? null}, ${gender}
            ) returning id
          `;
          const id = rows[0]!.id;

          return jsonResponse(request, {
            ok: true,
            id,
            tempPassword: body?.password ? undefined : password,
          });
        }),
    },
  },
});
