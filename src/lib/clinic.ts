export const CLINIC = {
  name: "Feyza Kahyaoğlu",
  title: "Diyetisyen",
  monogram: "FK",
  phone: "0551 361 34 63",
  phoneRaw: "05513613463",
  email: "merhaba@feyzakahyaoglu.com",
  city: "Şanlıurfa",
  district: "Haliliye",
  address: "Refahiye Mah. 280. Sok. No: 9A, Haliliye / Şanlıurfa",
  hours: "Hafta içi 09:00 – 18:00",
  instagram: "https://www.instagram.com/dyt.feyzakahyaoglu/",
  instagramHandle: "dyt.feyzakahyaoglu",
  mapsShare: "https://share.google/HHIk37rmmH42Qcomh",
  mapsEmbed:
    "https://maps.google.com/maps?q=37.177829,38.80135+(Diyetisyen+Feyza+Kahyao%C4%9Flu)&hl=tr&z=16&output=embed",
  lat: 37.177829,
  lng: 38.80135,
} as const;

export const ISHAPE = {
  name: "i-Shape EMS",
  device: "i-shape Esthetic",
  maker: "i-motion",
  sessionMin: 25,
  contractions: "40.000",
  afterburnHours: 48,
  areas: ["Karın", "Kalça", "Bacaklar", "Kollar", "Pelvik taban"],
  benefits: [
    { t: "Kas kazanımı", d: "Derin, kontrollü kasılmalarla kas kütlesi artışı." },
    { t: "Bölgesel yağ", d: "Alt vücut odaklı etkiyle lokal yağ azalması." },
    { t: "Selülit", d: "Dolaşım ve drenajla görünümün sakinleşmesi." },
    { t: "Cilt tonu", d: "Sıkılaşma; kollarda ve karında gevşekliğin azalması." },
    { t: "Düz karın", d: "Karın kaslarının pasif ama yoğun çalışması." },
    { t: "Pelvik taban", d: "Aynı seansta pelvik tabanın güçlenmesi." },
  ],
  how: "Cihaz, yazılım aracılığıyla kasa kontrollü elektrik uyarıları gönderir. Uyarı doğal sinir sinyalini taklit eder; kas kendi iradeniz olmadan kasılır. 25 dakikalık seansta onlarca bin kasılma üretilir — spor salonunda saatler sürecek bir yüke denk gelecek şekilde.",
  ekcal:
    "E-Kcal sistemi; yoğunluk, frekans, kilo, boy, yaş ve cinsiyete göre seans sırasındaki kalori tüketimini ölçer. Metabolizma seans sonrası 48 saate kadar yüksek kalabilir.",
} as const;

export type ServiceKey = "diyet" | "online-diyet" | "diyet-ishape" | "ishape";

export type Service = {
  key: ServiceKey;
  name: string;
  duration: number;
  price: number;
  blurb: string;
  detail: string;
};

export const SERVICES: Service[] = [
  {
    key: "diyet",
    name: "Diyet Danışmanlığı",
    duration: 30,
    price: 0,
    blurb: "Yüz yüze, kişiye özel program ve takip",
    detail:
      "İlk görüşmede anamnez alınır, hedefler netleştirilir ve sürdürülebilir bir beslenme programı birlikte kurulur. Takip seanslarında ölçüm, uyum ve revizyon birlikte yürür.",
  },
  {
    key: "online-diyet",
    name: "Online Diyet",
    duration: 30,
    price: 0,
    blurb: "Video veya telefonla uzaktan danışmanlık",
    detail:
      "Kliniğe gelmeden video veya telefonla görüşülür. Anamnez, kişiye özel program ve panelden takip yüz yüze süreçle aynıdır. Şanlıurfa dışından da çalışılabilir.",
  },
  {
    key: "diyet-ishape",
    name: "Diyet + i-Shape EMS",
    duration: 60,
    price: 0,
    blurb: "Beslenme programı + EMS seansı",
    detail:
      "Danışmanlık seansına i-Shape EMS eklenir. 25 dakikada karın, kalça, bacak, kol ve pelvik taban aynı anda çalışır; diyetle birlikte sıkılaşma ve kas kazanımı hedeflenir.",
  },
  {
    key: "ishape",
    name: "i-Shape EMS",
    duration: 25,
    price: 0,
    blurb: "Bölgesel zayıflama seansı",
    detail:
      "i-shape Esthetic cihazıyla 25 dakikalık nöromüsküler stimülasyon. Tek seansta 40.000’e kadar kasılma; bölgesel yağ, selülit, cilt tonu ve kas için. Mevcut diyete ek veya tek seans.",
  },
];

export const ONLINE_STEPS = [
  {
    n: "01",
    title: "İletişim ve anamnez",
    text: "WhatsApp veya siteden yazın. Size anamnez formu gelir: sağlık geçmişi, beslenme alışkanlıkları, hedefler ve özel ihtiyaçlar. Formu doldurunca süreç başlar.",
  },
  {
    n: "02",
    title: "Görüşmeler",
    text: "Form incelendikten sonra ayda 4 görüntülü veya sesli seans planlanır. Sağlık durumu, hedefler ve isteklere göre size uygun diyet planı burada kurulur.",
  },
  {
    n: "03",
    title: "Panelden takip",
    text: "Danışan panelinden günlük kayıt, egzersiz, diyet listesi ve alışveriş listesi. Hatırlatmalar ve mesajlar aynı yerde durur.",
  },
  {
    n: "04",
    title: "Birebir destek",
    text: "İletişim saatleri genellikle 09.00–18.00. Soru, ihtiyaç veya danışmanlık talebinde yazabilirsiniz; ilerleme düzenli aralıklarla birlikte değerlendirilir.",
  },
  {
    n: "05",
    title: "Haftalık yenilenen listeler",
    text: "Diyet planınız her hafta yenilenir. Çeşit, tokluk ve hedefe uygun ilerleme için alışveriş listesi de size özel hazırlanır.",
  },
] as const;

export const PROGRAMS = [
  {
    key: "kilo",
    name: "Kilo Verme Programı",
    blurb:
      "Kilo vermek isteyenler için bireysel beslenme ve egzersiz programı. Kalıcı sonuç, yaşam tarzına uygun plan.",
    points: [
      "Bireysel ve kişiye özel program",
      "Beslenme ve egzersiz planları bilimsel verilere dayanır",
      "Yaşam tarzına uygun, sürdürülebilir ritim",
      "Beslenme eğitimi ve psikolojik destek",
      "Danışan paneliyle sürekli takip",
    ],
  },
  {
    key: "emzirme",
    name: "Emzirme Döneminde Beslenme",
    blurb:
      "Emziren annenin yeterli ve dengeli beslenmesi, süt kalitesi ve ideal kiloya dönüş. Bebek anne sütüyle büyür.",
    points: [
      "Anneye özel önerilerle bağışıklık desteği",
      "Süt üretimini ve kalitesini artıran besinler",
      "Emzirme döneminde kilo alma veya verme sorunlarına çözüm",
      "Bebek anne sütüyle yeterli ve dengeli beslenir",
    ],
  },
  {
    key: "gebelik",
    name: "Gebelikte Beslenme",
    blurb:
      "Anne ve bebek için yeterli, dengeli bir rejim. Folik asit, demir, kalsiyum ve omega-3 odağında gebeliğe özel program.",
    points: [
      "Temel besin grupları dengeli sunulur",
      "Bebeğin nörolojik, kemik ve bağışıklık gelişimine destek",
      "Gestasyonel diyabet, kabızlık, şişkinlik ve anemi riskini azaltmaya yardımcı",
      "Enerji, bulantı ve sindirim için günlük ritmi kolaylaştırır",
    ],
  },
  {
    key: "tibbi",
    name: "Hastalıklarda Tıbbi Beslenme",
    blurb:
      "Semptomları hafifletmek, eksikleri gidermek ve iyileşmeyi desteklemek için tıbbi beslenme tedavisi.",
    points: [
      "Semptomlara eşlik eden beslenme düzeni",
      "Emilim ve metabolizmayı etkileyen eksikliklere yönelik paket",
      "İlaç–besin etkileşimlerini azaltan stratejiler",
      "Anti-enflamatuar besinlerle iltihabı yatıştırmaya destek",
    ],
  },
] as const;

export const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  beklemede: "Beklemede",
  onaylandi: "Onaylandı",
  tamamlandi: "Tamamlandı",
  gelmedi: "Gelmedi",
  iptal: "İptal",
};

export const REQUEST_TYPE_LABEL: Record<string, string> = {
  ertele: "Erteleme",
  iptal: "İptal",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  beklemede: "Beklemede",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
};

export const MEAL_SLOTS = [
  { key: "sabah", label: "Sabah" },
  { key: "ogle", label: "Öğle" },
  { key: "aksam", label: "Akşam" },
  { key: "gece", label: "Gece" },
  { key: "ara", label: "Ara öğün" },
] as const;

export const OFFPLAN_KINDS = [
  { key: "extra", label: "Plan dışı bir şey yedim" },
  { key: "missing", label: "Listedeki ürünü bulamadım" },
] as const;

export function mealSlotLabel(key: string) {
  return MEAL_SLOTS.find((s) => s.key === key)?.label ?? key;
}

export function offplanKindLabel(key: string) {
  return key === "missing" ? "Ürün bulunamadı" : "Plan dışı öğün";
}

export const NOTIF_KIND_LABEL: Record<string, string> = {
  message: "Mesaj",
  offplan: "Plan dışı öğün",
  booking: "Randevu talebi",
  public_booking: "Site randevusu",
  request: "Değişiklik talebi",
  cancel: "İptal",
  profile: "Profil",
  password: "Şifre",
  forgot: "Şifre sıfırlama",
  feedback: "Görüş ve öneri",
  fasting: "Aralıklı oruç",
  assistant: "Asistan",
  package: "Paket",
  reminder: "Randevu hatırlatma",
  "asst-reminder": "Asistan randevu",
  briefing: "Seans brifingi",
  lab: "Tahlil dosyası",
  "lab-value": "Kan değeri",
  daily: "Günlük takip",
};

export function getService(key: string): Service | undefined {
  return SERVICES.find((s) => s.key === key);
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n) + " TL";
}

export function formatKg(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} kg`;
}

export function formatCm(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} cm`;
}

export function digitsOnly(phone: string): string {
  return (phone || "").replace(/\D/g, "");
}

/** Canonical form used as login id: 05XXXXXXXXX */
export function normalizePhone(phone: string): string {
  let d = digitsOnly(phone);
  if (d.startsWith("90") && d.length >= 12) d = "0" + d.slice(2);
  else if (d.length === 10 && d.startsWith("5")) d = "0" + d;
  return d;
}

export function displayPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (n.length === 11) {
    return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7, 9)} ${n.slice(9)}`;
  }
  return phone;
}

/** wa.me expects 90XXXXXXXXXX */
export function toWhatsAppNumber(phone: string): string {
  let d = digitsOnly(phone);
  if (d.startsWith("0")) d = "90" + d.slice(1);
  else if (!d.startsWith("90")) d = "90" + d;
  return d;
}

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

export function nowTimeIstanbul(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function clockHHMM(t: string): string {
  const m = String(t).match(/(\d{1,2}):(\d{2})/);
  if (!m) return "00:00";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** True if the appointment start is still in the future (Istanbul). */
export function isUpcomingSlot(date: string, time: string): boolean {
  const today = todayISO();
  const day = date.slice(0, 10);
  if (day > today) return true;
  if (day < today) return false;
  return clockHHMM(time) > nowTimeIstanbul();
}

export const PAYMENT_METHODS = [
  { key: "nakit", label: "Nakit" },
  { key: "kredi-karti", label: "Kredi kartı" },
  { key: "havale", label: "Havale / EFT" },
  { key: "diger", label: "Diğer" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["key"];

export const EXPENSE_CATEGORIES = [
  "Kira",
  "Maaş",
  "Malzeme",
  "Fatura",
  "Cihaz",
  "Pazarlama",
  "Diğer",
] as const;

export function paymentMethodLabel(key: string): string {
  return PAYMENT_METHODS.find((m) => m.key === key)?.label ?? key;
}

export function monthISO(d = new Date()): string {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}`;
}

export function monthRange(ym: string): { from: string; to: string } {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const z = (n: number) => String(n).padStart(2, "0");
  return { from: `${ym}-01`, to: `${ym}-${z(last)}` };
}

export function monthLabel(ym: string): string {
  const months = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  const [ys, ms] = ym.split("-");
  const m = Number(ms);
  return `${months[m - 1] ?? ms} ${ys}`;
}

export function shiftMonth(ym: string, delta: number): string {
  const [ys, ms] = ym.split("-");
  const d = new Date(Date.UTC(Number(ys), Number(ms) - 1 + delta, 1));
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}`;
}

export function formatDateTr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const raw = iso.slice(0, 10);
  const [y, m, d] = raw.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

const WEEKDAYS_TR = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

export function weekdayTr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAYS_TR[dt.getUTCDay()] ?? "";
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${z(dt.getUTCMonth() + 1)}-${z(dt.getUTCDate())}`;
}

export function addWeeksISO(iso: string, weeks: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + weeks * 7);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${z(dt.getUTCMonth() + 1)}-${z(dt.getUTCDate())}`;
}

export function weeklyDates(iso: string, count: number): string[] {
  const n = Math.max(1, Math.min(9, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => addWeeksISO(iso, i));
}

export function formatDateTimeTr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDateTr(iso);
  return d.toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cancelStamp(
  cancelledAt?: string | null,
  cancelledBy?: string | null,
): string | null {
  if (!cancelledAt) return null;
  const when = formatDateTimeTr(cancelledAt);
  return cancelledBy === "client"
    ? `Danışan iptal etti · ${when}`
    : `İptal kaydı · ${when}`;
}

export function clientCancelWhatsApp(opts: {
  date: string;
  time: string;
  service: string;
}): string {
  const when = `${formatDateTr(opts.date)} ${weekdayTr(opts.date)} ${opts.time}`;
  return `Merhaba Dyt. ${CLINIC.name}, ${when} ${opts.service} randevuma gelemeyeceğim.`;
}

export function computeBmi(weight: number, heightCm: number): number | null {
  if (!weight || !heightCm) return null;
  const m = heightCm / 100;
  if (m <= 0) return null;
  return Math.round((weight / (m * m)) * 10) / 10;
}

export function bmiLabel(bmi: number | null): string {
  if (bmi === null) return "";
  if (bmi < 18.5) return "Zayıf";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Fazla kilolu";
  return "Obez";
}

export type ProgressSummary = {
  start: number;
  now: number;
  change: number;
  remaining: number | null;
  percent: number | null;
  direction: "loss" | "gain" | "hold";
};

export function computeProgress(
  weightsChronological: number[],
  target: number | null,
): ProgressSummary | null {
  if (weightsChronological.length === 0) return null;
  const start = weightsChronological[0]!;
  const now = weightsChronological[weightsChronological.length - 1]!;
  const change = Math.round((now - start) * 10) / 10;
  const remaining =
    target === null || target === undefined
      ? null
      : Math.round((now - target) * 10) / 10;
  let percent: number | null = null;
  if (target !== null && target !== undefined && start !== target) {
    percent = Math.round(((start - now) / (start - target)) * 100);
  }
  const direction = change < -0.05 ? "loss" : change > 0.05 ? "gain" : "hold";
  return { start, now, change, remaining, percent, direction };
}

export type Gender = "kadin" | "erkek";

export function panelGreeting(
  fullName: string,
  gender: string | null | undefined,
  at = new Date(),
): string {
  const first = fullName.trim().split(/\s+/)[0] || fullName.trim() || "hoş geldiniz";
  const hourRaw = new Intl.DateTimeFormat("tr-TR", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Europe/Istanbul",
  }).format(at);
  const hour = Number(String(hourRaw).replace(/\D/g, ""));
  const hi =
    hour >= 5 && hour < 12
      ? "Günaydın"
      : hour >= 12 && hour < 18
        ? "Tünaydın"
        : hour >= 18 && hour < 22
          ? "İyi akşamlar"
          : "İyi geceler";
  const title = gender === "kadin" ? "Hanım" : gender === "erkek" ? "Bey" : "";
  return title ? `${hi}, ${first} ${title}` : `${hi}, ${first}`;
}

function sayin(name: string): string {
  return `Sayın ${name.trim() || "Danışanımız"}`;
}

function waClose(): string {
  return `Sağlıklı günler dileriz.\nDyt. ${CLINIC.name}`;
}

export function reminderMessage(
  kind: "diet" | "appointment" | "measure" | "generic",
  name: string,
  extra?: {
    date?: string;
    time?: string;
    title?: string;
    gender?: string | null;
    isMeasure?: boolean;
  },
): string {
  const hello = `${sayin(name)},`;
  if (kind === "diet") {
    const titleBit = extra?.title ? ` (${extra.title})` : "";
    return [
      hello,
      `Diyet listeniz${titleBit} paneline yüklenmiştir. Uygun olduğunuzda incelemenizi rica eder, sağlıklı günler dileriz.`,
      `Dyt. ${CLINIC.name}`,
    ].join("\n");
  }
  if (kind === "appointment") {
    const date = extra?.date?.trim();
    const time = extra?.time?.trim();
    let body =
      date && time
        ? `${date} tarihinde saat ${time} planlanan randevunuzu hatırlatmak isteriz. Randevunuza zamanında katılım sağlamanızı rica ederiz.`
        : `Planlanan randevunuzu hatırlatmak isteriz. Randevunuza zamanında katılım sağlamanızı rica ederiz.`;
    if (extra?.isMeasure) {
      body +=
        " Bu randevunuzda ölçümünüz olacaktır. Diyetisyeninizin belirttiği gibi geliniz, tüketim yapmayınız.";
    }
    return [hello, body, `Dyt. ${CLINIC.name}`].join("\n");
  }
  if (kind === "measure") {
    return [
      hello,
      `Yeni ölçüleriniz paneline işlenmiştir. Gelişiminizi panelinizden takip edebilirsiniz.`,
      waClose(),
    ].join("\n");
  }
  return [
    hello,
    `Size ulaşmak isteriz. Müsait olduğunuzda dönüş yapabilirsiniz.`,
    waClose(),
  ].join("\n");
}

export function panelAccessMessage(
  name: string,
  phone: string,
  password: string,
  _gender?: string | null,
): string {
  return [
    `${sayin(name)},`,
    `Randevunuz onaylanmıştır. Danışan paneline telefon numaranız ve geçici şifrenizle giriş yapabilirsiniz.`,
    `Telefon: ${displayPhone(phone)}`,
    `Geçici şifre: ${password}`,
    `İlk girişte şifrenizi değiştirmenizi rica ederiz.`,
    waClose(),
  ].join("\n");
}
