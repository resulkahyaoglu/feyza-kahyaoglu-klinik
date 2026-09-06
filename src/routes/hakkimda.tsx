import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PublicShell } from "@/components/site-chrome";
import { IconMark, Scene } from "@/components/visuals";
import { CLINIC } from "@/lib/clinic";

export const Route = createFileRoute("/hakkimda")({ component: About });

function About() {
  return (
    <PublicShell>
      <article className="page-wrap py-14 md:py-20">
        <div className="grid items-start gap-10 md:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[24px]">
            <Scene kind="about" className="min-h-80" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Hakkımda
            </p>
            <h1 className="mt-3 text-4xl md:text-5xl">Dyt. {CLINIC.name}</h1>
            <p className="mt-6 text-lg text-ink-soft">
              Beslenme danışmanlığını kısa süreli yasaklar dizisi olarak değil,
              ölçülebilir ve sürdürülebilir bir ritim olarak ele alıyorum.
            </p>
            <div className="mt-8 space-y-4 text-muted">
              <p>
                İlk görüşmede anamnez, günlük rutin, tıbbi öykü ve hedef birlikte
                konuşulur. Program buradan çıkar: sizin mutfağınıza, iş saatlerinize
                ve sosyal hayatınıza oturan bir çerçeve.
              </p>
              <p>
                Takip seanslarında tartı tek başına karar vermez. Bel, kalça, kol
                çevreleri izlenir. Uygun görülen danışanlarda i-Shape EMS ile karın,
                kalça, bacak, kol ve pelvik taban aynı 25 dakikalık seansta
                çalıştırılır; kas, bölgesel yağ ve sıkılaşma birlikte hedeflenir.
              </p>
              <p>
                Her danışanın paneli vardır. Diyet listesi, ölçümler, mesajlar ve
                randevular orada durur. Listeler PDF olarak indirilebilir; hatırlatmalar
                WhatsApp üzerinden gönderilir.
              </p>
            </div>
          </div>
        </div>
        <dl className="mt-10 grid gap-4 sm:grid-cols-2">
          {(
            [
              [MapPin, "Konum", CLINIC.address],
              [Clock, "Çalışma", CLINIC.hours],
              [Phone, "İletişim", CLINIC.phone],
              [Mail, "E-posta", CLINIC.email],
            ] as const
          ).map(([Icon, k, v]) => (
            <div key={k} className="surface flex gap-3 p-5">
              <IconMark icon={Icon} />
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">{k}</dt>
                <dd className="mt-1 font-medium">{v}</dd>
              </div>
            </div>
          ))}
        </dl>
        <Link to="/randevu" className="btn btn-primary mt-10">
          Randevu talebi gönder
        </Link>
      </article>
    </PublicShell>
  );
}