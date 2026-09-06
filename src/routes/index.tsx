import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Instagram,
  Leaf,
  LogIn,
  MapPin,
  Sparkles,
} from "lucide-react";
import { PublicShell } from "@/components/site-chrome";
import { HomePrograms } from "@/components/home-programs";
import { IconMark, ServiceIcon } from "@/components/visuals";
import { Botanical } from "@/components/botanical";
import { CLINIC, SERVICES } from "@/lib/clinic";

export const Route = createFileRoute("/")({ component: Home });

const PILLARS = [
  { icon: Leaf, t: "Kişiye özel beslenme planları" },
  { icon: Activity, t: "Sürdürülebilir yaşam alışkanlıkları" },
  { icon: Sparkles, t: "Bilimsel ve güncel yaklaşım" },
] as const;

function Home() {
  return (
    <PublicShell>
      <section className="hero-wash">
        <Botanical className="absolute -left-6 top-0 h-64 w-48 md:h-96 md:w-72" side="left" />
        <Botanical
          className="absolute -right-8 bottom-4 hidden h-56 w-44 md:block"
          side="right"
        />
        <div className="page-wrap relative grid grid-cols-1 items-center gap-6 py-7 md:grid-cols-2 md:gap-14 md:py-16">
          <div className="fade-in order-2 max-w-xl md:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Beslenme danışmanlığı
            </p>
            <h1 className="mt-4 text-4xl leading-[1.12] text-brand-dark md:text-5xl lg:text-[3.35rem]">
              Dengeli beslenme,
              <span className="mt-1 block font-medium italic">
                iyi hissetmenin anahtarıdır.
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft md:text-lg">
              Kişiye özel planlarla sağlıklı yaşam hedeflerinize birlikte
              ulaşalım.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/randevu" className="btn btn-primary">
                Randevu talebi
                <ArrowRight className="size-4" />
              </Link>
              <Link to="/giris" className="btn btn-secondary">
                <LogIn className="size-4" />
                Danışan girişi
              </Link>
            </div>
          </div>
          <div className="fade-in fade-in-2 order-1 mx-auto w-full max-w-sm md:order-2 md:mx-0 md:justify-self-end">
            <div className="hero-arch">
              <img
                src="/hero-still.jpg"
                alt="Sakin bir çalışma masası: okaliptüs, kitap ve çay"
                className="photo"
                width={900}
                height={1200}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-cream">
        <div className="page-wrap grid gap-px bg-line sm:grid-cols-3">
          {PILLARS.map((item, i) => (
            <div
              key={item.t}
              className={`fade-in fade-in-${i + 1} flex items-center gap-4 bg-cream px-5 py-6`}
            >
              <span className="feature-orb">
                <item.icon className="size-5" />
              </span>
              <p className="text-sm font-medium leading-snug text-brand-dark">{item.t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-wrap grid gap-4 py-10 sm:hidden">
        <Link to="/randevu" className="surface surface-card flex items-center gap-4 p-5">
          <span className="feature-orb">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-brand-dark">Randevu talebi bırakın</p>
            <p className="mt-0.5 text-sm text-muted">
              Tercih ettiğiniz günü yazın; onay diyetisyenden gelir.
            </p>
          </div>
        </Link>
        <Link to="/hizmetler" className="surface surface-card flex items-center gap-4 p-5">
          <span className="feature-orb">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-brand-dark">Hizmetleri inceleyin</p>
            <p className="mt-0.5 text-sm text-muted">
              Diyet, online takip ve i-Shape EMS.
            </p>
          </div>
        </Link>
      </section>

      <HomePrograms />

      <section className="page-wrap py-12 md:py-16">
        <div className="surface surface-card fade-in grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Panel
            </p>
            <h2 className="mt-2 text-3xl md:text-4xl">Zaten danışan mısınız?</h2>
            <p className="mt-3 max-w-lg text-ink-soft">
              Diyet listeniz, ölçüleriniz, randevularınız ve mesajlarınız
              panelde durur. Giriş bilgilerinizi diyetisyeniniz paylaşır.
            </p>
            <Link to="/giris" className="btn btn-primary btn-login mt-6">
              <LogIn className="size-4" />
              Danışan girişi
            </Link>
          </div>
          <ul className="grid gap-3 self-center text-sm text-ink-soft">
            {(
              [
                [ClipboardList, "Diyet listeleri"],
                [Activity, "Ölçüm ve ilerleme"],
                [CalendarDays, "Randevular"],
                [Sparkles, "Mesajlar"],
              ] as const
            ).map(([Icon, label]) => (
              <li key={label} className="flex items-center gap-3">
                <IconMark icon={Icon} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="page-wrap pb-12 md:pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Hizmetler
        </p>
        <h2 className="mt-2 text-3xl">Nasıl ilerliyoruz</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SERVICES.map((s) => (
            <article key={s.key} className="surface surface-card flex gap-4 p-5">
              <ServiceIcon serviceKey={s.key} />
              <div>
                <h3 className="text-lg">{s.name}</h3>
                <p className="mt-1 text-sm text-muted">{s.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-brand-mist">
        <div className="page-wrap grid gap-4 py-12 md:grid-cols-2 md:py-14">
          <a
            href={CLINIC.instagram}
            target="_blank"
            rel="noreferrer"
            className="surface surface-card flex items-center gap-4 p-5"
          >
            <IconMark icon={Instagram} />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Instagram</p>
              <p className="font-medium">@{CLINIC.instagramHandle}</p>
            </div>
          </a>
          <a
            href={CLINIC.mapsShare}
            target="_blank"
            rel="noreferrer"
            className="surface surface-card flex items-center gap-4 p-5"
          >
            <IconMark icon={MapPin} />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Konum</p>
              <p className="font-medium leading-snug">{CLINIC.address}</p>
            </div>
          </a>
        </div>
      </section>

      <section className="page-wrap py-12 pb-16 md:py-16">
        <div className="max-w-xl">
          <h2 className="text-3xl">Sakin bir takip.</h2>
          <p className="mt-3 text-ink-soft">
            Dyt. {CLINIC.name} · {CLINIC.city}. Yazmak veya kliniğe gelmek için
            iletişim sayfası yeterli.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/iletisim" className="btn btn-secondary">
              İletişim
            </Link>
            <Link to="/randevu" className="btn btn-secondary">
              Randevu talebi
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
