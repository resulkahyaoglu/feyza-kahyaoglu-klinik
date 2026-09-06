import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, Home, Instagram, Menu, Phone, Sparkles, UserRound, X } from "lucide-react";
import { useState } from "react";
import { CLINIC, whatsappLink } from "@/lib/clinic";
import { Logo } from "@/components/logo";
import { WhatsAppBubble } from "@/components/whatsapp-bubble";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Anasayfa", icon: Home },
  { to: "/hakkimda", label: "Hakkımda", icon: UserRound },
  { to: "/hizmetler", label: "Hizmetler", icon: Sparkles },
  { to: "/randevu", label: "Randevu", icon: Calendar },
  { to: "/iletisim", label: "İletişim", icon: Phone },
] as const;

export function SiteHeader({ inverted = false }: { inverted?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header
      className={cn(
        "relative z-30",
        inverted ? "text-sand" : "bg-sand/90 text-ink backdrop-blur-md",
      )}
    >
      <div className="page-wrap flex items-center gap-3 py-4">
        <Logo inverted={inverted} />
        <nav className="ml-4 hidden items-center gap-7 text-sm font-medium md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "inline-flex items-center gap-1.5 transition-colors",
                pathname === item.to
                  ? inverted
                    ? "text-sand"
                    : "text-brand-dark"
                  : inverted
                    ? "text-sand/70 hover:text-sand"
                    : "text-muted hover:text-ink",
              )}
            >
              <item.icon className="size-3.5 opacity-80" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            to="/giris"
            className={cn("btn btn-sm", inverted ? "btn-on-dark" : "btn-primary")}
          >
            Danışan girişi
          </Link>
          <Link
            to="/randevu"
            className={cn(
              "btn btn-sm hidden sm:inline-flex",
              inverted ? "btn-ghost text-sand" : "btn-secondary",
            )}
          >
            Randevu
          </Link>
          <button
            type="button"
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full border md:hidden",
              inverted
                ? "border-sand/40 bg-sand/15 text-sand"
                : "border-line bg-cream text-ink",
            )}
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div
          className={cn(
            "page-wrap pb-5 md:hidden",
            inverted ? "text-sand" : "text-ink",
          )}
        >
          <div className="surface flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-brand-mist"
              >
                <item.icon className="size-4 text-brand" />
                {item.label}
              </Link>
            ))}
            <Link
              to="/giris"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-brand-mist"
            >
              Danışan girişi
            </Link>
            <Link
              to="/randevu"
              onClick={() => setOpen(false)}
              className="btn btn-primary mt-1"
            >
              Randevu talebi
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-brand-dark text-sand">
      <div className="page-wrap grid gap-10 py-12 md:grid-cols-3">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-sand/70">
            Kişiye özel beslenme danışmanlığı, ölçüm takibi ve i-Shape EMS
            vücut şekillendirme. Bilimsel, sakin, sürdürülebilir.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sand/50">
            Sayfalar
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to} className="text-sand/80 hover:text-sand">
                {item.label}
              </Link>
            ))}
            <Link to="/giris" className="text-sand/80 hover:text-sand">
              Danışan paneli
            </Link>
            <Link to="/asistan/giris" className="text-sand/40 hover:text-sand/70">
              Asistan
            </Link>
            <Link to="/admin/login" className="text-sand/40 hover:text-sand/70">
              Yönetim
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sand/50">
            İletişim
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-sand/80">
            <span>{CLINIC.city}</span>
            <span>{CLINIC.hours}</span>
            <a href={`tel:+90${CLINIC.phoneRaw.slice(1)}`} className="hover:text-sand">
              {CLINIC.phone}
            </a>
            <a href={`mailto:${CLINIC.email}`} className="hover:text-sand">
              {CLINIC.email}
            </a>
            <a
              href={CLINIC.instagram}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-sand"
            >
              <Instagram className="size-3.5" />
              @{CLINIC.instagramHandle}
            </a>
            <a
              href={CLINIC.mapsShare}
              target="_blank"
              rel="noreferrer"
              className="hover:text-sand"
            >
              {CLINIC.address}
            </a>
            <a
              href={whatsappLink(
                CLINIC.phoneRaw,
                `Merhaba, Dyt. ${CLINIC.name} ile görüşmek istiyorum.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="hover:text-sand"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-sand/10">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-sand/45">
          <span>© {new Date().getFullYear()} Dyt. {CLINIC.name}</span>
          <span className="max-w-xl text-right leading-relaxed">
            Kişisel verileriniz 6698 sayılı KVKK kapsamında işlenir.{" "}
            <Link to="/kvkk" className="text-sand/70 underline decoration-sand/30 underline-offset-2 hover:text-sand">
              Aydınlatma metni
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({
  children,
  hero = false,
}: {
  children: React.ReactNode;
  hero?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-sand">
      {hero ? null : <SiteHeader />}
      {children}
      <SiteFooter />
      <WhatsAppBubble />
    </div>
  );
}
