import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/site-chrome";
import { CLINIC } from "@/lib/clinic";

export const Route = createFileRoute("/kvkk")({ component: KvkkPage });

function KvkkPage() {
  return (
    <PublicShell>
      <article className="page-wrap max-w-3xl py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          6698 sayılı KVKK
        </p>
        <h1 className="mt-2 text-4xl">Aydınlatma metni</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          Dyt. {CLINIC.name} olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu
          kapsamında veri sorumlusuyuz. Bu metin, sitemizi ve danışan panelini
          kullanan kişileri aydınlatmak içindir.
        </p>

        <h2 className="mt-8 text-xl">Veri sorumlusu</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Dyt. {CLINIC.name}
          <br />
          {CLINIC.address}
          <br />
          Tel: {CLINIC.phone} · E-posta: {CLINIC.email}
        </p>

        <h2 className="mt-8 text-xl">Hangi veriler işlenir?</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>Kimlik ve iletişim: ad soyad, telefon, e-posta</li>
          <li>Randevu ve hizmet kayıtları</li>
          <li>Beslenme programı, ölçü, kilo, boy ve seans notları</li>
          <li>Panel mesajları, görüş-öneri ve plan dışı öğün kayıtları (isteğe bağlı fotoğraf)</li>
          <li>Kan tahlili PDF/fotoğrafı ve diyetisyenin girdiği sayısal değerler</li>
          <li>Ödeme, borç ve fatura bilgileri</li>
          <li>Panel girişi (telefon ve şifre; şifreler hash olarak saklanır)</li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Ölçü, tahlil ve beslenme bilgileri sağlık verisi niteliğindedir; açık rızanız
          ve tedavi/danışmanlık sözleşmesinin ifası kapsamında işlenir.
        </p>

        <h2 className="mt-8 text-xl">Amaç ve hukuki sebep</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Randevu almak, beslenme danışmanlığı sunmak, süreç takibi yapmak,
          iletişim kurmak, mali kayıt tutmak ve yasal yükümlülükleri yerine
          getirmek. Dayanak: KVKK m.5/2 (sözleşmenin ifası, meşru menfaat, hukuki
          yükümlülük) ve sağlık verileri için m.6 (açık rıza / sağlık hizmeti).
        </p>

        <h2 className="mt-8 text-xl">Aktarım ve saklama</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Veriler, hizmetin yürütülmesi için barındırma sağlayıcısında (Türkiye
          merkezli hosting) tutulur. Klinik yedekleri Excel olarak yalnızca
          yönetici tarafından indirilebilir. Tahlil ve diyet dosyaları sunucuda
          saklanır; sitede önizleme gösterilmez, yetkili kişi indirir.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Randevu, öğün, tahlil yükleme ve “şifremi unuttum” gibi olaylarda
          diyetisyen (ve bağlı asistan botu, ilgili bildirim türlerinde) Telegram
          üzerinden kısa bildirim alabilir. Telegram yurt dışı bir hizmettir;
          bu kanala yalnızca süreç takibi için gerekli özet gider. Telegram
          kullanmak istemiyorsanız {CLINIC.phone} veya {CLINIC.email} üzerinden
          bildirin, bildirim kapatılır.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Yasal süreler ve tedavi ilişkisinin gerektirdiği süre boyunca saklanır;
          süre bitince silinir veya anonim hale getirilir. Üçüncü kişilere
          pazarlama amacıyla satılmaz.
        </p>

        <h2 className="mt-8 text-xl">Haklarınız</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          KVKK m.11 uyarınca verilerinizin işlenip işlenmediğini öğrenme, düzeltme,
          silme, aktarıldığı üçüncü kişileri bilme ve itiraz etme haklarınız
          vardır. Taleplerinizi {CLINIC.email} veya {CLINIC.phone} üzerinden
          iletebilirsiniz.
        </p>

        <p className="mt-8 text-xs text-muted">Son güncelleme: 30 Ağustos 2026</p>
      </article>
    </PublicShell>
  );
}
