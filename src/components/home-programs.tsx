import { Link } from "@tanstack/react-router";
import { ONLINE_STEPS, PROGRAMS } from "@/lib/clinic";

export function HomePrograms() {
  return (
    <section className="page-wrap py-12 md:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Beslenme programları
      </p>
      <h2 className="mt-2 max-w-xl text-3xl md:text-4xl">
        Kendine uygun paketi seç.
      </h2>
      <p className="mt-3 max-w-xl text-ink-soft">
        Kilo verme, gebelik, emzirme ve tıbbi beslenme. Hepsi kişiye özel
        listeler, haftalık yenileme ve düzenli görüşmeyle yürür.
      </p>

      <article className="surface mt-10 p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Online diyet takibi
        </p>
        <h3 className="mt-2 text-2xl md:text-3xl">Beş adımda süreç</h3>
        <p className="mt-2 max-w-lg text-sm text-ink-soft">
          Kliniğe gelmeden WhatsApp ve panel üzerinden yürür. Yüz yüze
          danışmanlık isteyenler aynı programı kliniğe gelerek de sürdürür.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {ONLINE_STEPS.map((s) => (
            <li key={s.n} className={s.n === "05" ? "min-w-0 sm:col-span-2" : "min-w-0"}>
              <p className="stat-num text-sm text-brand">{s.n}</p>
              <h4 className="mt-1 font-sans text-sm font-semibold text-brand-dark">
                {s.title}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <Link to="/randevu" search={{ hizmet: "online-diyet" }} className="btn btn-primary mt-7">
          Online diyet talep et
        </Link>
      </article>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {PROGRAMS.map((p) => (
          <article key={p.key} className="surface flex flex-col p-6 md:p-7">
            <h3 className="text-xl md:text-2xl">{p.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.blurb}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
              {p.points.map((pt) => (
                <li key={pt} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/randevu"
              search={{ hizmet: "diyet" }}
              className="btn btn-secondary mt-6 self-start"
            >
              Bu programı talep et
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
