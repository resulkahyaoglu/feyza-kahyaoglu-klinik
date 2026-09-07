import { createFileRoute } from "@tanstack/react-router";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { db, findClientById, getStaffRole } from "@/lib/session";

export const Route = createFileRoute("/api/v1/staff/mali/debt")({
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
            userId?: number;
            amount?: number;
            notes?: string;
          }>(request);
          const userId = Number(body?.userId);
          const amount = Math.round(Number(body?.amount ?? 0));

          if (!Number.isFinite(userId) || userId <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan seçin." },
              { status: 400 },
            );
          }
          if (amount <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Tutar gerekli." },
              { status: 400 },
            );
          }

          const sql = await db();
          const user = await findClientById(sql, userId);
          if (!user) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan bulunamadı." },
              { status: 404 },
            );
          }

          const rows = await sql<{ id: number }>`
            insert into client_debts (user_id, kind, amount, notes)
            values (
              ${userId},
              'borc',
              ${amount},
              ${body?.notes?.trim() || null}
            )
            returning id
          `;

          return jsonResponse(request, { ok: true, id: rows[0]!.id });
        }),
    },
  },
});
