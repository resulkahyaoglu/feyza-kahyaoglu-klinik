import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { clientChangePassword, loadClientPanel } from "@/lib/actions";

export const Route = createFileRoute("/panel/sifre")({
  loader: async () => {
    const data = await loadClientPanel();
    if (!data.auth) throw redirect({ to: "/giris" });
    return data;
  },
  component: PasswordPage,
});

function PasswordPage() {
  const data = Route.useLoaderData();
  if (!data.auth) return null;

  return (
    <ClientShell name={data.user.full_name}>
      <h1 className="text-3xl">Şifre değiştir</h1>
      <form
        className="surface mt-6 max-w-lg space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const next = String(fd.get("next") || "");
          const again = String(fd.get("again") || "");
          if (next !== again) {
            toast.error("Yeni şifreler eşleşmiyor.");
            return;
          }
          const res = await clientChangePassword({
            data: { current: String(fd.get("current") || ""), next },
          });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("Şifre güncellendi.");
          e.currentTarget.reset();
        }}
      >
        <div className="field">
          <label htmlFor="current">Mevcut şifre</label>
          <input id="current" name="current" type="password" required />
        </div>
        <div className="field">
          <label htmlFor="next">Yeni şifre</label>
          <input id="next" name="next" type="password" required minLength={4} />
        </div>
        <div className="field">
          <label htmlFor="again">Yeni şifre (tekrar)</label>
          <input id="again" name="again" type="password" required minLength={4} />
        </div>
        <button className="btn btn-primary" type="submit">
          Güncelle
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link to="/panel/profil" className="text-brand">
          Profile dön
        </Link>
      </p>
    </ClientShell>
  );
}
