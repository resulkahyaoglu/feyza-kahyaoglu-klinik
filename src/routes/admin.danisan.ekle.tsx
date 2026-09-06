import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { createClient } from "@/lib/actions";

export const Route = createFileRoute("/admin/danisan/ekle")({
  loader: async () => {
    const { loadAdminDashboard } = await import("@/lib/actions");
    const data = await loadAdminDashboard();
    if (!data.auth) throw redirect({ to: "/admin/login" });
    return {};
  },
  component: NewClient,
});

function NewClient() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  return (
    <AdminShell title="Yeni danışan">
      <form
        className="surface max-w-xl space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const tw = String(fd.get("targetWeight") || "");
          setPending(true);
          try {
            const res = await createClient({
              data: {
                fullName: String(fd.get("fullName") || ""),
                phone: String(fd.get("phone") || ""),
                password: String(fd.get("password") || ""),
                email: String(fd.get("email") || ""),
                gender: String(fd.get("gender") || "") === "erkek" ? "erkek" : "kadin",
                hasIshape: fd.get("hasIshape") === "on",
                notes: String(fd.get("notes") || ""),
                targetWeight: tw ? Number(tw) : undefined,
              },
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Danışan açıldı.");
            await navigate({ to: "/admin/danisan/$id", params: { id: String(res.id) } });
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="field">
          <label htmlFor="fullName">Ad soyad</label>
          <input id="fullName" name="fullName" required />
        </div>
        <div className="field">
          <span>Cinsiyet</span>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="gender" value="kadin" required className="accent-brand" />
              Kadın
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="gender" value="erkek" className="accent-brand" />
              Erkek
            </label>
          </div>
        </div>
        <div className="field">
          <label htmlFor="phone">Telefon (giriş için)</label>
          <input id="phone" name="phone" required inputMode="tel" placeholder="05XX XXX XX XX" />
        </div>
        <div className="field">
          <label htmlFor="password">Geçici şifre</label>
          <input id="password" name="password" required minLength={4} />
        </div>
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" />
        </div>
        <div className="field">
          <label htmlFor="targetWeight">Hedef kilo (kg)</label>
          <input id="targetWeight" name="targetWeight" type="number" step="0.1" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hasIshape" className="size-4 accent-brand" />
          i-Shape EMS açık
        </label>
        <div className="field">
          <label htmlFor="notes">Not</label>
          <textarea id="notes" name="notes" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Danışan aç"}
        </button>
      </form>
    </AdminShell>
  );
}
