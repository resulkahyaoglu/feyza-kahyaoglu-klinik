import { createFileRoute } from "@tanstack/react-router";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { db, getStaffRole, hashPassword } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/password/")({
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

          const body = await readJsonBody<{
            current?: string;
            next?: string;
            again?: string;
          }>(request);
          const current = String(body?.current || "");
          const next = String(body?.next || "");
          const again = body?.again !== undefined ? String(body.again) : next;

          if (next.length < 4) {
            return jsonResponse(
              request,
              { ok: false, error: "Yeni şifre en az 4 karakter olmalı." },
              { status: 400 },
            );
          }
          if (next !== again) {
            return jsonResponse(
              request,
              { ok: false, error: "Yeni şifreler eşleşmiyor." },
              { status: 400 },
            );
          }

          const sql = await db();
          const rows = await sql<{ username: string; password_hash: string }>`
            select username, password_hash from staff_accounts where role = ${role} limit 1
          `;
          const row = rows[0];
          if (!row) {
            return jsonResponse(
              request,
              { ok: false, error: "Hesap bulunamadı." },
              { status: 404 },
            );
          }
          if (hashPassword(current) !== row.password_hash) {
            return jsonResponse(
              request,
              { ok: false, error: "Mevcut şifre hatalı." },
              { status: 400 },
            );
          }

          await sql`
            update staff_accounts
            set password_hash = ${hashPassword(next)}, updated_at = now()
            where role = ${role}
          `;

          return jsonResponse(request, { ok: true });
        }),
    },
  },
});
