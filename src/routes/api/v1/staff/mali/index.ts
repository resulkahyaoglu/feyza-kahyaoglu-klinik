import { createFileRoute } from "@tanstack/react-router";
import { monthISO, monthRange } from "@/lib/clinic";
import { jsonResponse, optionsResponse, runApi } from "@/lib/mobile-api.server";
import { db, getStaffRole } from "@/lib/session";

type PaymentRow = {
  id: number;
  user_id: number;
  client_name: string;
  paid_at: string;
  amount: number;
  method: string;
  notes: string | null;
  created_at: string;
};

type DebtorRow = {
  id: number;
  full_name: string;
  phone: string;
  balance: number;
  last_note: string | null;
};

export const Route = createFileRoute("/api/v1/staff/mali/")({
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

          const hideTotals = role === "assistant";
          const url = new URL(request.url);
          const monthParam = url.searchParams.get("month") || "";
          const month = /^\d{4}-\d{2}$/.test(monthParam)
            ? monthParam
            : monthISO();
          const { from, to } = monthRange(month);
          const sql = await db();

          let payments: PaymentRow[] = [];
          let debtors: DebtorRow[] = [];
          try {
            payments = await sql<PaymentRow>`
              select p.id, p.user_id, u.full_name as client_name, p.paid_at, p.amount, p.method, p.notes,
                     p.created_at::text as created_at
              from payments p
              join users u on u.id = p.user_id
              where p.paid_at >= ${from} and p.paid_at <= ${to}
              order by p.paid_at desc, p.id desc
              limit 200
            `;
            debtors = await sql<DebtorRow>`
              select u.id, u.full_name, u.phone,
                     coalesce(sum(case when d.kind = 'borc' then d.amount else -d.amount end), 0)::int as balance,
                     (
                       select notes from client_debts x
                       where x.user_id = u.id and x.kind = 'borc'
                       order by x.created_at desc, x.id desc
                       limit 1
                     ) as last_note
              from users u
              join client_debts d on d.user_id = u.id
              group by u.id, u.full_name, u.phone
              having coalesce(sum(case when d.kind = 'borc' then d.amount else -d.amount end), 0) > 0
              order by balance desc, u.full_name
              limit 100
            `;
          } catch (err) {
            console.error("[api/v1] staff/mali", err);
          }

          const byMethod: Record<string, number> = {};
          let income = 0;
          for (const p of payments) {
            income += p.amount;
            byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
          }
          const totalDebt = debtors.reduce((s, d) => s + d.balance, 0);

          return jsonResponse(request, {
            auth: true,
            role,
            hideTotals,
            month,
            from,
            to,
            summary: {
              income: hideTotals ? null : income,
              totalDebt: hideTotals ? null : totalDebt,
              paymentCount: payments.length,
              debtorCount: debtors.length,
            },
            byMethod: hideTotals ? {} : byMethod,
            payments: payments.map((p) => ({
              id: p.id,
              user_id: p.user_id,
              client_name: p.client_name,
              paid_at: String(p.paid_at).slice(0, 10),
              amount: hideTotals ? null : p.amount,
              method: p.method,
              notes: p.notes ?? "",
            })),
            debtors: debtors.map((d) => ({
              id: d.id,
              full_name: d.full_name,
              phone: d.phone,
              balance: hideTotals ? null : d.balance,
              last_note: d.last_note ?? "",
            })),
          });
        }),
    },
  },
});
