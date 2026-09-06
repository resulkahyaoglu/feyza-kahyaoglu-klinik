import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicShell } from "@/components/site-chrome";
import { submitForgotPassword } from "@/lib/actions";

export const Route = createFileRoute("/sifremi-unuttum")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <PublicShell>
      <div className="page-wrap-narrow py-16 md:py-24">
        <div className="surface mx-auto max-w-md p-8">
          <h1 className="text-3xl">Şifremi unuttum</h1>
          {sent ? (
            <p className="mt-4 text-muted">
              Talebiniz alındı. Şifreniz için sizinle iletişime geçilecektir.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                Kayıtlı telefonunuzu yazın. Şifre sıfırlama diyetisyen tarafından
                yapılır; sizinle iletişime geçilir.
              </p>
              <form
                className="mt-6 space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  setPending(true);
                  try {
                    await submitForgotPassword({
                      data: { phone: String(fd.get("phone") || "") },
                    });
                    setSent(true);
                    toast.success("Talebiniz alındı. Diyetisyeninize iletildi.");
                  } catch {
                    toast.error("Gönderilemedi. Tekrar deneyin.");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <div className="field">
                  <label htmlFor="phone">Telefon</label>
                  <input id="phone" name="phone" required inputMode="tel" placeholder="05XX XXX XX XX" />
                </div>
                <button type="submit" className="btn btn-primary w-full" disabled={pending}>
                  {pending ? "Gönderiliyor…" : "Talep gönder"}
                </button>
              </form>
            </>
          )}
          <p className="mt-4 text-center text-sm">
            <Link to="/giris" className="text-brand">
              Girişe dön
            </Link>
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
