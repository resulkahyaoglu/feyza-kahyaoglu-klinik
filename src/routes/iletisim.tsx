import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PublicShell } from "@/components/site-chrome";
import { MapSection } from "@/components/social-embeds";
import { CLINIC, whatsappLink } from "@/lib/clinic";

export const Route = createFileRoute("/iletisim")({ component: Contact });

function Contact() {
  const wa = whatsappLink(
    CLINIC.phoneRaw,
    `Merhaba, Dyt. ${CLINIC.name} ile görüşmek istiyorum.`,
  );
  return (
    <PublicShell>
      <div className="page-wrap py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          İletişim
        </p>
        <h1 className="mt-3 text-4xl md:text-5xl">Yazın, arayın, gelin.</h1>
        <p className="mt-4 max-w-xl text-muted">
          Randevu için sitedeki talep formunu kullanmanız yeterli. Onay ve saat
          netleştirmesi diyetisyen tarafından yapılır.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <a href={`tel:+90${CLINIC.phoneRaw.slice(1)}`} className="surface flex gap-4 p-6 hover:bg-brand-mist">
            <Phone className="size-5 text-brand" />
            <div>
              <p className="text-sm text-muted">Telefon</p>
              <p className="font-medium">{CLINIC.phone}</p>
            </div>
          </a>
          <a href={`mailto:${CLINIC.email}`} className="surface flex gap-4 p-6 hover:bg-brand-mist">
            <Mail className="size-5 text-brand" />
            <div>
              <p className="text-sm text-muted">E-posta</p>
              <p className="font-medium">{CLINIC.email}</p>
            </div>
          </a>
          <a href={wa} target="_blank" rel="noreferrer" className="surface flex gap-4 p-6 hover:bg-brand-mist">
            <MessageCircle className="size-5 text-brand" />
            <div>
              <p className="text-sm text-muted">WhatsApp</p>
              <p className="font-medium">Hazır mesajla yazın</p>
            </div>
          </a>
          <a href={CLINIC.instagram} target="_blank" rel="noreferrer" className="surface flex gap-4 p-6 hover:bg-brand-mist">
            <Instagram className="size-5 text-brand" />
            <div>
              <p className="text-sm text-muted">Instagram</p>
              <p className="font-medium">@{CLINIC.instagramHandle}</p>
            </div>
          </a>
          <a href={CLINIC.mapsShare} target="_blank" rel="noreferrer" className="surface flex gap-4 p-6 hover:bg-brand-mist">
            <MapPin className="size-5 text-brand" />
            <div>
              <p className="text-sm text-muted">Konum</p>
              <p className="font-medium">{CLINIC.address}</p>
              <p className="text-sm text-muted">{CLINIC.hours}</p>
            </div>
          </a>
        </div>
        <div className="mt-8">
          <MapSection compact />
        </div>
      </div>
    </PublicShell>
  );
}
