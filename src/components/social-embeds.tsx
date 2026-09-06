import { ExternalLink, Instagram, MapPin, Navigation } from "lucide-react";
import { CLINIC } from "@/lib/clinic";

export function InstagramSection() {
  return (
    <section className="bg-cream border-y border-line">
      <div className="page-wrap py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Instagram
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl">Güncel paylaşımlar</h2>
            <p className="mt-2 max-w-lg text-muted">
              Mutfak, süreç ve i-Shape notları @{CLINIC.instagramHandle} hesabında.
            </p>
          </div>
          <a
            href={CLINIC.instagram}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
          >
            <Instagram className="size-4" />
            Takip et
          </a>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <div className="surface p-6">
            <div className="flex items-center gap-3">
              <span className="icon-mark">
                <Instagram className="size-5" />
              </span>
              <div>
                <p className="font-medium">Dyt. {CLINIC.name}</p>
                <p className="text-sm text-muted">@{CLINIC.instagramHandle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Online diyet, yüz yüze danışmanlık ve i-Shape EMS. Randevu ve bilgi
              için {CLINIC.phone}.
            </p>
            <a
              href={CLINIC.instagram}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand"
            >
              Instagram’da aç
              <ExternalLink className="size-3.5" />
            </a>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-line bg-sand-deep">
            <iframe
              title="Instagram — Dyt. Feyza Kahyaoğlu"
              src={`https://www.instagram.com/${CLINIC.instagramHandle}/embed/`}
              className="block h-[560px] w-full bg-cream md:h-[640px]"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MapSection({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? "" : "bg-brand-mist"}>
      <div className={compact ? "" : "page-wrap py-16 md:py-24"}>
        {!compact ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Konum
              </p>
              <h2 className="mt-2 text-3xl md:text-4xl">Kliniğe gelin.</h2>
            </div>
            <a
              href={CLINIC.mapsShare}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              <Navigation className="size-4" />
              Google Haritalar
            </a>
          </div>
        ) : null}

        <div
          className={`grid items-stretch gap-5 ${compact ? "" : "mt-8 md:grid-cols-[0.85fr_1.15fr]"}`}
        >
          {compact ? null : (
          <div className="surface flex flex-col justify-between p-6">
            <div>
              <span className="icon-mark">
                <MapPin className="size-5" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                Adres
              </p>
              <p className="mt-2 font-medium leading-relaxed">{CLINIC.address}</p>
              <p className="mt-3 text-sm text-muted">{CLINIC.hours}</p>
              <a
                href={`tel:+90${CLINIC.phoneRaw.slice(1)}`}
                className="mt-1 block text-sm text-brand"
              >
                {CLINIC.phone}
              </a>
            </div>
            <a
              href={CLINIC.mapsShare}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-6 w-full"
            >
              <Navigation className="size-4" />
              Yol tarifi
            </a>
          </div>
          )}
          <div className="overflow-hidden rounded-[24px] border border-line bg-sand-deep min-h-72">
            <iframe
              title="Klinik konumu — Google Haritalar"
              src={CLINIC.mapsEmbed}
              className="block h-full min-h-72 w-full md:min-h-[22rem]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}