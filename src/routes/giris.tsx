import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicShell } from "@/components/site-chrome";
import { clientLogin } from "@/lib/actions";

export const Route = createFileRoute("/giris")({ component: ClientLogin });

function ClientLogin() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  return (
    <PublicShell>
      <div className="page-wrap flex justify-center py-14 md:py-20">
        <div className="w-full max-w-md">
          <p className="font-display text-3xl tracking-tight text-brand-dark md:text-4xl">
            Hoş geldiniz
          </p>
          <p className="mt-2 text-sm text-muted">
            Telefon ve size verilen şifre ile girin.
          </p>
          <form
            className="surface mt-8 space-y-4 p-6 md:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setPending(true);
              try {
                const res = await clientLogin({
                  data: {
                    phone: String(fd.get("phone") || ""),
                    password: String(fd.get("password") || ""),
                  },
                });
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                await navigate({ to: "/panel" });
              } catch {
                toast.error("Giriş yapılamadı. Tekrar deneyin.");
              } finally {
                setPending(false);
              }
            }}
          >
            <div className="field">
              <label htmlFor="phone">Telefon</label>
              <input
                id="phone"
                name="phone"
                required
                inputMode="tel"
                autoComplete="username"
                placeholder="05XX XXX XX XX"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Şifre</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={pending}>
              {pending ? "Giriş yapılıyor…" : "Giriş"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            <Link to="/sifremi-unuttum" className="text-brand">
              Şifremi unuttum
            </Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
