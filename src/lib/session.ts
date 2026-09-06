import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  deleteCookie,
  getCookie,
  getRequest,
  setCookie,
} from "@tanstack/react-start/server";
import { getSql, type Sql } from "@/lib/db";
import { isSandboxPreviewGuestHost } from "@/lib/preview-embedder-origin";

const ADMIN_USER = "admin";
const ADMIN_PASS_HASH =
  "5b15d85d94f78a139358294f4c5cae60395fc7c50ef11b90cca669aa77300a6f";
const ASSISTANT_USER = "asistan";
const ASSISTANT_PASS_HASH =
  "20e209320af88010f1fd69284cb66abd69aa765b362ee3f803fc492d9c342573";

const SECRET = "feyza-kahyaoglu-clinic-session-2026";
const ADMIN_COOKIE = "fk_admin";
const ASSISTANT_COOKIE = "fk_assistant";
const CLIENT_COOKIE = "fk_client";
const MAX_AGE = 60 * 60 * 24 * 30;

export type StaffRole = "admin" | "assistant";

export type ClientRow = {
  id: number;
  full_name: string;
  phone: string;
  email: string | null;
  gender: string | null;
  has_ishape: number;
  is_active: number;
  notes: string | null;
  target_weight: number | null;
  last_panel_visit: string | null;
  panel_theme?: string | null;
  created_at: string;
  debt_balance?: number;
};

export function hashPassword(p: string): string {
  return createHash("sha256").update(p, "utf8").digest("hex");
}

export function makeTempPassword(_phone?: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length]!;
  return out;
}

function sign(payload: string): string {
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token: string | undefined, expectedPrefix?: string): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  if (expectedPrefix && !payload.startsWith(expectedPrefix)) return null;
  return payload;
}

function cookieContext() {
  let host = "";
  let https = process.env.NODE_ENV !== "development";
  try {
    const req = getRequest();
    const rawHost =
      req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    host = rawHost.split(",")[0]!.trim().split(":")[0]!;
    const proto = (
      req.headers.get("x-forwarded-proto") ||
      req.headers.get("x-forwarded-ssl") ||
      ""
    ).toLowerCase();
    if (proto.includes("https") || proto === "on") https = true;
    try {
      if (new URL(req.url).protocol === "https:") https = true;
    } catch {
      /* ignore */
    }
  } catch {
    /* no request */
  }
  return { https, embed: isSandboxPreviewGuestHost(host) };
}

function cookieOpts() {
  const { https, embed } = cookieContext();
  const secure = https || embed;
  return {
    httpOnly: true,
    path: "/",
    maxAge: MAX_AGE,
    secure,
    sameSite: (embed ? "none" : "lax") as "none" | "lax",
  };
}

export function setAdminCookie() {
  deleteCookie(ASSISTANT_COOKIE, cookieOpts());
  setCookie(ADMIN_COOKIE, sign("admin"), cookieOpts());
}

export function clearAdminCookie() {
  deleteCookie(ADMIN_COOKIE, cookieOpts());
}

export function setAssistantCookie() {
  deleteCookie(ADMIN_COOKIE, cookieOpts());
  setCookie(ASSISTANT_COOKIE, sign("assistant"), cookieOpts());
}

export function clearAssistantCookie() {
  deleteCookie(ASSISTANT_COOKIE, cookieOpts());
}

export function clearStaffCookies() {
  deleteCookie(ADMIN_COOKIE, cookieOpts());
  deleteCookie(ASSISTANT_COOKIE, cookieOpts());
}

export function setClientCookie(userId: number) {
  setCookie(CLIENT_COOKIE, sign(`u:${userId}`), cookieOpts());
}

export function clearClientCookie() {
  deleteCookie(CLIENT_COOKIE, cookieOpts());
}

export function isAdminSession(): boolean {
  return getStaffRole() === "admin";
}

export function isAssistantSession(): boolean {
  return getStaffRole() === "assistant";
}

export function getStaffRole(): StaffRole | null {
  if (verify(getCookie(ADMIN_COOKIE), "admin") === "admin") return "admin";
  if (verify(getCookie(ASSISTANT_COOKIE), "assistant") === "assistant") {
    return "assistant";
  }
  return null;
}

export function getClientIdFromCookie(): number | null {
  const payload = verify(getCookie(CLIENT_COOKIE), "u:");
  if (!payload) return null;
  const id = Number(payload.slice(2));
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function checkStaffLogin(
  role: StaffRole,
  username: string,
  password: string,
): Promise<boolean> {
  const sql = await db();
  const rows = await sql<{ username: string; password_hash: string }>`
    select username, password_hash from staff_accounts where role = ${role} limit 1
  `;
  const fallbackUser = role === "admin" ? ADMIN_USER : ASSISTANT_USER;
  const fallbackHash = role === "admin" ? ADMIN_PASS_HASH : ASSISTANT_PASS_HASH;
  const expectedUser = (rows[0]?.username ?? fallbackUser).trim().toLowerCase();
  const expectedHash = rows[0]?.password_hash ?? fallbackHash;
  const u = username.trim().toLowerCase();
  if (u !== expectedUser) return false;
  const hash = hashPassword(password);
  const a = Buffer.from(hash);
  const b = Buffer.from(expectedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function checkAdminLogin(username: string, password: string): Promise<boolean> {
  return checkStaffLogin("admin", username, password);
}

export async function checkAssistantLogin(username: string, password: string): Promise<boolean> {
  return checkStaffLogin("assistant", username, password);
}

export async function db(): Promise<Sql> {
  const sql = await getSql();
  await ensureSeed(sql);
  return sql;
}

let seeded = false;

async function ensureSeed(sql: Sql) {
  if (seeded) return;
  try {
    await sql.query("alter table diet_lists add column if not exists pdf_name text");
    await sql.query("alter table diet_lists add column if not exists pdf_b64 text");
    await sql.query("alter table diet_lists add column if not exists pdf_path text");
    await sql.query("alter table measurements add column if not exists arm_right double precision");
    await sql.query("alter table measurements add column if not exists arm_left double precision");
    await sql.query("alter table measurements add column if not exists leg_right double precision");
    await sql.query("alter table measurements add column if not exists leg_left double precision");
    await sql.query("alter table measurements add column if not exists belly double precision");
    await sql.query("alter table users add column if not exists gender text");
    await sql.query("alter table users add column if not exists panel_theme text");
    await sql.query(`update users set panel_theme = 'dogal' where panel_theme is null or panel_theme = ''`);
    await sql.query("update measurements set arm_right = arm where arm_right is null");
    await sql.query("update measurements set arm_left = arm where arm_left is null");
    await sql.query("update measurements set leg_right = leg where leg_right is null");
    await sql.query("update measurements set leg_left = leg where leg_left is null");
    await sql.query(`create table if not exists payments (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      paid_at text not null,
      amount integer not null,
      method text not null,
      notes text,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists expenses (
      id serial primary key,
      spent_at text not null,
      amount integer not null,
      category text not null,
      notes text,
      created_at timestamptz not null default now()
    )`);
    await sql.query("alter table appointments add column if not exists cancelled_at timestamptz");
    await sql.query("alter table appointments add column if not exists cancelled_by text");
    await sql.query(`create table if not exists offplan_logs (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      slot text not null,
      kind text not null,
      detail text default '',
      amount text,
      note text,
      photo_b64 text,
      photo_mime text,
      photo_name text,
      is_read integer not null default 0,
      created_at timestamptz not null default now()
    )`);
    await sql.query("alter table offplan_logs add column if not exists photo_b64 text");
    await sql.query("alter table offplan_logs add column if not exists photo_mime text");
    await sql.query("alter table offplan_logs add column if not exists photo_name text");
    await sql.query("alter table offplan_logs add column if not exists photo_path text");
    await sql.query("alter table offplan_logs alter column detail drop not null");
    await sql.query(`create table if not exists client_feedback (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      message text not null,
      is_read integer not null default 0,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists fasting_plans (
      user_id integer primary key references users (id) on delete cascade,
      enabled integer not null default 0,
      protocol text not null default 'kapali',
      window_start text not null default '12:00',
      window_end text not null default '20:00',
      days text not null default '1,2,3,4,5,6,7',
      notes text,
      updated_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists fasting_logs (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      log_date date not null,
      kind text not null,
      reason text,
      created_at timestamptz not null default now(),
      unique (user_id, log_date)
    )`);
    await sql.query("alter table fasting_logs add column if not exists detail text");
    await sql.query("alter table fasting_logs add column if not exists energy integer");
    await sql.query("alter table fasting_logs add column if not exists dizzy integer");
    await sql.query("alter table fasting_logs add column if not exists end_reason text");
    await sql.query(`create table if not exists lab_uploads (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      title text not null,
      note text,
      staff_note text,
      kind text not null,
      file_name text,
      mime text,
      file_path text,
      file_b64 text,
      is_read integer not null default 0,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists daily_logs (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      log_date date not null,
      water_ml integer not null default 0,
      sweaty integer not null default 0,
      low_carb integer not null default 0,
      hunger_before integer,
      hunger_after integer,
      eat_trigger text,
      sleep_hours real,
      stress integer,
      created_at timestamptz not null default now(),
      unique (user_id, log_date)
    )`);
    await sql.query(`alter table daily_logs add column if not exists mood text`);
    await sql.query(`alter table daily_logs add column if not exists energy integer`);
    await sql.query(`create table if not exists lab_values (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      taken_at date not null,
      marker text not null,
      value real not null,
      unit text not null default '',
      notes text,
      ref_min real,
      ref_max real,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`alter table lab_values add column if not exists ref_min real`);
    await sql.query(`alter table lab_values add column if not exists ref_max real`);
    await sql.query(`create table if not exists mindful_meals (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      log_date date not null,
      slot text not null,
      hunger_before integer not null,
      hunger_after integer,
      eat_trigger text,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists admin_notifications (
      id serial primary key,
      user_id integer references users (id) on delete set null,
      kind text not null,
      title text not null,
      body text,
      href text,
      is_read integer not null default 0,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists client_debts (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      kind text not null,
      amount integer not null,
      notes text,
      payment_id integer references payments (id) on delete set null,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists assistant_logs (
      id serial primary key,
      kind text not null,
      title text not null,
      body text,
      href text,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists delete_requests (
      id serial primary key,
      target_table text not null,
      target_id integer not null,
      summary text not null,
      status text not null default 'beklemede',
      created_at timestamptz not null default now(),
      decided_at timestamptz
    )`);
    await sql.query(`create table if not exists staff_accounts (
      role text primary key,
      username text not null unique,
      password_hash text not null,
      updated_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists clinic_telegram (
      id integer primary key default 1,
      bot_token text,
      bot_username text,
      updated_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists telegram_links (
      role text primary key,
      chat_id text,
      telegram_name text,
      pending_code text,
      pending_until timestamptz,
      linked_at timestamptz
    )`);
    await sql.query("alter table appointments add column if not exists is_measure integer not null default 0");
    await sql.query("alter table fasting_plans add column if not exists pause_reason text");
    await sql.query("alter table fasting_plans add column if not exists pause_until date");
    await sql.query(`create table if not exists appointment_reminders (
      appointment_id integer not null references appointments (id) on delete cascade,
      kind text not null,
      sent_at timestamptz not null default now(),
      primary key (appointment_id, kind)
    )`);
    await sql.query(`create table if not exists reminder_digests (
      kind text not null,
      for_date date not null,
      sent_at timestamptz not null default now(),
      primary key (kind, for_date)
    )`);
    await sql.query(`create table if not exists client_packages (
      id serial primary key,
      user_id integer not null references users (id) on delete cascade,
      kind text not null,
      title text not null,
      total integer not null,
      next_no integer not null default 1,
      unit text not null default 'seans',
      notes text,
      is_active integer not null default 1,
      created_at timestamptz not null default now()
    )`);
    await sql.query(`create table if not exists package_ticks (
      appointment_id integer not null references appointments (id) on delete cascade,
      package_id integer not null references client_packages (id) on delete cascade,
      primary key (appointment_id, package_id)
    )`);
    await sql.query(`create index if not exists appointments_user_date_idx on appointments (user_id, appointment_date, appointment_time)`);
    await sql.query(`create index if not exists appointments_status_date_idx on appointments (status, appointment_date)`);
    await sql.query(`create index if not exists offplan_logs_user_idx on offplan_logs (user_id, created_at desc)`);
    await sql.query(`create index if not exists messages_unread_idx on messages (user_id, is_read)`);
    await sql.query(`create index if not exists client_packages_active_idx on client_packages (user_id, kind, is_active)`);
    await sql.query(`create index if not exists lab_values_user_idx on lab_values (user_id, taken_at, marker)`);
    await sql.query("alter table clinic_telegram add column if not exists cron_key text");
    await sql.query(`
      insert into staff_accounts (role, username, password_hash)
      select 'admin', 'admin', '${ADMIN_PASS_HASH}'
      where not exists (select 1 from staff_accounts where role = 'admin')
    `);
    await sql.query(`
      insert into staff_accounts (role, username, password_hash)
      select 'assistant', 'asistan', '${ASSISTANT_PASS_HASH}'
      where not exists (select 1 from staff_accounts where role = 'assistant')
    `);
  } catch {
    // columns already exist
  }
  const rows = await sql<{ c: number }>`select count(*)::int as c from users`;
  if ((rows[0]?.c ?? 0) > 0) {
    seeded = true;
    return;
  }
  await seedDemo(sql);
  seeded = true;
}

async function seedDemo(sql: Sql) {
  const pass = hashPassword("danisan123");
  const inserted = await sql<{ id: number }>`
    insert into users (full_name, phone, email, password, has_ishape, is_active, notes, target_weight, gender)
    values (
      'Ayşe Yılmaz',
      '05551112233',
      'ayse.yilmaz@example.com',
      ${pass},
      1,
      1,
      'Bel çevresi ve düzenli öğün odağında çalışıyoruz.',
      62,
      'kadin'
    )
    returning id
  `;
  const uid = inserted[0]!.id;

  await sql`
    insert into diet_lists (user_id, title, content, is_active, is_new) values
    (
      ${uid},
      '7 Günlük Dengeli Beslenme Programı',
      ${DIET_PROGRAM},
      1,
      1
    ),
    (
      ${uid},
      'Su ve Öğün Hatırlatmaları',
      ${WATER_NOTES},
      1,
      0
    )
  `;

  await sql`
    insert into measurements (user_id, measure_date, weight, height, waist, hip, chest, arm, leg, arm_right, arm_left, leg_right, leg_left, bmi, notes)
    values
    (${uid}, '2026-06-01', 74, 165, 88, 104, 92, 30, 58, 30, 29.5, 58, 57.5, 27.2, 'Başlangıç ölçümü'),
    (${uid}, '2026-07-15', 70.5, 165, 84, 102, 90, 29, 56, 29, 28.5, 56, 55.5, 25.9, 'İlk kontrol'),
    (${uid}, '2026-08-20', 68.2, 165, 81, 100, 89, 28.5, 55, 28.5, 28, 55, 54.5, 25.0, 'Son kontrol')
  `;

  await sql`
    insert into ishape_sessions (user_id, session_date, calories, duration_min, notes)
    values
    (${uid}, '2026-07-01', 420, 25, 'Karın ve bel'),
    (${uid}, '2026-07-15', 380, 25, 'Kalça ve bacak'),
    (${uid}, '2026-08-10', 450, 25, 'Full body')
  `;

  await sql`
    insert into messages (user_id, sender, message, is_read)
    values
    (${uid}, 'admin', 'Listenizi panele yükledim. Kahvaltı çeşitlendirmesini bir sonraki kontrolde konuşalım.', 1),
    (${uid}, 'client', 'Teşekkürler Feyza Hanım, kahvaltı seçeneklerini biraz çeşitlendirebilir miyiz?', 0)
  `;

  const today = isoDate(0);
  const upcoming = isoDate(3);
  const lastWeek = isoDate(-7);

  const a1 = await sql<{ id: number }>`
    insert into appointments (
      user_id, service_key, service_name, duration, price,
      client_name, client_phone, client_email,
      appointment_date, appointment_time, notes, status
    ) values (
      ${uid}, 'diyet', 'Diyet Danışmanlığı', 30, 3000,
      'Ayşe Yılmaz', '05551112233', 'ayse.yilmaz@example.com',
      ${today}, '14:00', 'Kontrol seansı', 'onaylandi'
    ) returning id
  `;

  const a2 = await sql<{ id: number }>`
    insert into appointments (
      user_id, service_key, service_name, duration, price,
      client_name, client_phone, client_email,
      appointment_date, appointment_time, notes, status
    ) values (
      ${uid}, 'diyet-ishape', 'Diyet + i-Shape EMS', 60, 8250,
      'Ayşe Yılmaz', '05551112233', 'ayse.yilmaz@example.com',
      ${upcoming}, '11:00', 'EMS seansı + program revizyonu', 'onaylandi'
    ) returning id
  `;

  await sql`
    insert into appointments (
      user_id, service_key, service_name, duration, price,
      client_name, client_phone, client_email,
      appointment_date, appointment_time, notes, status
    ) values
    (
      ${uid}, 'diyet', 'Diyet Danışmanlığı', 30, 3000,
      'Ayşe Yılmaz', '05551112233', 'ayse.yilmaz@example.com',
      ${lastWeek}, '10:30', 'İlk kontrol tamamlandı', 'tamamlandi'
    ),
    (
      null, 'diyet', 'Diyet Danışmanlığı', 30, 3000,
      'Mehmet Kaya', '05321234567', 'mehmet.kaya@example.com',
      ${isoDate(6)}, '10:00', 'İlk kez başvuruyor', 'beklemede'
    )
  `;

  await sql`
    insert into appointment_requests (
      appointment_id, user_id, request_type, preferred_date, preferred_time, reason, status
    ) values (
      ${a2[0]!.id}, ${uid}, 'ertele', ${isoDate(5)}, '16:00',
      'İş toplantısı uzadı, öğleden sonra olabilir miyim?', 'beklemede'
    )
  `;

  void a1;
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

const DIET_PROGRAM = `Sabah (08:00)
• 1 haşlanmış yumurta + 2 yumurta beyazı
• 1 dilim tam buğday ekmeği
• 5-6 adet zeytin (çekirdeksiz, yağı silinmiş)
• Sınırsız maydanoz / roka / salatalık
• Şekersiz bitki çayı

Kuşluk (10:30)
• 1 porsiyon meyve (elma veya 2 kivi)
• 10 adet çiğ badem

Öğle (13:00)
• 1 kase mercimek / ezogelin çorba
• Izgara hindi veya balık (avucunuz kadar)
• Bol salata (nar ekşisi, 1 tatlı kaşığı zeytinyağı)
• 3 yemek kaşığı bulgur pilavı

İkindi (16:00)
• 1 kase yağsız yoğurt veya kefir
• 1 tatlı kaşığı chia veya tarçın

Akşam (19:00)
• Izgara sebze (kabak, patlıcan, biber)
• Izgara tavuk veya köfte (yağsız)
• 1 kase salata
• Ekmek yok

Gece (isteğe bağlı)
• 1 bardak süt veya bitki çayı — 21:00’dan sonra katı gıda yok

Su hedefi: en az 2.5 litre. Yürüyüş: günde 35-40 dakika tempolu.`;

const WATER_NOTES = `• Sabah uyanınca 1 büyük bardak su
• Her ana öğünden 20 dk önce 1 bardak su
• Çay ve kahve su yerine geçmez
• Açlık hissi gelince önce su deneyin
• Akşam 21:00’dan sonra sıvıyı azaltın`;

export async function findClientByPhone(
  sql: Sql,
  phone: string,
): Promise<ClientRow | null> {
  const rows = await sql<ClientRow>`
    select id, full_name, phone, email, gender, has_ishape, is_active, notes,
           target_weight, last_panel_visit::text as last_panel_visit,
           coalesce(panel_theme, 'dogal') as panel_theme,
           created_at::text as created_at
    from users where phone = ${phone} limit 1
  `;
  return rows[0] ?? null;
}

export async function findClientById(
  sql: Sql,
  id: number,
): Promise<ClientRow | null> {
  const rows = await sql<ClientRow>`
    select id, full_name, phone, email, gender, has_ishape, is_active, notes,
           target_weight, last_panel_visit::text as last_panel_visit,
           coalesce(panel_theme, 'dogal') as panel_theme,
           created_at::text as created_at
    from users where id = ${id} limit 1
  `;
  return rows[0] ?? null;
}

export async function requireAdmin(): Promise<StaffRole> {
  await db();
  const role = getStaffRole();
  if (!role) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return role;
}

export async function requireOwner(): Promise<void> {
  const role = await requireAdmin();
  if (role !== "admin") {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
}

export async function requireClient(): Promise<ClientRow> {
  const sql = await db();
  const id = getClientIdFromCookie();
  if (!id) throw new Error("UNAUTHORIZED_CLIENT");
  const user = await findClientById(sql, id);
  if (!user || user.is_active !== 1) {
    clearClientCookie();
    throw new Error("UNAUTHORIZED_CLIENT");
  }
  return user;
}

export function isAuthError(e: unknown, kind: "admin" | "client"): boolean {
  return e instanceof Error && e.message === `UNAUTHORIZED_${kind.toUpperCase()}`;
}
