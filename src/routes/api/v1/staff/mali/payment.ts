import { createFileRoute } from "@tanstack/react-router";
import { todayISO } from "@/lib/clinic";
import {
  jsonResponse,
  optionsResponse,
  readJsonBody,
  runApi,
} from "@/lib/mobile-api.server";
import { db, findClientById, getStaffRole } from "@/lib/session";

const METHODS = new Set(["nakit", "kredi-karti", "havale", "diger"]);

export const Route = createFileRoute("/api/v1/staff/mali/payment")({
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
            paidAt?: string;
            amount?: number;
            method?: string;
            notes?: string;
            applyToDebt?: boolean;
          }>(request);

          const userId = Number(body?.userId);
          const amount = Math.round(Number(body?.amount ?? 0));
          const method = String(body?.method || "nakit").trim();
          const paidAt = String(body?.paidAt || todayISO()).slice(0, 10);

          if (!Number.isFinite(userId) || userId <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Danışan seçin." },
              { status: 400 },
            );
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || amount <= 0) {
            return jsonResponse(
              request,
              { ok: false, error: "Tarih ve tutar gerekli." },
              { status: 400 },
            );
          }
          if (!METHODS.has(method)) {
            return jsonResponse(
              request,
              { ok: false, error: "Geçersiz ödeme yöntemi." },
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

          const inserted = await sql<{ id: number }>`
            insert into payments (user_id, paid_at, amount, method, notes)
            values (
              ${userId}, ${paidAt}, ${amount}, ${method},
              ${body?.notes?.trim() || null}
            )
            returning id
          `;
          const paymentId = inserted[0]!.id;

          if (body?.applyToDebt !== false) {
            const bal = await sql<{ n: number }>`
              select coalesce(
                sum(case when kind = 'borc' then amount else -amount end),
                0
              )::int as n
              from client_debts
              where user_id = ${userId}
            `;
            const remaining = bal[0]?.n ?? 0;
            const settle = Math.min(amount, Math.max(0, remaining));
            if (settle > 0) {
              await sql`
                insert into client_debts (user_id, kind, amount, notes, payment_id)
                values (
                  ${userId},
                  'tahsilat',
                  ${settle},
                  ${body?.notes?.trim() || "Ödemeden düşüldü"},
                  ${paymentId}
                )
              `;
            }
          }

          return jsonResponse(request, { ok: true, id: paymentId });
        }),
    },
  },
});
