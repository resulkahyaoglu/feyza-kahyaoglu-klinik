import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Flame, Zap } from "lucide-react";
import { PublicShell } from "@/components/site-chrome";
import { IconMark, Scene } from "@/components/visuals";
import { ISHAPE, SERVICES } from "@/lib/clinic";

export const Route = createFileRoute("/hizmetler")({ component: ServicesPage });

const SCENE_FOR = {
  diyet: "diyet",
  "online-diyet": "online",
  "diyet-ishape": "combo",
  ishape: "ishape",
} as const;

function ServicesPage() {
  return (
    <PublicShell>
      <div className="page-wrap py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          Hizmetler
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl md:text-5xl">
          Hizmetler.
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Takvimde dolu-boş slot yoktur. Tercih ettiğiniz hizmeti seçip talep
          gönderin; onay diyetisyendedir.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {SERVICES.map((s) => (
            <article key={s.key} className="surface flex flex-col overflow-hidden p-0">
              <Scene kind={SCENE_FOR[s.key]} className="h-44 min-h-44" />
              <div className="flex flex-1 flex-col p-7">
                <h2 className="text-2xl">{s.name}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{s.detail}</p>
                <Link
                  to="/randevu"
                  search={{ hizmet: s.key }}
                  className="btn btn-primary mt-6"
                >
                  Bu hizmeti talep et
                </Link>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-20 grid items-center gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-[24px]">
            <Scene kind="ishape" className="min-h-64" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {ISHAPE.device}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl md:text-4xl">
              i-Shape EMS nedir?
            </h2>
            <p className="mt-4 text-muted">{ISHAPE.how}</p>
          </div>
        </section>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [Clock, "Seans", `${ISHAPE.sessionMin} dakika`],
            [Zap, "Kasılma", `en fazla ${ISHAPE.contractions}`],
            [Flame, "Sonrası", `${ISHAPE.afterburnHours} saat metabolizma`],
          ].map(([Icon, k, v]) => (
            <div key={String(k)} className="surface flex gap-3 p-5">
              <IconMark icon={Icon as typeof Clock} />
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted">{k as string}</p>
                <p className="stat-num mt-1 text-xl text-brand-dark">{v as string}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium">Aynı seansta çalışan bölgeler</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ISHAPE.areas.map((a) => (
              <li key={a} className="chip chip-ok">
                {a}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ISHAPE.benefits.map((b) => (
            <article key={b.t} className="surface p-5">
              <h3 className="font-medium">{b.t}</h3>
              <p className="mt-2 text-sm text-muted">{b.d}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
          {ISHAPE.ekcal} Cihaz kablosuz tabletten yönetilir. Erkek ve kadın
          danışanlarda; tek seans veya diyet programına ek olarak sunulur.
        </p>
      </div>
    </PublicShell>
  );
}