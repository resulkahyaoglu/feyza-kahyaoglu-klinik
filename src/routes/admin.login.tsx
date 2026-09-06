import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mark } from "@/components/logo";
import { adminLogin } from "@/lib/actions";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });

function AdminLogin() {
  const navigate = useNavigate();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-sand px-4">
      <form
        className="surface w-full max-w-md p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setPending(true);
          try {
            const res = await adminLogin({
              data: {
                username: String(fd.get("username") || ""),
                password: String(fd.get("password") || ""),
              },
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            await router.invalidate();
            await navigate({ to: "/admin" });
          } catch {
            toast.error("Giriş yapılamadı. Tekrar deneyin.");
          } finally {
            setPending(false);
          }
        }}
      >
        <Link to="/" className="flex flex-col items-center text-center">
          <Mark className="size-16" size={64} />
          <span className="mt-3 font-display text-lg font-semibold tracking-tight text-ink">
            Feyza Kahyaoğlu
          </span>
          <span className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted">
            Diyetisyen
          </span>
        </Link>
        <h1 className="mt-6 text-center text-3xl">Yönetim</h1>
        <p className="mt-1 text-center text-sm text-muted">Diyetisyen paneli</p>
        <div className="mt-6 field">
          <label htmlFor="username">Kullanıcı adı</label>
          <input id="username" name="username" required autoComplete="username" />
        </div>
        <div className="mt-4 field">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={pending}>
          {pending ? "Giriş…" : "Giriş"}
        </button>
        <p className="mt-4 text-center text-sm">
          <a href="/asistan/giris" className="text-muted hover:text-ink">
            Asistan girişi
          </a>
        </p>
      </form>
    </div>
  );
}
