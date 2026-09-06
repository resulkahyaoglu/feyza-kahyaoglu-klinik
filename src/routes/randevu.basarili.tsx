import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { PublicShell } from "@/components/site-chrome";
import { CLINIC, whatsappLink } from "@/lib/clinic";

export const Route = createFileRoute("/randevu/basarili")({
  component: BookingSuccess,
});

function BookingSuccess() {
  return (
    <PublicShell>
      <div className="page-wrap-narrow py-20 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
          <Check className="size-7" />
        </span>
        <h1 className="mt-6 text-4xl">Talebiniz alındı</h1>
        <p className="mt-4 text-muted">
          Randevu henüz kesinleşmedi. Tercih ettiğiniz tarih ve saat için sizinle
          iletişime geçerek netleştiririz.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-secondary">
            Anasayfa
          </Link>
          <a
            className="btn btn-primary"
            href={whatsappLink(
              CLINIC.phoneRaw,
              `Merhaba, az önce randevu talebi gönderdim. Dyt. ${CLINIC.name}`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp’tan yaz
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
