import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { displayPhone } from "@/lib/clinic";
import { loadCredentials, updateClientLogin, updateStaffAccount } from "@/lib/actions";

export const Route = createFileRoute("/admin/sifreler")({
  loader: async () => {
    const data = await loadCredentials();
    if (!data.auth) throw redirect({ to: "/admin" });
    return data;
  },
  component: CredentialsPage,
});

function CredentialsPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;

  return (
    <AdminShell title="Şifrelerim">
      <p className="max-w-2xl text-sm text-muted">
        Yönetici ve asistan girişleri ile danışan telefon/şifreleri buradan değişir.
        Mevcut şifreler görünmez; yeni şifre yazılmazsa eskisi kalır.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StaffCard
          title="Yönetici paneli"
          hint="Yönetim girişi"
          defaultUsername={data.admin.username}
          onSave={async (username, password) => {
            const res = await updateStaffAccount({
              data: { role: "admin", username, password: password || undefined },
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Yönetici girişi güncellendi.");
            await router.invalidate();
          }}
        />
        <StaffCard
          title="Asistan paneli"
          hint="Asistan girişi"
          defaultUsername={data.assistant.username}
          onSave={async (username, password) => {
            const res = await updateStaffAccount({
              data: { role: "assistant", username, password: password || undefined },
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Asistan girişi güncellendi.");
            await router.invalidate();
          }}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-xl">Danışan girişleri</h2>
        <p className="mt-1 text-sm text-muted">
          Kullanıcı adı telefon numarasıdır. Şifreyi boş bırakırsanız değişmez.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="py-2">Danışan</th>
                <th>Telefon</th>
                <th>Yeni şifre</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <ClientLoginRow
                  key={c.id}
                  client={c}
                  onSaved={async () => {
                    await router.invalidate();
                  }}
                />
              ))}
            </tbody>
          </table>
          {data.clients.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Danışan yok.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}

function ClientLoginRow({
  client,
  onSaved,
}: {
  client: { id: number; full_name: string; phone: string; is_active: number };
  onSaved: () => Promise<void>;
}) {
  return (
    <tr className="border-t border-line">
      <td className="py-3 pr-3">
        <p className="font-medium">{client.full_name}</p>
        {client.is_active !== 1 ? <span className="chip chip-off">Pasif</span> : null}
      </td>
      <td className="py-3 pr-2">
        <form
          id={`login-${client.id}`}
          className="contents"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const res = await updateClientLogin({
              data: {
                id: client.id,
                phone: String(fd.get("phone") || ""),
                password: String(fd.get("password") || "") || undefined,
              },
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success(`${client.full_name} girişi güncellendi.`);
            const pass = form.querySelector<HTMLInputElement>('input[name="password"]');
            if (pass) pass.value = "";
            await onSaved();
          }}
        >
          <div className="field">
            <label className="sr-only" htmlFor={`phone-${client.id}`}>
              Telefon
            </label>
            <input
              id={`phone-${client.id}`}
              name="phone"
              defaultValue={client.phone}
              required
              autoComplete="off"
            />
          </div>
        </form>
      </td>
      <td className="py-3 pr-2">
        <div className="field">
          <label className="sr-only" htmlFor={`pass-${client.id}`}>
            Yeni şifre
          </label>
          <input
            form={`login-${client.id}`}
            id={`pass-${client.id}`}
            name="password"
            type="password"
            placeholder="Yeni şifre"
            autoComplete="new-password"
          />
        </div>
      </td>
      <td className="py-3">
        <button form={`login-${client.id}`} className="btn btn-sm btn-secondary" type="submit">
          Kaydet
        </button>
      </td>
    </tr>
  );
}

function StaffCard({
  title,
  hint,
  defaultUsername,
  onSave,
}: {
  title: string;
  hint: string;
  defaultUsername: string;
  onSave: (username: string, password: string) => Promise<void>;
}) {
  return (
    <form
      key={defaultUsername}
      className="surface grid gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const username = String(fd.get("username") || "");
        const password = String(fd.get("password") || "");
        const again = String(fd.get("again") || "");
        if (password && password !== again) {
          toast.error("Şifreler eşleşmiyor.");
          return;
        }
        await onSave(username, password);
      }}
    >
      <div>
        <h2 className="text-lg">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <div className="field">
        <label htmlFor={`${title}-user`}>Kullanıcı adı</label>
        <input
          id={`${title}-user`}
          name="username"
          defaultValue={defaultUsername}
          required
          autoComplete="off"
        />
      </div>
      <div className="field">
        <label htmlFor={`${title}-pass`}>Yeni şifre</label>
        <input
          id={`${title}-pass`}
          name="password"
          type="password"
          placeholder="Değişmeyecekse boş"
          autoComplete="new-password"
        />
      </div>
      <div className="field">
        <label htmlFor={`${title}-again`}>Şifre tekrar</label>
        <input id={`${title}-again`} name="again" type="password" autoComplete="new-password" />
      </div>
      <button className="btn btn-primary" type="submit">
        Kaydet
      </button>
    </form>
  );
}
