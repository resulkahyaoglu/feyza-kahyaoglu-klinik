import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  formatDateTr,
  formatPrice,
  monthISO,
  monthLabel,
  paymentMethodLabel,
  shiftMonth,
  todayISO,
} from "@/lib/clinic";
import {
  addExpense,
  addPayment,
  deleteExpense,
  deletePayment,
  loadFinance,
} from "@/lib/actions";

type Search = { month?: string };

export const Route = createFileRoute("/admin/mali")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    month: typeof s.month === "string" && /^\d{4}-\d{2}$/.test(s.month) ? s.month : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const data = await loadFinance({ data: { month: deps.month } });
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return data;
  },
  component: FinancePage,
});

function FinancePage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: "/admin/mali" });
  const router = useRouter();
  const [pendingPay, setPendingPay] = useState<number | null>(null);
  const [pendingExp, setPendingExp] = useState<number | null>(null);
  if (!data.auth) return null;
  const month = data.month;

  function goMonth(next: string) {
    void navigate({ search: { month: next } });
  }

  return (
    <AdminShell title="Mali">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => goMonth(shiftMonth(month, -1))}
        >
          Önceki
        </button>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && goMonth(e.target.value)}
          className="min-h-10 rounded-[14px] border border-line-strong bg-cream px-3 text-sm"
        />
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => goMonth(shiftMonth(month, 1))}
        >
          Sonraki
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => goMonth(monthISO())}
        >
          Bu ay
        </button>
        <p className="ml-auto text-sm text-muted">{monthLabel(month)}</p>
      </div>

      {data.hideTotals ? (
        <p className="mt-6 text-sm text-muted">
          Aylık toplam gelir ve gider yalnızca yöneticide görünür. Kayıt ekleyebilirsiniz; silmek için yönetici onayı gerekir.
        </p>
      ) : (
        <>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Gelen</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{formatPrice(data.income)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Gider</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{formatPrice(data.spend)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Net</p>
          <p className="stat-num mt-1 text-3xl text-brand-dark">{formatPrice(data.net)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Alacak</p>
          <p className="stat-num mt-1 text-3xl text-warn">{formatPrice(data.totalDebt)}</p>
          <p className="mt-1 text-xs text-muted">{data.debtors.length} borçlu danışan</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAYMENT_METHODS.map((m) => (
          <div key={m.key} className="surface p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{m.label}</p>
            <p className="stat-num mt-1 text-2xl text-brand-dark">
              {formatPrice(data.byMethod[m.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>
        </>
      )}

      <section className="mt-8">
        <h2 className="text-lg">Borçlular</h2>
        <p className="mt-1 text-sm text-muted">
          Üyelik başladı, ödeme henüz alınmadı. Tahsilat kaydı gelir hanesine yazılır, borç kapanır.
        </p>
        {data.debtors.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Borçlu danışan yok.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.debtors.map((d) => (
              <li
                key={d.id}
                className="surface flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <Link
                    to="/admin/danisan/$id"
                    params={{ id: String(d.id) }}
                    className="font-medium text-brand"
                  >
                    {d.full_name}
                  </Link>
                  {d.last_note ? (
                    <p className="text-sm text-muted">{d.last_note}</p>
                  ) : null}
                </div>
                <p className="stat-num text-xl text-warn">{formatPrice(d.balance)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg">Ödeme al</h2>
          <form
            className="surface mt-3 grid gap-3 p-5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const res = await addPayment({
                data: {
                  userId: Number(fd.get("userId")),
                  paidAt: String(fd.get("paidAt") || todayISO()),
                  amount: Number(fd.get("amount")),
                  method: String(fd.get("method")) as "nakit" | "kredi-karti" | "havale" | "diger",
                  notes: String(fd.get("notes") || ""),
                },
              });
              if (!res.ok) {
                toast.error(res.error ?? "Kaydedilemedi.");
                return;
              }
              toast.success("Ödeme kaydedildi.");
              form.reset();
              await router.invalidate();
            }}
          >
            <div className="field sm:col-span-2">
              <label htmlFor="userId">Danışan</label>
              <select id="userId" name="userId" required>
                <option value="">Seçin</option>
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="paidAt">Tarih</label>
              <input id="paidAt" name="paidAt" type="date" defaultValue={todayISO()} required />
            </div>
            <div className="field">
              <label htmlFor="amount">Tutar (TL)</label>
              <input id="amount" name="amount" type="number" min="1" step="1" required />
            </div>
            <div className="field">
              <label htmlFor="method">Yöntem</label>
              <select id="method" name="method" required defaultValue="nakit">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pnotes">Not</label>
              <input id="pnotes" name="notes" />
            </div>
            <button className="btn btn-primary sm:col-span-2" type="submit">
              Ödemeyi kaydet
            </button>
          </form>

          <ul className="mt-4 space-y-2">
            {data.payments.length === 0 ? (
              <li className="text-sm text-muted">Bu ay ödeme yok.</li>
            ) : (
              data.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
                >
                  <div>
                    <Link
                      to="/admin/danisan/$id"
                      params={{ id: String(p.user_id) }}
                      className="font-medium text-brand"
                    >
                      {p.client_name}
                    </Link>
                    <p className="text-muted">
                      {formatDateTr(p.paid_at)} · {paymentMethodLabel(p.method)}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="stat-num">{formatPrice(p.amount)}</p>
                    {data.role === "assistant" && data.pendingPayments.includes(p.id) ? (
                      <span className="chip chip-wait">Yönetici onayında</span>
                    ) : pendingPay === p.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            const res = await deletePayment({ data: { id: p.id } });
                            toast.success(
                              res.pending ? "Silme isteği yöneticiye iletildi." : "Ödeme silindi.",
                            );
                            setPendingPay(null);
                            await router.invalidate();
                          }}
                        >
                          Evet, sil
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setPendingPay(null)}
                        >
                          Vazgeç
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingPay(p.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-lg">Gider yaz</h2>
          <form
            className="surface mt-3 grid gap-3 p-5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const res = await addExpense({
                data: {
                  spentAt: String(fd.get("spentAt") || todayISO()),
                  amount: Number(fd.get("amount")),
                  category: String(fd.get("category") || ""),
                  notes: String(fd.get("notes") || ""),
                },
              });
              if (!res.ok) {
                toast.error(res.error ?? "Kaydedilemedi.");
                return;
              }
              toast.success("Gider kaydedildi.");
              form.reset();
              await router.invalidate();
            }}
          >
            <div className="field">
              <label htmlFor="spentAt">Tarih</label>
              <input id="spentAt" name="spentAt" type="date" defaultValue={todayISO()} required />
            </div>
            <div className="field">
              <label htmlFor="eamount">Tutar (TL)</label>
              <input id="eamount" name="amount" type="number" min="1" step="1" required />
            </div>
            <div className="field">
              <label htmlFor="category">Kalem</label>
              <input
                id="category"
                name="category"
                list="expense-cats"
                placeholder="Kira, maaş…"
                required
              />
              <datalist id="expense-cats">
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="enotes">Not</label>
              <input id="enotes" name="notes" />
            </div>
            <button className="btn btn-primary sm:col-span-2" type="submit">
              Gideri kaydet
            </button>
          </form>

          <ul className="mt-4 space-y-2">
            {data.expenses.length === 0 ? (
              <li className="text-sm text-muted">Bu ay gider yok.</li>
            ) : (
              data.expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{e.category}</p>
                    <p className="text-muted">
                      {formatDateTr(e.spent_at)}
                      {e.notes ? ` · ${e.notes}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="stat-num">{formatPrice(e.amount)}</p>
                    {data.role === "assistant" && data.pendingExpenses.includes(e.id) ? (
                      <span className="chip chip-wait">Yönetici onayında</span>
                    ) : pendingExp === e.id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={async () => {
                            const res = await deleteExpense({ data: { id: e.id } });
                            toast.success(
                              res.pending ? "Silme isteği yöneticiye iletildi." : "Gider silindi.",
                            );
                            setPendingExp(null);
                            await router.invalidate();
                          }}
                        >
                          Evet, sil
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setPendingExp(null)}
                        >
                          Vazgeç
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => setPendingExp(e.id)}
                      >
                        Sil
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}