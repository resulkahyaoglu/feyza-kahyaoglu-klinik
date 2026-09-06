import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { ClientShell } from "@/components/client-shell";
import { formatDateTimeTr } from "@/lib/clinic";
import { clientSendMessage, loadClientPanel } from "@/lib/actions";

export const Route = createFileRoute("/panel/mesaj")({
  loader: async () => {
    const data = await loadClientPanel();
    if (!data.auth) throw redirect({ to: "/giris" });
    return data;
  },
  component: MessagesPage,
});

function MessagesPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  if (!data.auth) return null;

  return (
    <ClientShell name={data.user.full_name}>
      <h1 className="text-3xl">Mesajlar</h1>
      <p className="mt-1 text-sm text-muted">Diyetisyeninizle doğrudan yazışın.</p>
      <div className="surface mt-6 max-h-[50vh] space-y-2 overflow-y-auto p-4">
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted">Henüz mesaj yok. İlk notu siz bırakabilirsiniz.</p>
        ) : (
          data.messages.map((m) => (
            <div
              key={m.id}
              className={
                m.sender === "client"
                  ? "ml-8 rounded-2xl bg-brand px-3 py-2 text-sm text-sand"
                  : "mr-8 rounded-2xl bg-sand-deep px-3 py-2 text-sm"
              }
            >
              <p>{m.message}</p>
              <p className="mt-1 text-[10px] opacity-70">{formatDateTimeTr(m.created_at)}</p>
            </div>
          ))
        )}
      </div>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const message = String(fd.get("message") || "");
          const res = await clientSendMessage({ data: { message } });
          if (!res.ok) return;
          toast.success("Gönderildi.");
          e.currentTarget.reset();
          await router.invalidate();
        }}
      >
        <div className="field">
          <label htmlFor="message">Mesajınız</label>
          <textarea id="message" name="message" required />
        </div>
        <button className="btn btn-primary" type="submit">
          Gönder
        </button>
      </form>
    </ClientShell>
  );
}
