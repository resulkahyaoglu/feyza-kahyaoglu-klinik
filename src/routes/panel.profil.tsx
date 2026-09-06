import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { displayPhone } from "@/lib/clinic";
import { clientUpdateProfile, loadClientPanel } from "@/lib/actions";

export const Route = createFileRoute("/panel/profil")({
  loader: async () => {
    const data = await loadClientPanel();
    if (!data.auth) throw redirect({ to: "/giris" });
    return data;
  },
  component: ProfilePage,
});

function ProfilePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;
  const { user } = data;

  return (
    <ClientShell name={user.full_name}>
      <h1 className="text-3xl">Profil</h1>
      <form
        className="surface mt-6 max-w-lg space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await clientUpdateProfile({
            data: { email: String(fd.get("email") || "") },
          });
          toast.success("Profil güncellendi.");
          await router.invalidate();
        }}
      >
        <div className="field">
          <label>Ad soyad</label>
          <input value={user.full_name} disabled />
        </div>
        <div className="field">
          <label>Telefon</label>
          <input value={displayPhone(user.phone)} disabled />
        </div>
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" defaultValue={user.email ?? ""} />
        </div>
        <button className="btn btn-primary" type="submit">
          Kaydet
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link to="/panel/sifre" className="text-brand">
          Şifre değiştir
        </Link>
      </p>
    </ClientShell>
  );
}
