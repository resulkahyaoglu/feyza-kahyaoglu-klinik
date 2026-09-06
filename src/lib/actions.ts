import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import {
  CLINIC,
  clientCancelWhatsApp,
  computeBmi,
  computeProgress,
  displayPhone,
  formatDateTr,
  getService,
  mealSlotLabel,
  normalizePhone,
  offplanKindLabel,
  clockHHMM,
  isUpcomingSlot,
  todayISO,
  nowTimeIstanbul,
  monthISO,
  addDaysISO,
  monthRange,
  weekdayTr,
  weeklyDates,
  whatsappLink,
} from "@/lib/clinic";
import { extractPdfText } from "@/lib/pdf-text";
import {
  packageKindMeta,
  type ClientPackage,
} from "@/lib/packages";
import {
  labMarkerMeta,
  labOutOfRange,
  waterTargetMl,
  emptyWeekHabits,
  type DailyLog,
  type LabValue,
  type MindfulMeal,
  type WeekHabits,
} from "@/lib/wellness";
import { normalizePanelTheme } from "@/lib/client-theme";
import {
  cleanTelegramToken,
  formatTelegramNotice,
  makePairCode,
  maskToken,
  shouldRelayKind,
  telegramFindCode,
  telegramGetMe,
  telegramSend,
} from "@/lib/telegram";
import {
  listClinicBackups,
  maybeDailyBackup,
  readClinicBackup,
  writeClinicBackup,
} from "@/lib/backup";
import { buildAppointmentBriefing } from "@/lib/briefing";
import {
  FASTING_PRESETS,
  breakLabel,
  buildFastingView,
  endReasonLabel,
  isFastingEnabled,
  isInEatingWindow,
  type FastingLog,
  type FastingPlan,
  type FastingProtocol,
} from "@/lib/fasting";
import {
  checkAdminLogin,
  checkAssistantLogin,
  clearClientCookie,
  clearStaffCookies,
  db,
  findClientById,
  findClientByPhone,
  getStaffRole,
  hashPassword,
  isAdminSession,
  makeTempPassword,
  requireAdmin,
  requireClient,
  requireOwner,
  setAdminCookie,
  setAssistantCookie,
  setClientCookie,
  type ClientRow,
  type StaffRole,
} from "./session";
import type { Sql } from "@/lib/db";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isoStamp(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export type AppointmentRow = {
  id: number;
  user_id: number | null;
  service_key: string;
  service_name: string;
  duration: number;
  price: number;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  client_gender?: string | null;
  appointment_date: string;
  appointment_time: string;
  notes: string | null;
  status: string;
  admin_notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  created_at: string;
  is_measure?: number;
};

export type DietRow = {
  id: number;
  user_id: number;
  title: string;
  content: string;
  is_active: number;
  is_new: number;
  created_at: string;
  pdf_name: string | null;
  has_pdf: number;
};

export type { DailyLog, LabValue, MindfulMeal, WeekHabits } from "@/lib/wellness";

export type LabRow = {
  id: number;
  user_id: number;
  title: string;
  note: string | null;
  staff_note: string | null;
  kind: string;
  file_name: string | null;
  mime: string | null;
  is_read: number;
  created_at: string;
  client_name?: string;
};

export type MeasureRow = {
  id: number;
  user_id: number;
  measure_date: string;
  weight: number | null;
  height: number | null;
  waist: number | null;
  belly: number | null;
  hip: number | null;
  chest: number | null;
  arm_right: number | null;
  arm_left: number | null;
  leg_right: number | null;
  leg_left: number | null;
  bmi: number | null;
  notes: string | null;
  created_at: string;
};

export type PaymentRow = {
  id: number;
  user_id: number;
  client_name: string;
  paid_at: string;
  amount: number;
  method: string;
  notes: string | null;
  created_at: string;
};

export type ExpenseRow = {
  id: number;
  spent_at: string;
  amount: number;
  category: string;
  notes: string | null;
  created_at: string;
};

export type DebtRow = {
  id: number;
  user_id: number;
  kind: string;
  amount: number;
  notes: string | null;
  payment_id: number | null;
  created_at: string;
};

export type FeedbackRow = {
  id: number;
  user_id: number;
  message: string;
  is_read: number;
  created_at: string;
  client_name?: string;
  client_phone?: string;
};

export type DebtorRow = {
  id: number;
  full_name: string;
  phone: string;
  balance: number;
  last_note: string | null;
};

export type IshapeRow = {
  id: number;
  user_id: number;
  session_date: string;
  calories: number | null;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
};

export type MessageRow = {
  id: number;
  user_id: number;
  sender: string;
  message: string;
  is_read: number;
  created_at: string;
};

export type AdminNotif = {
  id: number;
  user_id: number | null;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  is_read: number;
  created_at: string;
  client_name?: string | null;
};

async function addNotification(
  sql: Sql,
  row: {
    userId?: number | null;
    kind: string;
    title: string;
    body?: string | null;
    href?: string | null;
    skipTelegram?: boolean;
  },
) {
  try {
    await sql`
      insert into admin_notifications (user_id, kind, title, body, href, is_read)
      values (
        ${row.userId ?? null},
        ${row.kind},
        ${row.title},
        ${row.body ?? null},
        ${row.href ?? null},
        0
      )
    `;
  } catch {
    // site kaydı asıl işi durdurmasın
  }
  if (row.skipTelegram) return;
  try {
    await relayTelegram(sql, row.kind, row.title, row.body ?? null);
  } catch {
    /* telegram asıl kaydı bozmasın */
  }
}

async function ensureTelegramTables(sql: Sql) {
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
  await sql.query("alter table clinic_telegram add column if not exists cron_key text");
}

async function relayTelegram(sql: Sql, kind: string, title: string, body: string | null) {
  if (!shouldRelayKind(kind)) return;
  await ensureTelegramTables(sql);
  const bots = await sql<{ bot_token: string | null }>`
    select bot_token from clinic_telegram where id = 1 limit 1
  `;
  const token = bots[0]?.bot_token?.trim();
  if (!token) return;
  const links = await sql<{ chat_id: string; role: string }>`
    select chat_id, role from telegram_links
    where coalesce(chat_id, '') <> ''
  `;
  const adminLinks = links.filter((l) => l.role === "admin" || l.role === "admin2");
  const asstLinks = links.filter((l) => l.role === "assistant");
  const both = new Set([
    "package",
    "reminder",
    "message",
    "booking",
    "request",
    "cancel",
    "lab",
  ]);
  const assistantOnly = new Set(["asst-reminder"]);
  const targets = assistantOnly.has(kind)
    ? asstLinks
    : both.has(kind)
      ? [...adminLinks, ...asstLinks]
      : adminLinks;
  if (targets.length === 0) return;
  const text = formatTelegramNotice(title, body);
  await Promise.all(
    targets.map((l) => telegramSend(token, String(l.chat_id), text)),
  );
}

function telegramRoleKey(role: StaffRole, slot: 1 | 2 = 1) {
  if (role === "assistant") return "assistant";
  return slot === 2 ? "admin2" : "admin";
}

function clientHref(userId: number) {
  return `/admin/danisan/${userId}`;
}

function packageKindsForService(serviceKey: string): Array<"ishape" | "diyet" | "combo" | "ozel"> {
  const k = String(serviceKey || "");
  const kinds: Array<"ishape" | "diyet" | "combo" | "ozel"> = [];
  if (k.includes("ishape")) kinds.push("ishape");
  if (k.includes("diyet")) kinds.push("diyet");
  if (k.includes("ishape") || k.includes("diyet")) kinds.push("combo");
  kinds.push("ozel");
  return kinds;
}

async function ensurePackageTicks(sql: Sql) {
  await sql.query(`create table if not exists package_ticks (
    appointment_id integer not null references appointments (id) on delete cascade,
    package_id integer not null references client_packages (id) on delete cascade,
    primary key (appointment_id, package_id)
  )`);
}

async function revertPackageTicksForAppointment(sql: Sql, appointmentId: number) {
  try {
    await ensurePackageTicks(sql);
    const rows = await sql<{ package_id: number }>`
      select package_id from package_ticks where appointment_id = ${appointmentId}
    `;
    for (const row of rows) {
      await sql`
        update client_packages
        set next_no = greatest(1, next_no - 1),
            is_active = 1
        where id = ${row.package_id}
      `;
    }
    await sql`delete from package_ticks where appointment_id = ${appointmentId}`;
  } catch {
    /* ignore */
  }
}

async function applyDuePackageTicks(sql: Sql) {
  try {
    await ensurePackageTicks(sql);
    const now = Date.now();
    const rows = await sql.query<{
      id: number;
      user_id: number;
      service_key: string;
      appointment_date: string;
      appointment_time: string;
    }>(
      `select a.id, a.user_id, a.service_key, a.appointment_date, a.appointment_time
       from appointments a
       where a.user_id is not null
         and a.status in ('onaylandi', 'tamamlandi', 'gelmedi')
         and a.appointment_date <= $1
         and not exists (
           select 1 from package_ticks t where t.appointment_id = a.id
         )
       order by a.appointment_date, a.appointment_time
       limit 80`,
      [todayISO()],
    );
    const due = rows.filter((a) => {
      const day = String(a.appointment_date).slice(0, 10);
      const time = clockHHMM(a.appointment_time);
      const apptMs = Date.parse(`${day}T${time}:00+03:00`);
      return Number.isFinite(apptMs) && apptMs <= now;
    });
    if (!due.length) return;
    const userIds = [...new Set(due.map((a) => Number(a.user_id)))].filter(
      (id) => Number.isInteger(id) && id > 0,
    );
    if (!userIds.length) return;
    const pkgRows = await sql.query<ClientPackage>(
      `select id, user_id, kind, title, total, next_no, unit, notes, is_active,
              created_at::text as created_at
       from client_packages
       where user_id in (${userIds.join(",")}) and is_active = 1 and next_no <= total
       order by id asc`,
    );
    const bags = new Map<string, ClientPackage[]>();
    for (const p of pkgRows) {
      const key = `${p.user_id}:${p.kind}`;
      const list = bags.get(key) ?? [];
      list.push(p);
      bags.set(key, list);
    }
    function takePkg(userId: number, kind: string) {
      const list = bags.get(`${userId}:${kind}`);
      if (!list) return null;
      return list.find((p) => p.is_active === 1 && p.next_no <= p.total) ?? null;
    }
    for (const a of due) {
      const kinds = packageKindsForService(a.service_key);
      for (const kind of kinds) {
        const p = takePkg(a.user_id, kind);
        if (!p) continue;
        const next = Math.min(p.total + 1, p.next_no + 1);
        const active = next > p.total ? 0 : 1;
        p.next_no = next;
        p.is_active = active;
        await sql`update client_packages set next_no = ${next}, is_active = ${active} where id = ${p.id}`;
        await sql`
          insert into package_ticks (appointment_id, package_id)
          values (${a.id}, ${p.id})
          on conflict do nothing
        `;
        await notifyPackageStatus(sql, p.user_id, p.title, next, p.total, p.unit);
      }
    }
  } catch {
    /* ignore */
  }
}

let lastReminderTick = 0;

async function tickAppointmentReminders(sql: Sql, force = false) {
  const now = Date.now();
  if (!force && now - lastReminderTick < 20000) return;
  lastReminderTick = now;
  try {
    await sql.query(`create table if not exists reminder_digests (
      kind text not null,
      for_date date not null,
      sent_at timestamptz not null default now(),
      primary key (kind, for_date)
    )`);
    await sql.query(`create table if not exists appointment_reminders (
      appointment_id integer not null references appointments (id) on delete cascade,
      kind text not null,
      sent_at timestamptz not null default now(),
      primary key (appointment_id, kind)
    )`);
  } catch {
    /* exists */
  }
  const today = todayISO();
  const clock = nowTimeIstanbul();
  const tomorrowDate = (() => {
    const t = new Date(`${today}T12:00:00+03:00`);
    t.setTime(t.getTime() + 86_400_000);
    return t.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  })();

  if (clock >= "21:00" && clock < "22:00") {
    try {
      await sendDayDigest(sql, "tomorrow", tomorrowDate, "Yarının randevuları");
    } catch (err) {
      console.error("digest tomorrow", err);
    }
  }
  if (clock >= "08:30" && clock < "09:30") {
    try {
      await sendDayDigest(sql, "today", today, "Bugünün randevuları");
    } catch (err) {
      console.error("digest today", err);
    }
  }
  try {
    await sendAssistantTwoHourReminders(sql, today);
  } catch (err) {
    console.error("2h reminders", err);
  }
  try {
    await sendAdminPrebriefings(sql, today);
  } catch (err) {
    console.error("prebrief", err);
  }
  try {
    await applyDuePackageTicks(sql);
  } catch (err) {
    console.error("package ticks", err);
  }
  if (clock >= "03:00" && clock < "04:00") {
    try {
      await maybeDailyBackup(sql);
    } catch (err) {
      console.error("daily backup", err);
    }
  }
}

async function sendAssistantTwoHourReminders(sql: Sql, today: string) {
  const rows = await sql.query<{
    id: number;
    client_name: string;
    service_name: string;
    appointment_date: string;
    appointment_time: string;
    is_measure: number;
  }>(
    `select id, client_name, service_name, appointment_date, appointment_time,
            coalesce(is_measure, 0) as is_measure
     from appointments
     where appointment_date >= $1
       and status in ('onaylandi', 'beklemede')
     order by appointment_date, appointment_time
     limit 80`,
    [today],
  );
  for (const a of rows) {
    const day = String(a.appointment_date).slice(0, 10);
    const time = clockHHMM(a.appointment_time);
    const apptMs = Date.parse(`${day}T${time}:00+03:00`);
    if (!Number.isFinite(apptMs)) continue;
    const hours = (apptMs - Date.now()) / 3_600_000;
    if (hours <= 0 || hours > 2.6) continue;
    const ins = await sql<{ appointment_id: number }>`
      insert into appointment_reminders (appointment_id, kind)
      values (${a.id}, '2h')
      on conflict do nothing
      returning appointment_id
    `;
    if (!ins[0]) continue;
    const measure = Number(a.is_measure) === 1 ? "Ölçüm var." : null;
    await addNotification(sql, {
      kind: "asst-reminder",
      title: `2 saat kaldı: ${a.client_name}`,
      body: [
        `${formatDateTr(a.appointment_date)} ${time}`,
        a.service_name,
        measure,
      ]
        .filter(Boolean)
        .join(" · "),
      href: "/admin/randevular",
    });
  }
}

async function sendAdminPrebriefings(sql: Sql, today: string) {
  const rows = await sql.query<{
    id: number;
    user_id: number | null;
    client_name: string;
    service_name: string;
    appointment_date: string;
    appointment_time: string;
    is_measure: number;
    notes: string | null;
    admin_notes: string | null;
  }>(
    `select id, user_id, client_name, service_name, appointment_date, appointment_time,
            coalesce(is_measure, 0) as is_measure, notes, admin_notes
     from appointments
     where appointment_date >= $1
       and status in ('onaylandi', 'beklemede')
     order by appointment_date, appointment_time
     limit 80`,
    [today],
  );
  for (const a of rows) {
    const day = String(a.appointment_date).slice(0, 10);
    const time = clockHHMM(a.appointment_time);
    const apptMs = Date.parse(`${day}T${time}:00+03:00`);
    if (!Number.isFinite(apptMs)) continue;
    const hours = (apptMs - Date.now()) / 3_600_000;
    if (hours <= 0 || hours > 2.6) continue;
    const ins = await sql<{ appointment_id: number }>`
      insert into appointment_reminders (appointment_id, kind)
      values (${a.id}, 'briefing')
      on conflict do nothing
      returning appointment_id
    `;
    if (!ins[0]) continue;
    try {
      const brief = await buildAppointmentBriefing(sql, a);
      await addNotification(sql, {
        userId: a.user_id,
        kind: "briefing",
        title: brief.title,
        body: brief.body,
        href: a.user_id ? clientHref(a.user_id) : "/admin/randevular",
      });
    } catch (err) {
      console.error("prebrief one", a.id, err);
      await addNotification(sql, {
        userId: a.user_id,
        kind: "briefing",
        title: `2 saat kala · ${a.client_name}`,
        body: `${formatDateTr(a.appointment_date)} ${time} · ${a.service_name}\nBrifing hazırlanamadı; paneli açın.`,
        href: a.user_id ? clientHref(a.user_id) : "/admin/randevular",
      });
    }
  }
}

async function sendDayDigest(sql: Sql, kind: "today" | "tomorrow", forDate: string, headline: string) {
  const ins = await sql<{ kind: string }>`
    insert into reminder_digests (kind, for_date)
    values (${kind}, ${forDate}::date)
    on conflict do nothing
    returning kind
  `;
  if (!ins[0]) return;
  const rows = await sql.query<{
    client_name: string;
    service_name: string;
    appointment_time: string;
    is_measure: number;
  }>(
    `select client_name, service_name, appointment_time, coalesce(is_measure, 0) as is_measure
     from appointments
     where appointment_date = $1
       and status in ('onaylandi', 'beklemede')
     order by appointment_time`,
    [forDate],
  );
  const lines = rows.map((a) => {
    const measure = Number(a.is_measure) === 1 ? " · ölçüm" : "";
    return `${clockHHMM(a.appointment_time)} ${a.client_name} · ${a.service_name}${measure}`;
  });
  const body =
    lines.length > 0
      ? `${formatDateTr(forDate)}\n${lines.join("\n")}\n\nToplam ${lines.length} randevu`
      : `${formatDateTr(forDate)} · randevu yok.`;
  await addNotification(sql, {
    kind: "reminder",
    title: headline,
    body,
    href: "/admin/randevular",
  });
}

async function logAssistant(
  sql: Sql,
  kind: string,
  title: string,
  body?: string | null,
  href?: string | null,
  force = false,
) {
  if (!force && getStaffRole() !== "assistant") return;
  try {
    await sql`
      insert into assistant_logs (kind, title, body, href)
      values (${kind}, ${title}, ${body ?? null}, ${href ?? null})
    `;
  } catch {
    // never block the actual save
  }
  if (kind === "login" || kind === "logout") return;
  await addNotification(sql, {
    kind: "assistant",
    title: `Asistan: ${title}`,
    body: body ?? null,
    href: href ?? null,
  });
}

export type DeleteRequestRow = {
  id: number;
  target_table: string;
  target_id: number;
  summary: string;
  status: string;
  created_at: string;
  decided_at: string | null;
};

export type AssistantLogRow = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  created_at: string;
};

async function queueDelete(
  sql: Sql,
  table: string,
  id: number,
  summary: string,
) {
  const existing = await sql<{ id: number }>`
    select id from delete_requests
    where target_table = ${table} and target_id = ${id} and status = 'beklemede'
    limit 1
  `;
  if (!existing[0]) {
    await sql`
      insert into delete_requests (target_table, target_id, summary, status)
      values (${table}, ${id}, ${summary}, 'beklemede')
    `;
  }
  await logAssistant(sql, "delete_request", "Silme onayı istedi", summary);
  return { ok: true as const, pending: true as const };
}

async function pendingDeleteIds(sql: Sql, table: string): Promise<number[]> {
  const rows = await sql<{ target_id: number }>`
    select target_id from delete_requests
    where target_table = ${table} and status = 'beklemede'
  `;
  return rows.map((r) => r.target_id);
}

async function executeQueuedDelete(sql: Sql, table: string, id: number) {
  if (table === "appointments") {
    await revertPackageTicksForAppointment(sql, id);
    await sql`delete from appointment_requests where appointment_id = ${id}`;
    await sql`delete from appointments where id = ${id}`;
    return;
  }
  if (table === "payments") {
    await sql`delete from client_debts where payment_id = ${id}`;
    await sql`delete from payments where id = ${id}`;
    return;
  }
  if (table === "expenses") {
    await sql`delete from expenses where id = ${id}`;
    return;
  }
  if (table === "client_debts") {
    await sql`delete from client_debts where id = ${id}`;
    return;
  }
  if (table === "clients") {
    await sql`delete from appointment_requests where user_id = ${id}`;
    await sql`delete from appointments where user_id = ${id}`;
    await sql`delete from client_debts where user_id = ${id}`;
    await sql`delete from payments where user_id = ${id}`;
    await sql`delete from offplan_logs where user_id = ${id}`;
    await sql`delete from users where id = ${id}`;
  }
}

async function debtBalanceOf(sql: Sql, userId: number): Promise<number> {
  const rows = await sql<{ n: number }>`
    select coalesce(
      sum(case when kind = 'borc' then amount else -amount end),
      0
    )::int as n
    from client_debts
    where user_id = ${userId}
  `;
  return rows[0]?.n ?? 0;
}

export type OffplanRow = {
  id: number;
  user_id: number;
  slot: string;
  kind: string;
  detail: string | null;
  amount: string | null;
  note: string | null;
  has_photo?: number;
  photo_path?: string | null;
  photo_b64?: string | null;
  photo_mime: string | null;
  photo_name: string | null;
  is_read: number;
  created_at: string;
  client_name?: string;
};

export type RequestRow = {
  id: number;
  appointment_id: number;
  user_id: number;
  request_type: string;
  preferred_date: string | null;
  preferred_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
  client_name?: string;
  client_phone?: string;
  client_gender?: string | null;
  appointment_date?: string;
  appointment_time?: string;
  service_name?: string;
};

const appointmentSelect = `
  id, user_id, service_key, service_name, duration, price,
  client_name, client_phone, client_email, appointment_date, appointment_time,
  notes, status, admin_notes,
  cancelled_at::text as cancelled_at, cancelled_by,
  created_at::text as created_at,
  coalesce(is_measure, 0) as is_measure,
  (select gender from users where users.id = appointments.user_id) as client_gender
`;

const PDF_DIR = join(process.cwd(), "data", "diet-pdfs");
const LAB_DIR = join(process.cwd(), "data", "lab-files");
const OFFPLAN_DIR = join(process.cwd(), "data", "offplan-photos");
const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

const OFFPLAN_LIST_SELECT = `o.id, o.user_id, o.slot, o.kind, o.detail, o.amount, o.note, o.is_read,
        o.photo_mime, o.photo_name,
        case when coalesce(o.photo_path, '') <> '' or (o.photo_b64 is not null and length(o.photo_b64) > 0) then 1 else 0 end as has_photo,
        o.created_at::text as created_at`;

function safePdfName(name: string): string {
  const trimmed = name.trim() || "diyet-listesi.pdf";
  const base = basename(trimmed).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

async function persistDietPdf(buf: Buffer, originalName: string): Promise<string> {
  await mkdir(PDF_DIR, { recursive: true });
  const filename = `${randomUUID()}-${safePdfName(originalName)}`;
  await writeFile(join(PDF_DIR, filename), buf);
  return filename;
}

async function removeDietPdfFile(pathName: string | null) {
  if (!pathName) return;
  try {
    await unlink(join(PDF_DIR, basename(pathName)));
  } catch {
    /* missing file is fine */
  }
}

async function ensureLabTable(sql: Sql) {
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
}

async function ensureWellnessTables(sql: Sql) {
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
}

function detectLabFile(buf: Buffer, name: string, mime: string): { kind: "pdf" | "image"; mime: string } | null {
  const head = buf.subarray(0, 12);
  const n = name.toLowerCase();
  const m = (mime || "").toLowerCase();
  if (head.subarray(0, 4).toString("utf8") === "%PDF" || n.endsWith(".pdf") || m.includes("pdf")) {
    if (head.subarray(0, 4).toString("utf8") !== "%PDF") return null;
    return { kind: "pdf", mime: "application/pdf" };
  }
  if (head[0] === 0xff && head[1] === 0xd8) return { kind: "image", mime: "image/jpeg" };
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e) return { kind: "image", mime: "image/png" };
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") {
    return { kind: "image", mime: "image/webp" };
  }
  if (head.subarray(0, 3).toString("ascii") === "GIF") return { kind: "image", mime: "image/gif" };
  return null;
}

async function persistLabFile(buf: Buffer, originalName: string): Promise<string> {
  await mkdir(LAB_DIR, { recursive: true });
  const raw = basename(originalName.trim() || "tahlil").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const filename = `${randomUUID()}-${raw || "tahlil"}`;
  await writeFile(join(LAB_DIR, filename), buf);
  return filename;
}

async function persistOffplanPhoto(buf: Buffer, originalName: string): Promise<string> {
  await mkdir(OFFPLAN_DIR, { recursive: true });
  const raw = basename(originalName.trim() || "yemek").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const filename = `${randomUUID()}-${raw || "yemek"}`;
  await writeFile(join(OFFPLAN_DIR, filename), buf);
  return filename;
}

async function readOffplanB64(pathName: string | null, fallbackB64: string | null): Promise<string | null> {
  if (pathName) {
    try {
      const buf = await readFile(join(OFFPLAN_DIR, basename(pathName)));
      return buf.toString("base64");
    } catch {
      /* fall through */
    }
  }
  return fallbackB64 || null;
}

async function ensureOffplanPhotoCol(sql: Sql) {
  try {
    await sql.query("alter table offplan_logs add column if not exists photo_path text");
  } catch {
    /* exists */
  }
}

async function removeLabFile(pathName: string | null) {
  if (!pathName) return;
  try {
    await unlink(join(LAB_DIR, basename(pathName)));
  } catch {
    /* missing */
  }
}

async function readLabB64(pathName: string | null, fallbackB64: string | null): Promise<string | null> {
  if (pathName) {
    try {
      const buf = await readFile(join(LAB_DIR, basename(pathName)));
      return buf.toString("base64");
    } catch {
      /* fall through */
    }
  }
  return fallbackB64 || null;
}

const LAB_LIST_SELECT = `id, user_id, title, note, staff_note, kind, file_name, mime, is_read,
        created_at::text as created_at`;

async function readDietPdfB64(pathName: string | null, fallbackB64: string | null): Promise<string | null> {
  if (pathName) {
    try {
      const buf = await readFile(join(PDF_DIR, basename(pathName)));
      return buf.toString("base64");
    } catch {
      /* fall through to db copy */
    }
  }
  return fallbackB64;
}

async function attachOrCreateClient(
  sql: Sql,
  appt: AppointmentRow,
): Promise<{
  userId: number;
  created: boolean;
  tempPassword?: string;
  clientName: string;
}> {
  const phone = normalizePhone(appt.client_phone);
  const existing = await findClientByPhone(sql, phone);
  if (existing) {
    if (appt.user_id !== existing.id) {
      await sql`
        update appointments set user_id = ${existing.id}
        where id = ${appt.id} or (client_phone = ${phone} and user_id is null)
      `;
    }
    return { userId: existing.id, created: false, clientName: existing.full_name };
  }

  const tempPassword = makeTempPassword(phone);
  const hasIshape = appt.service_key.includes("ishape") ? 1 : 0;
  const rows = await sql<{ id: number }>`
    insert into users (full_name, phone, email, password, has_ishape, is_active, notes)
    values (
      ${appt.client_name.trim()},
      ${phone},
      ${appt.client_email},
      ${hashPassword(tempPassword)},
      ${hasIshape},
      1,
      ${"Randevu onayı ile açıldı."}
    )
    returning id
  `;
  const userId = rows[0]!.id;
  await sql`
    update appointments set user_id = ${userId}
    where client_phone = ${phone} and user_id is null
  `;
  await sql`
    insert into messages (user_id, sender, message, is_read)
    values (
      ${userId},
      'admin',
      ${"Randevunuz onaylandı. Panele telefon numaranız ve geçici şifrenizle girebilirsiniz."},
      0
    )
  `;
  return {
    userId,
    created: true,
    tempPassword,
    clientName: appt.client_name.trim(),
  };
}

/* -------------------------------------------------------------------------- */
/* Public                                                                      */
/* -------------------------------------------------------------------------- */

export const submitBooking = createServerFn({ method: "POST" })
  .validator(
    z.object({
      serviceKey: z.string(),
      name: z.string(),
      phone: z.string(),
      email: z.string().optional(),
      date: z.string(),
      time: z.string(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const service = getService(data.serviceKey);
    if (!service) return { ok: false as const, error: "Geçersiz hizmet." };
    const name = data.name.trim();
    const phone = normalizePhone(data.phone);
    if (name.length < 3) return { ok: false as const, error: "Ad soyad gerekli." };
    if (phone.length !== 11) {
      return { ok: false as const, error: "Geçerli bir telefon girin." };
    }
    if (!data.date || data.date < todayISO()) {
      return { ok: false as const, error: "Geçmiş bir tarih seçilemez." };
    }
    if (!data.time) return { ok: false as const, error: "Saat seçin." };

    const sql = await db();
    const existing = await findClientByPhone(sql, phone);
    const email = data.email?.trim() || null;
    const notes = data.notes?.trim() || null;

    const rows = await sql<{ id: number }>`
      insert into appointments (
        user_id, service_key, service_name, duration, price,
        client_name, client_phone, client_email,
        appointment_date, appointment_time, notes, status
      ) values (
        ${existing?.id ?? null}, ${service.key}, ${service.name}, ${service.duration}, ${service.price},
        ${name}, ${phone}, ${email},
        ${data.date}, ${data.time}, ${notes}, 'beklemede'
      ) returning id
    `;
    const bookingId = rows[0]!.id;
    await addNotification(sql, {
      userId: existing?.id ?? null,
      kind: existing ? "booking" : "public_booking",
      title: existing
        ? `${name} panelden randevu talebi bıraktı`
        : `${name} siteden randevu talebi bıraktı`,
      body: `${formatDateTr(data.date)} ${data.time} · ${service.name}`,
      href: existing ? clientHref(existing.id) : "/admin/randevular",
    });
    return { ok: true as const, id: bookingId };
  });

export const submitForgotPassword = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string() }))
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const sql = await db();
    const user = phone.length === 11 ? await findClientByPhone(sql, phone) : null;
    if (user) {
      await sql`
        insert into messages (user_id, sender, message, is_read)
        values (${user.id}, 'client', 'Şifre sıfırlama talebi gönderildi.', 0)
      `;
      await addNotification(sql, {
        userId: user.id,
        kind: "forgot",
        title: `${user.full_name} şifremi unuttum dedi`,
        body: `${displayPhone(user.phone)} · danışan paneli girişini sıfırlayın`,
        href: clientHref(user.id),
      });
    }
    return { ok: true as const };
  });

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    await db();
    if (!(await checkAdminLogin(data.username, data.password))) {
      return { ok: false as const, error: "Kullanıcı adı veya şifre hatalı." };
    }
    setAdminCookie();
    return { ok: true as const };
  });

export const assistantLogin = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const sql = await db();
    if (!(await checkAssistantLogin(data.username, data.password))) {
      return { ok: false as const, error: "Kullanıcı adı veya şifre hatalı." };
    }
    setAssistantCookie();
    await logAssistant(sql, "login", "Panele giriş yaptı", null, null, true);
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const sql = await db();
  if (getStaffRole() === "assistant") {
    await logAssistant(sql, "logout", "Panelden çıkış yaptı", null, null, true);
  }
  clearStaffCookies();
  return { ok: true as const };
});

export const clientLogin = createServerFn({ method: "POST" })
  .validator(z.object({ phone: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const sql = await db();
    const phone = normalizePhone(data.phone);
    const user = await findClientByPhone(sql, phone);
    if (!user || user.is_active !== 1) {
      return { ok: false as const, error: "Telefon veya şifre hatalı." };
    }
    const rows = await sql<{ password: string }>`
      select password from users where id = ${user.id}
    `;
    if (!rows[0] || rows[0].password !== hashPassword(data.password)) {
      return { ok: false as const, error: "Telefon veya şifre hatalı." };
    }
    setClientCookie(user.id);
    return { ok: true as const, name: user.full_name };
  });

export const clientLogout = createServerFn({ method: "POST" }).handler(async () => {
  clearClientCookie();
  return { ok: true as const };
});

export const getPublicSession = createServerFn({ method: "GET" }).handler(
  async () => {
    await db();
    const staff = getStaffRole();
    let client: { id: number; name: string } | null = null;
    try {
      const u = await requireClient();
      client = { id: u.id, name: u.full_name };
    } catch {
      client = null;
    }
    return { admin: staff === "admin", assistant: staff === "assistant", client };
  },
);

/* -------------------------------------------------------------------------- */
/* Admin dashboard / appointments                                              */
/* -------------------------------------------------------------------------- */

export const loadAdminDashboard = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      await requireAdmin();
    } catch {
      return { auth: false as const };
    }
    const sql = await db();
    const today = todayISO();
    const hideBriefing = getStaffRole() === "assistant";
    try {
      await applyDuePackageTicks(sql);
    } catch {
      /* ignore */
    }

    try {
    await ensureOffplanPhotoCol(sql);
    const todayList = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       where appointment_date = $1 and status <> 'iptal'
       order by appointment_time`,
      [today],
    );
    const upcoming = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       where appointment_date >= $1 and status in ('beklemede','onaylandi')
       order by appointment_date, appointment_time
       limit 12`,
      [today],
    );
    const pending = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       where status = 'beklemede'
       order by appointment_date, appointment_time
       limit 20`,
    );
    const counts = await sql.query<{
      today_n: number;
      pending_n: number;
      approved_n: number;
      req_n: number;
      unread_n: number;
      cancel_n: number;
      offplan_n: number;
      notif_n: number;
    }>(
      `select
        (select count(*)::int from appointments where appointment_date = $1 and status <> 'iptal') as today_n,
        (select count(*)::int from appointments where status = 'beklemede') as pending_n,
        (select count(*)::int from appointments where status = 'onaylandi' and appointment_date >= $1) as approved_n,
        (select count(*)::int from appointment_requests where status = 'beklemede') as req_n,
        (select count(*)::int from messages where sender = 'client' and is_read = 0) as unread_n,
        (select count(*)::int from appointments where cancelled_by = 'client' and cancelled_at is not null) as cancel_n,
        (select count(*)::int from offplan_logs where is_read = 0) as offplan_n,
        (select count(*)::int from admin_notifications where is_read = 0${hideBriefing ? " and kind not in ('briefing','assistant')" : ""}) as notif_n
      `,
      [today],
    );
    const requests = await sql.query<RequestRow>(
      `select r.id, r.appointment_id, r.user_id, r.request_type, r.preferred_date, r.preferred_time,
              r.reason, r.status, r.created_at::text as created_at,
              u.full_name as client_name, u.phone as client_phone, u.gender as client_gender,
              a.appointment_date, a.appointment_time, a.service_name
       from appointment_requests r
       join users u on u.id = r.user_id
       join appointments a on a.id = r.appointment_id
       where r.status = 'beklemede'
       order by r.created_at desc`,
    );
    const unread = await sql.query<MessageRow & { client_name: string; client_phone: string }>(
      `select m.id, m.user_id, m.sender, m.message, m.is_read, m.created_at::text as created_at,
              u.full_name as client_name, u.phone as client_phone
       from messages m
       join users u on u.id = m.user_id
       where m.sender = 'client' and m.is_read = 0
       order by m.created_at desc
       limit 8`,
    );
    const cancels = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       where cancelled_by = 'client' and cancelled_at is not null
       order by cancelled_at desc
       limit 15`,
    );
    const offplans = await sql.query<OffplanRow>(
      `select ${OFFPLAN_LIST_SELECT}, u.full_name as client_name
       from offplan_logs o
       join users u on u.id = o.user_id
       where o.is_read = 0
       order by o.created_at desc
       limit 12`,
    );
    const notifs = await sql.query<AdminNotif>(
      `select n.id, n.user_id, n.kind, n.title, n.body, n.href, n.is_read,
              n.created_at::text as created_at, u.full_name as client_name
       from admin_notifications n
       left join users u on u.id = n.user_id
       where n.is_read = 0
         ${hideBriefing ? "and n.kind not in ('briefing','assistant')" : ""}
       order by n.created_at desc
       limit 8`,
    );

    let measureDue: Array<{ id: number; full_name: string; last_date: string | null }> = [];
    let topLoss: Array<{ id: number; full_name: string; value: number; detail: string }> = [];
    let topSlim: Array<{ id: number; full_name: string; value: number; detail: string }> = [];
    let topKcal: Array<{ id: number; full_name: string; value: number; detail: string }> = [];
    try {
      measureDue = await sql.query(
        `select u.id, u.full_name, lm.last_date
         from users u
         left join lateral (
           select max(measure_date)::text as last_date
           from measurements m where m.user_id = u.id
         ) lm on true
         where u.is_active = 1
           and (lm.last_date is null or lm.last_date::date < $1::date - 14)
         order by lm.last_date nulls first, u.full_name
         limit 20`,
        [today],
      );
    } catch {
      measureDue = [];
    }
    try {
      topLoss = await sql.query(
        `with b as (
           select user_id,
             (array_agg(weight order by measure_date, id))[1] as first_w,
             (array_agg(weight order by measure_date desc, id desc))[1] as last_w
           from measurements
           where weight is not null
           group by user_id
         )
         select u.id, u.full_name,
                (b.first_w - b.last_w)::float as value,
                (round((b.first_w - b.last_w)::numeric, 1)::text || ' kg') as detail
         from b join users u on u.id = b.user_id
         where b.first_w - b.last_w >= 0.3
         order by value desc
         limit 5`,
      );
    } catch {
      topLoss = [];
    }
    try {
      const raw = await sql.query<{
        user_id: number;
        full_name: string;
        measure_date: string;
        id: number;
        waist: number | null;
        hip: number | null;
        belly: number | null;
      }>(
        `select m.user_id, u.full_name, m.measure_date::text as measure_date, m.id,
                m.waist, m.hip, m.belly
         from measurements m
         join users u on u.id = m.user_id
         where u.is_active = 1`,
      );
      const byUser = new Map<number, typeof raw>();
      for (const row of raw) {
        const list = byUser.get(row.user_id) ?? [];
        list.push(row);
        byUser.set(row.user_id, list);
      }
      const ranked: Array<{ id: number; full_name: string; value: number; detail: string }> = [];
      for (const [uid, list] of byUser) {
        list.sort((a, b) => {
          const da = String(a.measure_date).slice(0, 10).localeCompare(String(b.measure_date).slice(0, 10));
          return da || a.id - b.id;
        });
        const first = list[0];
        const last = list[list.length - 1];
        if (!first || !last || first.id === last.id) continue;
        let delta = 0;
        let parts = 0;
        for (const key of ["waist", "hip", "belly"] as const) {
          const a = num(first[key]);
          const b = num(last[key]);
          if (a == null || b == null) continue;
          delta += a - b;
          parts += 1;
        }
        if (parts === 0 || delta < 1) continue;
        ranked.push({
          id: uid,
          full_name: first.full_name,
          value: delta,
          detail: `${delta.toFixed(1)} cm`,
        });
      }
      topSlim = ranked.sort((a, b) => b.value - a.value).slice(0, 5);
    } catch {
      topSlim = [];
    }
    try {
      topKcal = await sql.query(
        `select u.id, u.full_name,
                sum(s.calories)::float as value,
                (round(sum(s.calories))::text || ' kcal · ' || count(*)::text || ' seans') as detail
         from ishape_sessions s
         join users u on u.id = s.user_id
         where s.calories is not null
         group by u.id, u.full_name
         having sum(s.calories) > 0
         order by value desc
         limit 5`,
      );
    } catch {
      topKcal = [];
    }

    let pkgAlerts: Array<{
      id: number;
      user_id: number;
      full_name: string;
      title: string;
      remaining: number;
      unit: string;
      reason: "two" | "last" | "noappt";
    }> = [];
    try {
      const today = todayISO();
      const clock = nowTimeIstanbul();
      const low = await sql.query<{
        id: number;
        user_id: number;
        full_name: string;
        title: string;
        remaining: number;
        unit: string;
      }>(
        `select p.id, p.user_id, u.full_name, p.title, p.unit,
                greatest(0, p.total - p.next_no + 1)::int as remaining
         from client_packages p
         join users u on u.id = p.user_id
         where p.is_active = 1 and p.next_no <= p.total
           and (p.total - p.next_no + 1) <= 2
         order by remaining, u.full_name
         limit 20`,
      );
      for (const r of low) {
        pkgAlerts.push({
          ...r,
          reason: r.remaining === 1 ? "last" : "two",
        });
      }
      const noAppt = await sql.query<{
        id: number;
        user_id: number;
        full_name: string;
        title: string;
        remaining: number;
        unit: string;
      }>(
        `select p.id, p.user_id, u.full_name, p.title, p.unit,
                greatest(0, p.total - p.next_no + 1)::int as remaining
         from client_packages p
         join users u on u.id = p.user_id
         where p.is_active = 1 and p.next_no <= p.total
           and not exists (
             select 1 from appointments a
             where a.user_id = p.user_id
               and a.status in ('onaylandi', 'beklemede')
               and (
                 a.appointment_date > $1
                 or (a.appointment_date = $1 and a.appointment_time >= $2)
               )
           )
         order by remaining, u.full_name
         limit 20`,
        [today, clock],
      );
      for (const r of noAppt) {
        if (pkgAlerts.some((a) => a.id === r.id)) continue;
        pkgAlerts.push({ ...r, reason: "noappt" });
      }
    } catch {
      pkgAlerts = [];
    }

    return {
      auth: true as const,
      today,
      counts: counts[0] ?? {
        today_n: 0,
        pending_n: 0,
        approved_n: 0,
        req_n: 0,
        unread_n: 0,
        cancel_n: 0,
        offplan_n: 0,
        notif_n: 0,
      },
      todayList,
      upcoming,
      pending,
      requests,
      unread,
      cancels,
      offplans,
      notifs,
      measureDue,
      topLoss,
      topSlim,
      topKcal,
      pkgAlerts,
    };
    } catch (err) {
      console.error("loadAdminDashboard", err);
      return {
        auth: true as const,
        today,
        counts: {
          today_n: 0,
          pending_n: 0,
          approved_n: 0,
          req_n: 0,
          unread_n: 0,
          cancel_n: 0,
          offplan_n: 0,
          notif_n: 0,
        },
        todayList: [],
        upcoming: [],
        pending: [],
        requests: [],
        unread: [],
        cancels: [],
        offplans: [],
        notifs: [],
        measureDue: [],
        topLoss: [],
        topSlim: [],
        topKcal: [],
        pkgAlerts: [],
      };
    }
  },
);

export const loadAppointments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().optional(),
      date: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      await requireAdmin();
    } catch {
      return { auth: false as const };
    }
    const sql = await db();
    try {
    const clauses: string[] = ["1=1"];
    const params: unknown[] = [];
    if (data.q && data.q.trim()) {
      params.push("%" + data.q.trim() + "%");
      clauses.push(
        `(client_name ilike $${params.length} or client_phone ilike $${params.length})`,
      );
    }
    if (data.date) {
      params.push(data.date);
      clauses.push(`appointment_date = $${params.length}`);
    } else {
      if (data.from) {
        params.push(data.from);
        clauses.push(`appointment_date >= $${params.length}`);
      }
      if (data.to) {
        params.push(data.to);
        clauses.push(`appointment_date <= $${params.length}`);
      }
    }
    if (data.status && data.status !== "all") {
      params.push(data.status);
      clauses.push(`status = $${params.length}`);
    }
    const rows = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       where ${clauses.join(" and ")}
       order by appointment_date asc, appointment_time asc
       limit 200`,
      params,
    );
    return { auth: true as const, rows, role: getStaffRole() };
    } catch (err) {
      console.error("loadAppointments", err);
      return { auth: true as const, rows: [], role: getStaffRole() };
    }
  });

export const updateAppointmentStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
      status: z.string(),
      adminNotes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const allowed = ["beklemede", "onaylandi", "iptal", "tamamlandi", "gelmedi"];
    if (!allowed.includes(data.status)) return { ok: false as const };
    const sql = await db();
    const found = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments where id = $1`,
      [data.id],
    );
    const appt = found[0];
    if (!appt) return { ok: false as const };

    if (data.status === "iptal") {
      await revertPackageTicksForAppointment(sql, data.id);
      await sql`
        update appointments
        set status = ${data.status},
            admin_notes = ${data.adminNotes ?? null},
            cancelled_at = coalesce(cancelled_at, now()),
            cancelled_by = coalesce(cancelled_by, 'admin')
        where id = ${data.id}
      `;
    } else if (data.status === "tamamlandi" || data.status === "gelmedi") {
      await sql`
        update appointments
        set status = ${data.status}, admin_notes = ${data.adminNotes ?? null}
        where id = ${data.id}
      `;
    } else {
      await sql`
        update appointments
        set status = ${data.status},
            admin_notes = ${data.adminNotes ?? null},
            cancelled_at = null,
            cancelled_by = null
        where id = ${data.id}
      `;
    }

    let clientCreated = false;
    let tempPassword: string | undefined;
    let clientId = appt.user_id ?? undefined;
    let clientName = appt.client_name;

    if (data.status === "onaylandi" || data.status === "tamamlandi" || data.status === "gelmedi") {
      const attached = await attachOrCreateClient(sql, appt);
      clientCreated = attached.created;
      tempPassword = attached.tempPassword;
      clientId = attached.userId;
      clientName = attached.clientName;
    }
    if (data.status === "tamamlandi" || data.status === "gelmedi") {
      try {
        await applyDuePackageTicks(sql);
      } catch {
        /* ignore */
      }
    }

    return {
      ok: true as const,
      clientCreated,
      clientId,
      clientName,
      tempPassword,
    };
  });

export const deleteAppointment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const rows = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments where id = $1`,
      [data.id],
    );
    const appt = rows[0];
    if (!appt) return { ok: false as const, error: "Randevu bulunamadı." };
    await revertPackageTicksForAppointment(sql, data.id);
    await executeQueuedDelete(sql, "appointments", data.id);
    await logAssistant(
      sql,
      "delete",
      `Randevu sildi · ${appt.client_name}`,
      `${formatDateTr(appt.appointment_date)} ${appt.appointment_time} · ${appt.service_name}`,
    );
    return { ok: true as const, pending: false as const };
  });

export const decideRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
      decision: z.enum(["onaylandi", "reddedildi"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const reqs = await sql.query<RequestRow>(
      `select id, appointment_id, user_id, request_type, preferred_date, preferred_time,
              reason, status, created_at::text as created_at
       from appointment_requests where id = $1`,
      [data.id],
    );
    const req = reqs[0];
    if (!req) return { ok: false as const, error: "Talep bulunamadı." };

    await sql`update appointment_requests set status = ${data.decision} where id = ${data.id}`;

    if (data.decision === "onaylandi") {
      if (req.request_type === "iptal") {
        await sql`
          update appointments
          set status = 'iptal',
              cancelled_at = coalesce(cancelled_at, now()),
              cancelled_by = coalesce(cancelled_by, 'admin')
          where id = ${req.appointment_id}
        `;
        await sql`
          insert into messages (user_id, sender, message, is_read)
          values (${req.user_id}, 'admin', 'Randevu iptal talebiniz onaylandı.', 0)
        `;
      } else {
        const date = req.preferred_date;
        const time = req.preferred_time;
        if (date) {
          await sql`
            update appointments
            set appointment_date = ${date}, appointment_time = ${time ?? "09:00"}, status = 'onaylandi'
            where id = ${req.appointment_id}
          `;
        }
        await sql`
          insert into messages (user_id, sender, message, is_read)
          values (
            ${req.user_id},
            'admin',
            ${`Erteleme talebiniz onaylandı. Yeni tarih: ${date ?? ""} ${time ?? ""}`.trim()},
            0
          )
        `;
      }
    } else {
      await sql`
        insert into messages (user_id, sender, message, is_read)
        values (${req.user_id}, 'admin', 'Randevu değişikliği talebiniz şu an için uygun görülmedi. Lütfen iletişime geçin.', 0)
      `;
    }
    return { ok: true as const };
  });

export const exportAppointments = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireOwner();
    const sql = await db();
    const rows = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       order by appointment_date desc, appointment_time desc`,
    );
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Feyza Kahyaoğlu";
    const ws = wb.addWorksheet("Randevular");
    ws.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Tarih", key: "date", width: 14 },
      { header: "Saat", key: "time", width: 10 },
      { header: "Danışan", key: "name", width: 22 },
      { header: "Telefon", key: "phone", width: 16 },
      { header: "E-posta", key: "email", width: 24 },
      { header: "Hizmet", key: "service", width: 24 },
      { header: "Süre", key: "duration", width: 8 },
      { header: "Ücret", key: "price", width: 10 },
      { header: "Durum", key: "status", width: 14 },
      { header: "Not", key: "notes", width: 28 },
      { header: "Admin notu", key: "admin", width: 24 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const r of rows) {
      ws.addRow({
        id: r.id,
        date: r.appointment_date,
        time: r.appointment_time,
        name: r.client_name,
        phone: r.client_phone,
        email: r.client_email ?? "",
        service: r.service_name,
        duration: r.duration,
        price: r.price,
        status: r.status,
        notes: r.notes ?? "",
        admin: r.admin_notes ?? "",
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    const b64 = Buffer.from(buf as ArrayBuffer).toString("base64");
    return {
      filename: `randevular-${todayISO()}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      b64,
    };
  },
);

export const exportAllClinicData = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireOwner();
    const sql = await db();
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Feyza Kahyaoğlu";
    wb.created = new Date();

    const ozet = wb.addWorksheet("Ozet");
    ozet.columns = [
      { header: "Alan", key: "k", width: 28 },
      { header: "Deger", key: "v", width: 60 },
    ];
    ozet.getRow(1).font = { bold: true };
    ozet.addRow({ k: "Tarih", v: todayISO() });
    ozet.addRow({
      k: "Not",
      v: "Şifreler sistemde hash olarak tutulur; orijinal şifre geri yazılamaz. PDF ve fotoğraflar bu dosyada yok/var olarak işaretlenir.",
    });

    async function addSheet(name: string, query: string) {
      try {
        const rows = await sql.query<Record<string, unknown>>(query);
        const ws = wb.addWorksheet(name.slice(0, 31));
        if (rows.length === 0) {
          ws.addRow(["(kayıt yok)"]);
          return;
        }
        const keys = Object.keys(rows[0]!);
        ws.columns = keys.map((key) => ({
          header: key,
          key,
          width: Math.min(36, Math.max(14, key.length + 4)),
        }));
        ws.getRow(1).font = { bold: true };
        for (const r of rows) {
          const out: Record<string, unknown> = {};
          for (const key of keys) {
            const val = r[key];
            if (val == null) out[key] = "";
            else if (typeof val === "string" && val.length > 30000) {
              out[key] = `[uzun metin: ${val.length} karakter]`;
            } else {
              out[key] = val;
            }
          }
          ws.addRow(out);
        }
      } catch {
        const ws = wb.addWorksheet(name.slice(0, 31));
        ws.addRow(["Bu tablo şu an okunamadı."]);
      }
    }

    await addSheet(
      "Personel",
      `select role as rol, username as kullanici_adi, password_hash as sifre_hash,
              updated_at::text as guncelleme
       from staff_accounts order by role`,
    );
    await addSheet(
      "Danisanlar",
      `select id, full_name as ad_soyad, phone as telefon_kullanici_adi, gender as cinsiyet,
              password as sifre_hash, email, has_ishape, is_active as aktif,
              notes as notlar, target_weight as hedef_kilo,
              last_panel_visit::text as son_panel, created_at::text as kayit
       from users order by full_name`,
    );
    await addSheet(
      "Randevular",
      `select id, user_id, client_name, client_phone, client_email, service_key,
              service_name, duration, price, appointment_date, appointment_time,
              status, notes, admin_notes, cancelled_at, cancelled_by,
              coalesce(is_measure, 0) as olcum,
              created_at::text as created_at
       from appointments order by appointment_date desc, appointment_time desc`,
    );
    await addSheet(
      "Paketler",
      `select id, user_id, kind as tur, title as baslik, total as toplam, next_no as kaldigi,
              unit as birim, notes as notlar, is_active as aktif, created_at::text as created_at
       from client_packages order by created_at desc`,
    );
    await addSheet(
      "Randevu talepleri",
      `select id, appointment_id, user_id, request_type, preferred_date, preferred_time,
              reason, status, created_at::text as created_at
       from appointment_requests order by created_at desc`,
    );
    await addSheet(
      "Diyet listeleri",
      `select id, user_id, title, content, is_active, is_new, pdf_name,
              case when pdf_b64 is not null and length(pdf_b64) > 0 then 'var' else 'yok' end as pdf,
              created_at::text as created_at
       from diet_lists order by created_at desc`,
    );
    await addSheet(
      "Gunluk takip",
      `select d.id, d.user_id, u.full_name as danisan, d.log_date, d.water_ml, d.sweaty,
              d.low_carb, d.hunger_before, d.hunger_after, d.eat_trigger, d.sleep_hours, d.stress,
              d.mood, d.energy, d.created_at::text as created_at
       from daily_logs d join users u on u.id = d.user_id
       order by d.log_date desc`,
    );
    await addSheet(
      "Kan degerleri",
      `select v.id, v.user_id, u.full_name as danisan, v.taken_at, v.marker, v.value, v.unit, v.notes,
              v.ref_min, v.ref_max, v.created_at::text as created_at
       from lab_values v join users u on u.id = v.user_id
       order by v.taken_at desc`,
    );
    await addSheet(
      "Tahliller",
      `select l.id, l.user_id, u.full_name as danisan, l.title as baslik, l.note as not,
              l.staff_note as personel_notu, l.kind as tur, l.file_name as dosya,
              l.is_read as okundu, l.created_at::text as created_at
       from lab_uploads l
       join users u on u.id = l.user_id
       order by l.created_at desc`,
    );
    await addSheet(
      "Olculer",
      `select id, user_id, measure_date, weight, height, waist, belly, hip, chest,
              arm, leg, arm_right, arm_left, leg_right, leg_left, bmi, notes,
              created_at::text as created_at
       from measurements order by measure_date desc`,
    );
    await addSheet(
      "iShape",
      `select id, user_id, session_date, calories, duration_min, notes,
              created_at::text as created_at
       from ishape_sessions order by session_date desc`,
    );
    await addSheet(
      "Mesajlar",
      `select id, user_id, sender, message, is_read, created_at::text as created_at
       from messages order by created_at desc`,
    );
    await addSheet(
      "Odemeler",
      `select id, user_id, paid_at, amount, method, notes, created_at::text as created_at
       from payments order by paid_at desc, id desc`,
    );
    await addSheet(
      "Giderler",
      `select id, spent_at, amount, category, notes, created_at::text as created_at
       from expenses order by spent_at desc, id desc`,
    );
    await addSheet(
      "Borclar",
      `select id, user_id, kind, amount, notes, payment_id, created_at::text as created_at
       from client_debts order by created_at desc, id desc`,
    );
    await addSheet(
      "Plan disi",
      `select id, user_id, slot, kind, detail, amount, note, is_read,
              photo_name,
              case when photo_b64 is not null and length(photo_b64) > 0 then 'var' else 'yok' end as fotograf,
              created_at::text as created_at
       from offplan_logs order by created_at desc`,
    );
    await addSheet(
      "Bildirimler",
      `select id, user_id, kind, title, body, href, is_read, created_at::text as created_at
       from admin_notifications order by created_at desc`,
    );
    await addSheet(
      "Gorus ve oneriler",
      `select f.id, f.user_id, u.full_name as danisan, u.phone as telefon,
              f.message as mesaj, f.is_read as okundu, f.created_at::text as tarih
       from client_feedback f
       join users u on u.id = f.user_id
       order by f.created_at desc`,
    );
    await addSheet(
      "Aralikli oruc",
      `select user_id, enabled as aktif, protocol as protokol, window_start as pencere_bas,
              window_end as pencere_bit, days as gunler, notes as notlar,
              updated_at::text as guncelleme
       from fasting_plans order by updated_at desc`,
    );
    await addSheet(
      "Aralikli oruc kayit",
      `select id, user_id, log_date::text as tarih, kind as tur, reason as neden, detail as tuketilen,
              created_at::text as created_at
       from fasting_logs order by log_date desc, id desc`,
    );
    await addSheet(
      "Asistan islemleri",
      `select id, kind, title, body, href, created_at::text as created_at
       from assistant_logs order by created_at desc`,
    );
    await addSheet(
      "Silme istekleri",
      `select id, target_table, target_id, summary, status,
              created_at::text as created_at, decided_at::text as decided_at
       from delete_requests order by created_at desc`,
    );

    const buf = await wb.xlsx.writeBuffer();
    const b64 = Buffer.from(buf as ArrayBuffer).toString("base64");
    return {
      filename: `klinik-yedek-${todayISO()}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      b64,
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Admin clients                                                               */
/* -------------------------------------------------------------------------- */

export const loadClients = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      await requireAdmin();
    } catch {
      return { auth: false as const };
    }
    const sql = await db();
    try {
    const q = data.q?.trim();
    const rows = q
      ? await sql<ClientRow>`
          select id, full_name, phone, email, gender, has_ishape, is_active, notes,
                 target_weight, last_panel_visit::text as last_panel_visit,
                 created_at::text as created_at,
                 coalesce((
                   select sum(case when kind = 'borc' then amount else -amount end)
                   from client_debts d where d.user_id = users.id
                 ), 0)::int as debt_balance
          from users
          where full_name ilike ${"%" + q + "%"} or phone ilike ${"%" + q + "%"}
          order by created_at desc
        `
      : await sql<ClientRow>`
          select id, full_name, phone, email, gender, has_ishape, is_active, notes,
                 target_weight, last_panel_visit::text as last_panel_visit,
                 created_at::text as created_at,
                 coalesce((
                   select sum(case when kind = 'borc' then amount else -amount end)
                   from client_debts d where d.user_id = users.id
                 ), 0)::int as debt_balance
          from users
          order by created_at desc
        `;
    return { auth: true as const, rows };
    } catch (err) {
      console.error("loadClients", err);
      return { auth: true as const, rows: [] };
    }
  });

export const createClient = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fullName: z.string(),
      phone: z.string(),
      password: z.string(),
      email: z.string().optional(),
      gender: z.enum(["kadin", "erkek"]),
      hasIshape: z.boolean(),
      notes: z.string().optional(),
      targetWeight: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const name = data.fullName.trim();
    const phone = normalizePhone(data.phone);
    if (name.length < 3) return { ok: false as const, error: "Ad soyad gerekli." };
    if (phone.length !== 11) return { ok: false as const, error: "Geçerli telefon girin." };
    if (!data.password || data.password.length < 4) {
      return { ok: false as const, error: "Şifre en az 4 karakter olmalı." };
    }
    const sql = await db();
    const existing = await findClientByPhone(sql, phone);
    if (existing) return { ok: false as const, error: "Bu telefon zaten kayıtlı." };
    const rows = await sql<{ id: number }>`
      insert into users (full_name, phone, email, password, has_ishape, is_active, notes, target_weight, gender)
      values (
        ${name}, ${phone}, ${data.email?.trim() || null}, ${hashPassword(data.password)},
        ${data.hasIshape ? 1 : 0}, 1, ${data.notes?.trim() || null}, ${data.targetWeight ?? null},
        ${data.gender}
      ) returning id
    `;
    await logAssistant(sql, "create", `${name} danışan olarak eklendi`, null, clientHref(rows[0]!.id));
    return { ok: true as const, id: rows[0]!.id };
  });

export const updateClientProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
      fullName: z.string().optional(),
      email: z.string().optional(),
      notes: z.string().optional(),
      targetWeight: z.number().nullable().optional(),
      gender: z.enum(["kadin", "erkek"]).nullable().optional(),
      hasIshape: z.boolean().optional(),
      isActive: z.boolean().optional(),
      password: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const user = await findClientById(sql, data.id);
    if (!user) return { ok: false as const, error: "Danışan bulunamadı." };
    const fullName = data.fullName?.trim() || user.full_name;
    const email = data.email !== undefined ? data.email.trim() || null : user.email;
    const notes = data.notes !== undefined ? data.notes.trim() || null : user.notes;
    const target =
      data.targetWeight === undefined ? user.target_weight : data.targetWeight;
    const gender =
      data.gender === undefined ? user.gender : data.gender;
    const hasI = data.hasIshape === undefined ? user.has_ishape : data.hasIshape ? 1 : 0;
    const active = data.isActive === undefined ? user.is_active : data.isActive ? 1 : 0;
    await sql`
      update users set
        full_name = ${fullName},
        email = ${email},
        notes = ${notes},
        target_weight = ${target},
        gender = ${gender},
        has_ishape = ${hasI},
        is_active = ${active}
      where id = ${data.id}
    `;
    if (data.password && data.password.length >= 8) {
      if (getStaffRole() !== "admin") {
        return { ok: false as const, error: "Şifreyi yalnızca yönetici değiştirebilir." };
      }
      await sql`update users set password = ${hashPassword(data.password)} where id = ${data.id}`;
    }
    await logAssistant(sql, "update", `${fullName} profili güncellendi`, null, clientHref(data.id));
    return { ok: true as const };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireOwner();
    const sql = await db();
    const user = await findClientById(sql, data.id);
    if (!user) return { ok: false as const, error: "Danışan bulunamadı." };
    await executeQueuedDelete(sql, "clients", data.id);
    await logAssistant(sql, "delete", `Danışan sildi · ${user.full_name}`);
    return { ok: true as const, pending: false as const, name: user.full_name };
  });

export const addDiet = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!(input instanceof FormData)) {
      throw new Error("Form verisi bekleniyor.");
    }
    const userId = Number(input.get("userId"));
    const title = String(input.get("title") || "");
    const content = String(input.get("content") || "");
    const pdf = input.get("pdf");
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error("Danışan seçilmedi.");
    }
    return { userId, title, content, pdf };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const title = data.title.trim();
    let content = data.content.trim();
    if (!title) return { ok: false as const, error: "Başlık gerekli." };
    let pdfName: string | null = null;
    let pdfB64: string | null = null;
    let pdfPath: string | null = null;
    const pdf = data.pdf;
    if (pdf instanceof Blob && pdf.size > 0) {
      const name =
        pdf instanceof File && pdf.name ? pdf.name : "diyet-listesi.pdf";
      if (!name.toLowerCase().endsWith(".pdf") && pdf.type && pdf.type !== "application/pdf") {
        return { ok: false as const, error: "Yalnızca PDF yükleyin." };
      }
      if (pdf.size > MAX_UPLOAD_BYTES) {
        return { ok: false as const, error: "PDF en fazla 32 MB olmalı." };
      }
      const buf = Buffer.from(await pdf.arrayBuffer());
      if (buf.subarray(0, 4).toString("utf8") !== "%PDF") {
        return { ok: false as const, error: "Dosya geçerli bir PDF değil." };
      }
      pdfName = name;
      try {
        pdfPath = await persistDietPdf(buf, name);
      } catch {
        pdfB64 = buf.toString("base64");
      }
    }
    if (!content && !pdfPath && !pdfB64) {
      return { ok: false as const, error: "PDF yükleyin veya metin yazın." };
    }
    const sql = await db();
    try {
      await sql.query("alter table diet_lists add column if not exists pdf_path text");
    } catch {
      /* already exists */
    }
    try {
      await sql`
        insert into diet_lists (user_id, title, content, is_active, is_new, pdf_name, pdf_b64, pdf_path)
        values (${data.userId}, ${title}, ${content}, 1, 1, ${pdfName}, ${pdfB64}, ${pdfPath})
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kaydedilemedi.";
      return { ok: false as const, error: msg };
    }
    await logAssistant(sql, "create", `Diyet listesi yüklendi: ${title}`, null, clientHref(data.userId));
    return { ok: true as const };
  });

export const deleteDiet = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const rows = await sql<{ title: string; pdf_path: string | null; user_id: number }>`
      delete from diet_lists where id = ${data.id}
      returning title, pdf_path, user_id
    `;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Liste bulunamadı." };
    await removeDietPdfFile(row.pdf_path);
    await logAssistant(sql, "delete", `Diyet listesi sildi: ${row.title}`, null, clientHref(row.user_id));
    return { ok: true as const };
  });

export const saveFastingPlan = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      protocol: z.enum(["kapali", "14-10", "16-8", "16-8-erken", "ozel"]),
      windowStart: z.string(),
      windowEnd: z.string(),
      days: z.array(z.number()),
      enabled: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const protocol = data.protocol as FastingProtocol;
    const preset = FASTING_PRESETS.find((p) => p.key === protocol);
    const start =
      protocol === "ozel" ? clockHHMM(data.windowStart) : clockHHMM(preset?.start || "12:00");
    const end =
      protocol === "ozel" ? clockHHMM(data.windowEnd) : clockHHMM(preset?.end || "20:00");
    if (protocol === "ozel" && start === end) {
      return { ok: false as const, error: "Başlangıç ve bitiş aynı olamaz." };
    }
    const enabled =
      data.enabled === false || protocol === "kapali" ? 0 : 1;
    const days = (data.days.filter((n) => n >= 1 && n <= 7).length
      ? data.days.filter((n) => n >= 1 && n <= 7)
      : [1, 2, 3, 4, 5, 6, 7]
    )
      .sort((a, b) => a - b)
      .join(",");
    const sql = await db();
    try {
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
    } catch {
      /* exists */
    }
    await sql`
      insert into fasting_plans (user_id, enabled, protocol, window_start, window_end, days, updated_at)
      values (${data.userId}, ${enabled}, ${protocol}, ${start}, ${end}, ${days}, now())
      on conflict (user_id) do update set
        enabled = excluded.enabled,
        protocol = excluded.protocol,
        window_start = excluded.window_start,
        window_end = excluded.window_end,
        days = excluded.days,
        updated_at = now()
    `;
    await logAssistant(
      sql,
      enabled ? "update" : "delete",
      enabled ? `Aralıklı oruç açıldı: ${preset?.label ?? protocol}` : "Aralıklı oruç kapatıldı",
      `${start}–${end}`,
      clientHref(data.userId),
    );
    return { ok: true as const };
  });

export const pauseFasting = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      reason: z.enum(["ramazan", "regl", "diger"]).nullable(),
      until: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    try {
      await sql.query("alter table fasting_plans add column if not exists pause_reason text");
      await sql.query("alter table fasting_plans add column if not exists pause_until date");
    } catch {
      /* exists */
    }
    const until = data.until?.slice(0, 10) || null;
    const reason = until ? data.reason : null;
    const existing = await sql<{ user_id: number }>`
      select user_id from fasting_plans where user_id = ${data.userId} limit 1
    `;
    if (!existing[0]) {
      return { ok: false as const, error: "Önce bir protokol kaydedin." };
    }
    await sql`
      update fasting_plans
      set pause_reason = ${reason},
          pause_until = ${until},
          updated_at = now()
      where user_id = ${data.userId}
    `;
    await logAssistant(
      sql,
      "update",
      until ? `Aralıklı oruç duraklatıldı (${reason})` : "Aralıklı oruç duraklatması kaldırıldı",
      until,
      clientHref(data.userId),
    );
    return { ok: true as const };
  });

export const addMeasurement = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      measureDate: z.string(),
      weight: z.number().optional(),
      height: z.number().optional(),
      waist: z.number().optional(),
      belly: z.number().optional(),
      hip: z.number().optional(),
      chest: z.number().optional(),
      armRight: z.number().optional(),
      armLeft: z.number().optional(),
      legRight: z.number().optional(),
      legLeft: z.number().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const bmi =
      data.weight && data.height ? computeBmi(data.weight, data.height) : null;
    await sql`
      insert into measurements (
        user_id, measure_date, weight, height, waist, belly, hip, chest,
        arm, leg, arm_right, arm_left, leg_right, leg_left, bmi, notes
      ) values (
        ${data.userId}, ${data.measureDate},
        ${data.weight ?? null}, ${data.height ?? null}, ${data.waist ?? null},
        ${data.belly ?? null}, ${data.hip ?? null}, ${data.chest ?? null},
        ${data.armRight ?? null}, ${data.legRight ?? null},
        ${data.armRight ?? null}, ${data.armLeft ?? null},
        ${data.legRight ?? null}, ${data.legLeft ?? null},
        ${bmi}, ${data.notes?.trim() || null}
      )
    `;
    await logAssistant(
      sql,
      "create",
      `Ölçü eklendi${data.weight ? ` (${data.weight} kg)` : ""}`,
      data.measureDate,
      clientHref(data.userId),
    );
    return { ok: true as const };
  });

export const deleteMeasurement = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const rows = await sql<{ measure_date: string; weight: number | null }>`
      delete from measurements where id = ${data.id}
      returning measure_date, weight
    `;
    const m = rows[0];
    if (!m) return { ok: false as const, error: "Ölçü bulunamadı." };
    await logAssistant(
      sql,
      "delete",
      `Ölçü sildi${m.weight ? ` (${m.weight} kg)` : ""}`,
      m.measure_date,
    );
    return { ok: true as const };
  });

export const addIshape = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      sessionDate: z.string(),
      calories: z.number().optional(),
      durationMin: z.number().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    await sql`
      insert into ishape_sessions (user_id, session_date, calories, duration_min, notes)
      values (
        ${data.userId}, ${data.sessionDate},
        ${data.calories ?? null}, ${data.durationMin ?? null}, ${data.notes?.trim() || null}
      )
    `;
    await logAssistant(sql, "create", "i-Shape EMS seansı eklendi", data.sessionDate, clientHref(data.userId));
    return { ok: true as const };
  });

export const deleteIshape = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const rows = await sql<{
      session_date: string;
      calories: number | null;
      user_id: number;
    }>`
      delete from ishape_sessions where id = ${data.id}
      returning session_date, calories, user_id
    `;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Seans bulunamadı." };
    await logAssistant(
      sql,
      "delete",
      `i-Shape EMS seansı sildi${row.calories != null ? ` (${row.calories} kcal)` : ""}`,
      row.session_date,
      clientHref(row.user_id),
    );
    return { ok: true as const };
  });

export const sendAdminMessage = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.number(), message: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const text = data.message.trim();
    if (!text) return { ok: false as const };
    const sql = await db();
    await sql`
      insert into messages (user_id, sender, message, is_read)
      values (${data.userId}, 'admin', ${text}, 0)
    `;
    await logAssistant(sql, "message", "Danışana mesaj yazdı", text.slice(0, 180), clientHref(data.userId));
    return { ok: true as const };
  });

export const loadClientDetail = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    try {
      await requireAdmin();
    } catch {
      return { auth: false as const };
    }
    const sql = await db();
    const user = await findClientById(sql, data.id);
    if (!user) return { auth: true as const, missing: true as const };
    try {
    await ensureOffplanPhotoCol(sql);
    const diets = await sql<DietRow>`
      select id, user_id, title, content, is_active, is_new, created_at::text as created_at,
             pdf_name,
             case when coalesce(pdf_path, '') <> '' or coalesce(pdf_name, '') <> '' or pdf_b64 is not null then 1 else 0 end as has_pdf
      from diet_lists where user_id = ${data.id} order by created_at desc
    `;
    const measures = await sql<MeasureRow>`
      select id, user_id, measure_date, weight, height, waist, belly, hip, chest,
             coalesce(arm_right, arm) as arm_right,
             coalesce(arm_left, arm) as arm_left,
             coalesce(leg_right, leg) as leg_right,
             coalesce(leg_left, leg) as leg_left,
             bmi, notes, created_at::text as created_at
      from measurements where user_id = ${data.id} order by measure_date desc
    `;
    const ishape = await sql<IshapeRow>`
      select id, user_id, session_date, calories, duration_min, notes, created_at::text as created_at
      from ishape_sessions where user_id = ${data.id} order by session_date desc
    `;
    const messages = await sql<MessageRow>`
      select id, user_id, sender, message, is_read, created_at::text as created_at
      from messages where user_id = ${data.id} order by created_at asc
    `;
    const appts = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments where user_id = $1
       order by appointment_date desc, appointment_time desc`,
      [data.id],
    );
    const payments = await sql<PaymentRow>`
      select p.id, p.user_id, u.full_name as client_name, p.paid_at, p.amount, p.method, p.notes,
             p.created_at::text as created_at
      from payments p
      join users u on u.id = p.user_id
      where p.user_id = ${data.id}
      order by p.paid_at desc, p.id desc
    `;
    const offplans = await sql<OffplanRow>`
      select id, user_id, slot, kind, detail, amount, note, is_read,
             photo_mime, photo_name,
             case when coalesce(photo_path, '') <> '' or (photo_b64 is not null and length(photo_b64) > 0) then 1 else 0 end as has_photo,
             created_at::text as created_at
      from offplan_logs where user_id = ${data.id} order by created_at desc
    `;
    let feedback: FeedbackRow[] = [];
    try {
      feedback = await sql<FeedbackRow>`
        select id, user_id, message, is_read, created_at::text as created_at
        from client_feedback where user_id = ${data.id} order by created_at desc
      `;
    } catch {
      feedback = [];
    }
    let fasting: FastingPlan | null = null;
    try {
      const rows = await sql<FastingPlan>`
        select user_id, enabled, protocol, window_start, window_end, days, notes,
               pause_reason, pause_until::text as pause_until,
               updated_at::text as updated_at
        from fasting_plans where user_id = ${data.id} limit 1
      `;
      fasting = rows[0] ?? null;
    } catch {
      fasting = null;
    }
    let fastingLogs: FastingLog[] = [];
    let fastingToday: FastingLog | null = null;
    try {
      fastingLogs = await sql<FastingLog>`
        select id, user_id, log_date::text as log_date, kind, reason, detail,
               energy, dizzy, end_reason, created_at::text as created_at
        from fasting_logs where user_id = ${data.id}
        order by log_date desc, id desc
        limit 90
      `;
      fastingToday = fastingLogs.find((r) => String(r.log_date).slice(0, 10) === todayISO()) ?? null;
    } catch {
      fastingLogs = [];
      fastingToday = null;
    }
    let packages: ClientPackage[] = [];
    try {
      packages = await sql<ClientPackage>`
        select id, user_id, kind, title, total, next_no, unit, notes, is_active,
               created_at::text as created_at
        from client_packages where user_id = ${data.id}
        order by is_active desc, created_at desc
      `;
    } catch {
      packages = [];
    }
    let labs: LabRow[] = [];
    try {
      await ensureLabTable(sql);
      labs = await sql<LabRow>`
        select id, user_id, title, note, staff_note, kind, file_name, mime, is_read,
               created_at::text as created_at
        from lab_uploads where user_id = ${data.id}
        order by created_at desc
      `;
    } catch {
      labs = [];
    }
    let dailyLogs: DailyLog[] = [];
    let labValues: LabValue[] = [];
    try {
      await ensureWellnessTables(sql);
      dailyLogs = await sql<DailyLog>`
        select id, user_id, log_date::text as log_date, water_ml, sweaty, low_carb,
               hunger_before, hunger_after, eat_trigger, sleep_hours, stress,
               mood, energy, created_at::text as created_at
        from daily_logs where user_id = ${data.id}
        order by log_date desc
        limit 30
      `;
      labValues = await sql<LabValue>`
        select id, user_id, taken_at::text as taken_at, marker, value, unit, notes,
               ref_min, ref_max, created_at::text as created_at
        from lab_values where user_id = ${data.id}
        order by taken_at desc, id desc
        limit 40
      `;
    } catch {
      dailyLogs = [];
      labValues = [];
    }
    let mindfulMeals: MindfulMeal[] = [];
    try {
      mindfulMeals = await sql<MindfulMeal>`
        select id, user_id, log_date::text as log_date, slot, hunger_before, hunger_after,
               eat_trigger, created_at::text as created_at
        from mindful_meals where user_id = ${data.id}
        order by log_date desc, id desc
        limit 40
      `;
    } catch {
      mindfulMeals = [];
    }
    const debts = await sql<DebtRow>`
      select id, user_id, kind, amount, notes, payment_id, created_at::text as created_at
      from client_debts where user_id = ${data.id}
      order by created_at desc, id desc
    `;
    const debtBalance = debts.reduce(
      (s, d) => s + (d.kind === "borc" ? d.amount : -d.amount),
      0,
    );
    await sql`update messages set is_read = 1 where user_id = ${data.id} and sender = 'client'`;
    await sql`update offplan_logs set is_read = 1 where user_id = ${data.id}`;
    return {
      auth: true as const,
      missing: false as const,
      user,
      diets,
      measures,
      ishape,
      messages,
      appts,
      payments,
      offplans,
      feedback,
      fasting,
      fastingLogs,
      fastingToday,
      packages,
      labs,
      dailyLogs,
      labValues,
      mindfulMeals,
      debts,
      debtBalance,
      role: getStaffRole(),
      pendingPayments: await pendingDeleteIds(sql, "payments"),
      pendingDebts: await pendingDeleteIds(sql, "client_debts"),
    };
    } catch (err) {
      console.error("loadClientDetail", err);
      return {
        auth: true as const,
        missing: false as const,
        user,
        diets: [],
        measures: [],
        ishape: [],
        messages: [],
        appts: [],
        payments: [],
        offplans: [],
        feedback: [],
        fasting: null,
        fastingLogs: [],
        fastingToday: null,
        packages: [],
        labs: [],
        dailyLogs: [],
        labValues: [],
        mindfulMeals: [],
        debts: [],
        debtBalance: 0,
        role: getStaffRole(),
        pendingPayments: [],
        pendingDebts: [],
      };
    }
  });

const PAY_METHODS = z.enum(["nakit", "kredi-karti", "havale", "diger"]);

export const addPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      paidAt: z.string(),
      amount: z.number(),
      method: PAY_METHODS,
      notes: z.string().optional(),
      applyToDebt: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (!data.paidAt || data.amount <= 0) {
      return { ok: false as const, error: "Tarih ve tutar gerekli." };
    }
    const sql = await db();
    const user = await findClientById(sql, data.userId);
    if (!user) return { ok: false as const, error: "Danışan bulunamadı." };
    const amount = Math.round(data.amount);
    const inserted = await sql<{ id: number }>`
      insert into payments (user_id, paid_at, amount, method, notes)
      values (
        ${data.userId}, ${data.paidAt}, ${amount}, ${data.method},
        ${data.notes?.trim() || null}
      )
      returning id
    `;
    const paymentId = inserted[0]!.id;
    if (data.applyToDebt !== false) {
      const remaining = await debtBalanceOf(sql, data.userId);
      const settle = Math.min(amount, Math.max(0, remaining));
      if (settle > 0) {
        await sql`
          insert into client_debts (user_id, kind, amount, notes, payment_id)
          values (
            ${data.userId},
            'tahsilat',
            ${settle},
            ${data.notes?.trim() || "Ödemeden düşüldü"},
            ${paymentId}
          )
        `;
      }
    }
    await logAssistant(
      sql,
      "create",
      `Ödeme kaydedildi · ${amount} TL`,
      data.notes?.trim() || data.method,
      clientHref(data.userId),
    );
    return { ok: true as const };
  });

export const deletePayment = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const role = await requireAdmin();
    const sql = await db();
    const rows = await sql<PaymentRow>`
      select p.id, p.user_id, u.full_name as client_name, p.paid_at, p.amount, p.method, p.notes,
             p.created_at::text as created_at
      from payments p
      join users u on u.id = p.user_id
      where p.id = ${data.id}
    `;
    const row = rows[0];
    if (role === "assistant") {
      return queueDelete(
        sql,
        "payments",
        data.id,
        row
          ? `Ödeme · ${row.client_name} · ${row.amount} TL`
          : `Ödeme #${data.id}`,
      );
    }
    await executeQueuedDelete(sql, "payments", data.id);
    return { ok: true as const, pending: false as const };
  });

export const addDebt = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      amount: z.number(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (data.amount <= 0) return { ok: false as const, error: "Tutar gerekli." };
    const sql = await db();
    const user = await findClientById(sql, data.userId);
    if (!user) return { ok: false as const, error: "Danışan bulunamadı." };
    await sql`
      insert into client_debts (user_id, kind, amount, notes)
      values (
        ${data.userId},
        'borc',
        ${Math.round(data.amount)},
        ${data.notes?.trim() || null}
      )
    `;
    await logAssistant(
      sql,
      "create",
      `${user.full_name} borç eklendi · ${Math.round(data.amount)} TL`,
      data.notes?.trim() || null,
      clientHref(data.userId),
    );
    return { ok: true as const };
  });

export const deleteDebt = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const role = await requireAdmin();
    const sql = await db();
    const rows = await sql<{ amount: number; notes: string | null; user_id: number }>`
      select amount, notes, user_id from client_debts where id = ${data.id}
    `;
    const d = rows[0];
    if (role === "assistant") {
      return queueDelete(
        sql,
        "client_debts",
        data.id,
        d ? `Borç kaydı · ${d.amount} TL${d.notes ? ` · ${d.notes}` : ""}` : `Borç #${data.id}`,
      );
    }
    await executeQueuedDelete(sql, "client_debts", data.id);
    return { ok: true as const, pending: false as const };
  });

export const addExpense = createServerFn({ method: "POST" })
  .validator(
    z.object({
      spentAt: z.string(),
      amount: z.number(),
      category: z.string(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const category = data.category.trim();
    if (!data.spentAt || data.amount <= 0 || !category) {
      return { ok: false as const, error: "Tarih, tutar ve kalem gerekli." };
    }
    const sql = await db();
    await sql`
      insert into expenses (spent_at, amount, category, notes)
      values (
        ${data.spentAt}, ${Math.round(data.amount)}, ${category},
        ${data.notes?.trim() || null}
      )
    `;
    await logAssistant(
      sql,
      "create",
      `Gider yazıldı · ${Math.round(data.amount)} TL · ${category}`,
      data.notes?.trim() || null,
    );
    return { ok: true as const };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const role = await requireAdmin();
    const sql = await db();
    const rows = await sql<ExpenseRow>`
      select id, spent_at, amount, category, notes, created_at::text as created_at
      from expenses where id = ${data.id}
    `;
    if (role === "assistant") {
      const e = rows[0];
      return queueDelete(
        sql,
        "expenses",
        data.id,
        e ? `Gider · ${e.category} · ${e.amount} TL` : `Gider #${data.id}`,
      );
    }
    await executeQueuedDelete(sql, "expenses", data.id);
    return { ok: true as const, pending: false as const };
  });

export const loadFinance = createServerFn({ method: "GET" })
  .validator(z.object({ month: z.string().optional() }))
  .handler(async ({ data }) => {
    try {
      await requireAdmin();
    } catch {
      return { auth: false as const };
    }
    const role = getStaffRole() ?? "assistant";
    const hideTotals = role === "assistant";
    const month = /^\d{4}-\d{2}$/.test(data.month ?? "") ? data.month! : monthISO();
    const { from, to } = monthRange(month);
    const sql = await db();
    try {
    const payments = await sql<PaymentRow>`
      select p.id, p.user_id, u.full_name as client_name, p.paid_at, p.amount, p.method, p.notes,
             p.created_at::text as created_at
      from payments p
      join users u on u.id = p.user_id
      where p.paid_at >= ${from} and p.paid_at <= ${to}
      order by p.paid_at desc, p.id desc
    `;
    const expenses = await sql<ExpenseRow>`
      select id, spent_at, amount, category, notes, created_at::text as created_at
      from expenses
      where spent_at >= ${from} and spent_at <= ${to}
      order by spent_at desc, id desc
    `;
    const clients = await sql<{ id: number; full_name: string }>`
      select id, full_name from users where is_active = 1 order by full_name
    `;
    const debtors = await sql<DebtorRow>`
      select u.id, u.full_name, u.phone,
             coalesce(sum(case when d.kind = 'borc' then d.amount else -d.amount end), 0)::int as balance,
             (
               select notes from client_debts x
               where x.user_id = u.id and x.kind = 'borc'
               order by x.created_at desc, x.id desc
               limit 1
             ) as last_note
      from users u
      join client_debts d on d.user_id = u.id
      group by u.id, u.full_name, u.phone
      having coalesce(sum(case when d.kind = 'borc' then d.amount else -d.amount end), 0) > 0
      order by balance desc, u.full_name
    `;
    const byMethod: Record<string, number> = {};
    let income = 0;
    for (const p of payments) {
      income += p.amount;
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    }
    const spend = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDebt = debtors.reduce((s, d) => s + d.balance, 0);
    return {
      auth: true as const,
      role,
      hideTotals,
      month,
      from,
      to,
      payments,
      expenses,
      clients,
      debtors,
      byMethod: hideTotals ? {} : byMethod,
      income: hideTotals ? 0 : income,
      spend: hideTotals ? 0 : spend,
      net: hideTotals ? 0 : income - spend,
      totalDebt: hideTotals ? 0 : totalDebt,
      pendingPayments: await pendingDeleteIds(sql, "payments"),
      pendingExpenses: await pendingDeleteIds(sql, "expenses"),
    };
    } catch (err) {
      console.error("loadFinance", err);
      return {
        auth: true as const,
        role,
        hideTotals,
        month,
        from,
        to,
        payments: [],
        expenses: [],
        clients: [],
        debtors: [],
        byMethod: {},
        income: 0,
        spend: 0,
        net: 0,
        totalDebt: 0,
        pendingPayments: [],
        pendingExpenses: [],
      };
    }
  });

/* -------------------------------------------------------------------------- */
/* Client panel                                                                */
/* -------------------------------------------------------------------------- */

export const loadClientPanel = createServerFn({ method: "GET" }).handler(
  async () => {
    let user: ClientRow;
    try {
      user = await requireClient();
    } catch {
      return { auth: false as const };
    }
    try {
      const sql = await db();
      const today = todayISO();

    const diets = await sql<DietRow>`
      select id, user_id, title, content, is_active, is_new, created_at::text as created_at,
             pdf_name,
             case when coalesce(pdf_path, '') <> '' or coalesce(pdf_name, '') <> '' or pdf_b64 is not null then 1 else 0 end as has_pdf
      from diet_lists where user_id = ${user.id} and is_active = 1
      order by created_at desc
    `;
    const measures = await sql<MeasureRow>`
      select id, user_id, measure_date, weight, height, waist, belly, hip, chest,
             coalesce(arm_right, arm) as arm_right,
             coalesce(arm_left, arm) as arm_left,
             coalesce(leg_right, leg) as leg_right,
             coalesce(leg_left, leg) as leg_left,
             bmi, notes, created_at::text as created_at
      from measurements where user_id = ${user.id} order by measure_date asc
    `;
    const ishape = await sql<IshapeRow>`
      select id, user_id, session_date, calories, duration_min, notes, created_at::text as created_at
      from ishape_sessions where user_id = ${user.id} order by session_date desc
    `;
    const messages = await sql<MessageRow>`
      select id, user_id, sender, message, is_read, created_at::text as created_at
      from messages where user_id = ${user.id} order by created_at asc
    `;
    const appts = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments
       where user_id = $1
       order by appointment_date desc, appointment_time desc`,
      [user.id],
    );
    const requests = await sql.query<RequestRow>(
      `select id, appointment_id, user_id, request_type, preferred_date, preferred_time,
              reason, status, created_at::text as created_at
       from appointment_requests where user_id = $1 order by created_at desc`,
      [user.id],
    );
    await ensureOffplanPhotoCol(sql);
    const offplans = await sql<OffplanRow>`
      select id, user_id, slot, kind, detail, amount, note, is_read,
             photo_mime, photo_name,
             case when coalesce(photo_path, '') <> '' or (photo_b64 is not null and length(photo_b64) > 0) then 1 else 0 end as has_photo,
             created_at::text as created_at
      from offplan_logs where user_id = ${user.id} order by created_at desc
    `;

    await sql`update diet_lists set is_new = 0 where user_id = ${user.id}`;
    await sql`update users set last_panel_visit = now() where id = ${user.id}`;
    await sql`update messages set is_read = 1 where user_id = ${user.id} and sender = 'admin'`;

    const weights = measures
      .map((m) => m.weight)
      .filter((w): w is number => w !== null && w !== undefined);
    const progress = computeProgress(weights, user.target_weight);
    const nextAppt =
      appts
        .filter(
          (a) =>
            (a.status === "onaylandi" || a.status === "beklemede") &&
            isUpcomingSlot(a.appointment_date, a.appointment_time),
        )
        .sort((a, b) =>
          `${a.appointment_date.slice(0, 10)} ${clockHHMM(a.appointment_time)}`.localeCompare(
            `${b.appointment_date.slice(0, 10)} ${clockHHMM(b.appointment_time)}`,
          ),
        )[0] ?? null;

    const unreadFromAdmin = messages.filter(
      (m) => m.sender === "admin" && m.is_read === 0,
    ).length;
    const newDiets = diets.filter((d) => d.is_new === 1).length;
    const debtBalance = await debtBalanceOf(sql, user.id);

    let fasting: FastingPlan | null = null;
    try {
      const rows = await sql<FastingPlan>`
        select user_id, enabled, protocol, window_start, window_end, days, notes,
               pause_reason, pause_until::text as pause_until,
               updated_at::text as updated_at
        from fasting_plans where user_id = ${user.id} limit 1
      `;
      fasting = rows[0] ?? null;
    } catch {
      fasting = null;
    }
    if (fasting && !isFastingEnabled(fasting)) fasting = null;
    let fastingToday: FastingLog | null = null;
    let fastingLogs: FastingLog[] = [];
    try {
      fastingLogs = await sql<FastingLog>`
        select id, user_id, log_date::text as log_date, kind, reason, detail,
               energy, dizzy, end_reason, created_at::text as created_at
        from fasting_logs where user_id = ${user.id}
        order by log_date desc
        limit 90
      `;
      fastingToday = fastingLogs.find((r) => String(r.log_date).slice(0, 10) === today) ?? null;
    } catch {
      try {
        const logs = await sql<FastingLog>`
          select id, user_id, log_date::text as log_date, kind, reason, detail, created_at::text as created_at
          from fasting_logs where user_id = ${user.id} and log_date = ${today}::date
          limit 1
        `;
        fastingToday = logs[0] ?? null;
      } catch {
        fastingToday = null;
      }
    }

    let packages: ClientPackage[] = [];
    try {
      packages = await sql<ClientPackage>`
        select id, user_id, kind, title, total, next_no, unit, notes, is_active,
               created_at::text as created_at
        from client_packages where user_id = ${user.id} and is_active = 1
        order by created_at desc
      `;
    } catch {
      packages = [];
    }

    let labs: LabRow[] = [];
    try {
      await ensureLabTable(sql);
      labs = await sql<LabRow>`
        select id, user_id, title, note, staff_note, kind, file_name, mime, is_read,
               created_at::text as created_at
        from lab_uploads where user_id = ${user.id}
        order by created_at desc
      `;
    } catch {
      labs = [];
    }

    let dailyToday: DailyLog | null = null;
    let labValues: LabValue[] = [];
    let mindfulToday: MindfulMeal[] = [];
    let weekHabits: WeekHabits = emptyWeekHabits();
    const lastWeight = [...measures].reverse().find((m) => m.weight != null)?.weight ?? null;
    try {
      await ensureWellnessTables(sql);
      const drows = await sql<DailyLog>`
        select id, user_id, log_date::text as log_date, water_ml, sweaty, low_carb,
               hunger_before, hunger_after, eat_trigger, sleep_hours, stress,
               mood, energy, created_at::text as created_at
        from daily_logs where user_id = ${user.id} and log_date = ${today}::date
        limit 1
      `;
      dailyToday = drows[0] ?? null;
      labValues = await sql<LabValue>`
        select id, user_id, taken_at::text as taken_at, marker, value, unit, notes,
               ref_min, ref_max, created_at::text as created_at
        from lab_values where user_id = ${user.id}
        order by taken_at desc, id desc
        limit 20
      `;
      mindfulToday = await sql<MindfulMeal>`
        select id, user_id, log_date::text as log_date, slot, hunger_before, hunger_after,
               eat_trigger, created_at::text as created_at
        from mindful_meals where user_id = ${user.id} and log_date = ${today}::date
        order by id asc
      `;
      const weekStart = addDaysISO(today, -6);
      const weekLogs = await sql<{ log_date: string; water_ml: number }>`
        select log_date::text as log_date, water_ml
        from daily_logs
        where user_id = ${user.id} and log_date >= ${weekStart}::date
      `;
      const target = waterTargetMl(lastWeight);
      const mealRows = await sql<{ n: number }>`
        select count(*)::int as n from mindful_meals
        where user_id = ${user.id} and log_date >= ${weekStart}::date
      `;
      const offRows = await sql<{ n: number }>`
        select count(*)::int as n from offplan_logs
        where user_id = ${user.id}
          and created_at >= ${weekStart}::date
          and coalesce(detail, '') not like 'Zorlandım:%'
      `;
      const activity = await sql<{ n: number }>`
        select count(distinct day)::int as n from (
          select log_date::text as day from daily_logs
            where user_id = ${user.id} and log_date >= ${weekStart}::date
          union
          select log_date::text from mindful_meals
            where user_id = ${user.id} and log_date >= ${weekStart}::date
          union
          select created_at::date::text from offplan_logs
            where user_id = ${user.id} and created_at >= ${weekStart}::date
        ) t
      `;
      weekHabits = {
        waterGoalDays: weekLogs.filter((r) => Number(r.water_ml) >= target).length,
        meals: Number(mealRows[0]?.n ?? 0) + Number(offRows[0]?.n ?? 0),
        activeDays: Number(activity[0]?.n ?? 0),
        streak: 0,
      };
      const streakRows = await sql<{ d: string }>`
        select distinct d from (
          select log_date::text as d from daily_logs where user_id = ${user.id}
          union
          select log_date::text from mindful_meals where user_id = ${user.id}
          union
          select created_at::date::text from offplan_logs where user_id = ${user.id}
        ) x
        order by d desc
        limit 40
      `;
      const dates = new Set(streakRows.map((r) => String(r.d).slice(0, 10)));
      let streak = 0;
      for (let i = 0; i < 21; i += 1) {
        const day = addDaysISO(today, -i);
        if (dates.has(day)) streak += 1;
        else break;
      }
      weekHabits.streak = streak;
    } catch {
      dailyToday = null;
      labValues = [];
      mindfulToday = [];
      weekHabits = emptyWeekHabits();
    }

    return {
      auth: true as const,
      user,
      diets,
      measures: [...measures].reverse(),
      measuresChrono: measures,
      ishape,
      messages,
      appts,
      requests,
      offplans,
      progress,
      nextAppt,
      unreadFromAdmin,
      newDiets,
      today,
      debtBalance,
      fasting,
      fastingToday,
      fastingLogs,
      packages,
      labs,
      dailyToday,
      waterTarget: waterTargetMl(lastWeight),
      labValues,
      mindfulToday,
      weekHabits,
    };
    } catch (err) {
      console.error("loadClientPanel", err);
      return {
        auth: true as const,
        user,
        diets: [],
        measures: [],
        measuresChrono: [],
        ishape: [],
        messages: [],
        appts: [],
        requests: [],
        offplans: [],
        progress: computeProgress([], user.target_weight),
        nextAppt: null,
        unreadFromAdmin: 0,
        newDiets: 0,
        today: todayISO(),
        debtBalance: 0,
        fasting: null,
        fastingToday: null,
        fastingLogs: [],
        packages: [],
        labs: [],
        dailyToday: null,
        waterTarget: 2000,
        labValues: [],
        mindfulToday: [],
        weekHabits: emptyWeekHabits(),
      };
    }
  },
);

export const clientSendMessage = createServerFn({ method: "POST" })
  .validator(z.object({ message: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const text = data.message.trim();
    if (!text) return { ok: false as const };
    const sql = await db();
    await sql`
      insert into messages (user_id, sender, message, is_read)
      values (${user.id}, 'client', ${text}, 0)
    `;
    await addNotification(sql, {
      userId: user.id,
      kind: "message",
      title: `${user.full_name} mesaj yazdı`,
      body: text.slice(0, 240),
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const submitFeedback = createServerFn({ method: "POST" })
  .validator(z.object({ message: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const text = data.message.trim();
    if (text.length < 8) {
      return { ok: false as const, error: "Biraz daha ayrıntı yazabilir misiniz?" };
    }
    if (text.length > 2000) {
      return { ok: false as const, error: "En fazla 2000 karakter yazabilirsiniz." };
    }
    const sql = await db();
    try {
      await sql.query(`create table if not exists client_feedback (
        id serial primary key,
        user_id integer not null references users (id) on delete cascade,
        message text not null,
        is_read integer not null default 0,
        created_at timestamptz not null default now()
      )`);
    } catch {
      /* already exists */
    }
    await sql`
      insert into client_feedback (user_id, message, is_read)
      values (${user.id}, ${text}, 0)
    `;
    await addNotification(sql, {
      userId: user.id,
      kind: "feedback",
      title: `${user.full_name} görüş ve öneri gönderdi`,
      body: text.slice(0, 240),
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const loadFeedbackList = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdmin();
  } catch {
    return { auth: false as const };
  }
  const sql = await db();
  const rows = await sql<FeedbackRow>`
    select f.id, f.user_id, f.message, f.is_read, f.created_at::text as created_at,
           u.full_name as client_name, u.phone as client_phone
    from client_feedback f
    join users u on u.id = f.user_id
    order by f.created_at desc
  `;
  await sql`update client_feedback set is_read = 1 where is_read = 0`;
  return { auth: true as const, rows };
});

export const deleteFeedback = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    await sql`delete from client_feedback where id = ${data.id}`;
    return { ok: true as const };
  });

export const clientLogFasting = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kind: z.enum(["broke", "opened", "undo"]),
      reason: z.string().optional(),
      detail: z.string().optional(),
      energy: z.number().int().min(1).max(5).optional(),
      dizzy: z.boolean().optional(),
      endReason: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    try {
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
    } catch {
      /* exists */
    }
    const day = todayISO();
    if (data.kind === "undo") {
      await sql`delete from fasting_logs where user_id = ${user.id} and log_date = ${day}::date`;
      return { ok: true as const };
    }
    const reason = data.reason?.trim() || null;
    const detail = data.detail?.trim().slice(0, 400) || null;
    const energy = data.energy ?? null;
    const dizzy = data.dizzy == null ? null : data.dizzy ? 1 : 0;
    const endReason = data.endReason?.trim() || null;
    await sql`
      insert into fasting_logs (user_id, log_date, kind, reason, detail, energy, dizzy, end_reason)
      values (${user.id}, ${day}::date, ${data.kind}, ${reason}, ${detail}, ${energy}, ${dizzy}, ${endReason})
      on conflict (user_id, log_date) do update set
        kind = excluded.kind,
        reason = excluded.reason,
        detail = excluded.detail,
        energy = excluded.energy,
        dizzy = excluded.dizzy,
        end_reason = excluded.end_reason,
        created_at = now()
    `;
    let early = false;
    try {
      const plans = await sql<FastingPlan>`
        select user_id, enabled, protocol, window_start, window_end, days, notes
        from fasting_plans where user_id = ${user.id} limit 1
      `;
      const view = plans[0] ? buildFastingView(plans[0], nowTimeIstanbul(), undefined, null) : null;
      early = data.kind === "broke" && !!view && !view.inWindow && view.minutesUntilWindow >= 120;
    } catch {
      early = false;
    }
    await addNotification(sql, {
      userId: user.id,
      kind: "fasting",
      title: early
        ? `${user.full_name} orucu 2 saatten fazla erken bozdu`
        : data.kind === "broke"
          ? `${user.full_name} orucu bozdu`
          : `${user.full_name} yeme penceresini açtı`,
      body: [
        nowTimeIstanbul(),
        reason ? breakLabel(reason) : null,
        detail,
        energy ? `enerji ${energy}/5` : null,
        dizzy === 1 ? "baş dönmesi var" : null,
        endReason ? endReasonLabel(endReason) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const clientUpdateProfile = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    await sql`update users set email = ${data.email?.trim() || null} where id = ${user.id}`;
    await addNotification(sql, {
      userId: user.id,
      kind: "profile",
      title: `${user.full_name} profilini güncelledi`,
      body: data.email?.trim() ? `E-posta: ${data.email.trim()}` : "E-posta kaldırıldı.",
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const saveClientTheme = createServerFn({ method: "POST" })
  .validator(z.object({ theme: z.enum(["dogal", "dinamik", "renkli", "sade"]) }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    const theme = normalizePanelTheme(data.theme);
    await sql.query("alter table users add column if not exists panel_theme text");
    await sql`update users set panel_theme = ${theme} where id = ${user.id}`;
    return { ok: true as const, theme };
  });

export const markClientMessagesRead = createServerFn({ method: "POST" }).handler(async () => {
  const user = await requireClient();
  const sql = await db();
  await sql`update messages set is_read = 1 where user_id = ${user.id} and sender = 'admin'`;
  return { ok: true as const };
});

export const clientChangePassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      current: z.string(),
      next: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    if (!data.next || data.next.length < 4) {
      return { ok: false as const, error: "Yeni şifre en az 4 karakter olmalı." };
    }
    const sql = await db();
    const rows = await sql<{ password: string }>`select password from users where id = ${user.id}`;
    if (!rows[0] || rows[0].password !== hashPassword(data.current)) {
      return { ok: false as const, error: "Mevcut şifre hatalı." };
    }
    await sql`update users set password = ${hashPassword(data.next)} where id = ${user.id}`;
    await addNotification(sql, {
      userId: user.id,
      kind: "password",
      title: `${user.full_name} şifresini değiştirdi`,
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const adminCreateAppointments = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      serviceKey: z.string(),
      date: z.string(),
      time: z.string(),
      weeks: z.number().int().min(1).max(9),
      notes: z.string().optional(),
      isMeasure: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const service = getService(data.serviceKey);
    if (!service) return { ok: false as const, error: "Geçersiz hizmet." };
    if (!data.date) return { ok: false as const, error: "Tarih seçin." };
    if (!data.time) return { ok: false as const, error: "Saat seçin." };
    const sql = await db();
    const user = await findClientById(sql, data.userId);
    if (!user) return { ok: false as const, error: "Danışan bulunamadı." };
    const dates = weeklyDates(data.date, data.weeks);
    const notes = data.notes?.trim() || null;
    const isMeasure = data.isMeasure ? 1 : 0;
    try {
      await sql.query(
        "alter table appointments add column if not exists is_measure integer not null default 0",
      );
    } catch {
      /* exists */
    }
    for (const date of dates) {
      await sql`
        insert into appointments (
          user_id, service_key, service_name, duration, price,
          client_name, client_phone, client_email,
          appointment_date, appointment_time, notes, status, is_measure
        ) values (
          ${user.id}, ${service.key}, ${service.name}, ${service.duration}, ${service.price},
          ${user.full_name}, ${user.phone}, ${user.email},
          ${date}, ${data.time}, ${notes}, 'onaylandi', ${isMeasure}
        )
      `;
    }
    await logAssistant(
      sql,
      "create",
      `${user.full_name} için ${dates.length} randevu eklendi`,
      `${service.name} · ${data.time}`,
      clientHref(user.id),
    );
    return { ok: true as const, count: dates.length, dates };
  });

export const clientCreateAppointment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      serviceKey: z.string(),
      date: z.string(),
      time: z.string(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    const service = getService(data.serviceKey);
    if (!service) return { ok: false as const, error: "Geçersiz hizmet." };
    if (!data.date || data.date < todayISO()) {
      return { ok: false as const, error: "Geçmiş bir tarih seçilemez." };
    }
    const sql = await db();
    await sql`
      insert into appointments (
        user_id, service_key, service_name, duration, price,
        client_name, client_phone, client_email,
        appointment_date, appointment_time, notes, status
      ) values (
        ${user.id}, ${service.key}, ${service.name}, ${service.duration}, ${service.price},
        ${user.full_name}, ${user.phone}, ${user.email},
        ${data.date}, ${data.time}, ${data.notes?.trim() || null}, 'beklemede'
      )
    `;
    await addNotification(sql, {
      userId: user.id,
      kind: "booking",
      title: `${user.full_name} randevu talebi bıraktı`,
      body: `${formatDateTr(data.date)} ${data.time} · ${service.name}`,
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const clientRequestChange = createServerFn({ method: "POST" })
  .validator(
    z.object({
      appointmentId: z.number(),
      requestType: z.enum(["ertele", "iptal"]),
      preferredDate: z.string().optional(),
      preferredTime: z.string().optional(),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    const appts = await sql.query<{ id: number }>(
      `select id from appointments where id = $1 and user_id = $2`,
      [data.appointmentId, user.id],
    );
    if (!appts[0]) return { ok: false as const, error: "Randevu bulunamadı." };
    await sql`
      insert into appointment_requests (
        appointment_id, user_id, request_type, preferred_date, preferred_time, reason, status
      ) values (
        ${data.appointmentId}, ${user.id}, ${data.requestType},
        ${data.preferredDate || null}, ${data.preferredTime || null},
        ${data.reason?.trim() || null}, 'beklemede'
      )
    `;
    await addNotification(sql, {
      userId: user.id,
      kind: "request",
      title:
        data.requestType === "iptal"
          ? `${user.full_name} randevu iptali istedi`
          : `${user.full_name} randevu erteleme istedi`,
      body: [
        data.preferredDate
          ? `Tercih: ${formatDateTr(data.preferredDate)} ${data.preferredTime ?? ""}`.trim()
          : null,
        data.reason?.trim() || null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const clientCancelAppointment = createServerFn({ method: "POST" })
  .validator(z.object({ appointmentId: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    const rows = await sql.query<AppointmentRow>(
      `select ${appointmentSelect} from appointments where id = $1 and user_id = $2`,
      [data.appointmentId, user.id],
    );
    const appt = rows[0];
    if (!appt) return { ok: false as const, error: "Randevu bulunamadı." };
    if (appt.status === "iptal" || appt.status === "tamamlandi" || appt.status === "gelmedi") {
      return { ok: false as const, error: "Bu randevu zaten kapandı." };
    }
    const sameDay = appt.appointment_date.slice(0, 10) === todayISO();
    const note = "Danışan gelemeyeceğini bildirdi.";
    const merged = [appt.admin_notes, note].filter(Boolean).join(" ");
    await sql`
      update appointments
      set status = 'iptal',
          admin_notes = ${merged},
          cancelled_at = now(),
          cancelled_by = 'client'
      where id = ${appt.id}
    `;
    await revertPackageTicksForAppointment(sql, appt.id);
    const notice = clientCancelWhatsApp({
      date: appt.appointment_date,
      time: appt.appointment_time,
      service: appt.service_name,
    });
    await sql`
      insert into messages (user_id, sender, message, is_read)
      values (
        ${user.id},
        'client',
        ${`${formatDateTr(appt.appointment_date)} ${weekdayTr(appt.appointment_date)} ${appt.appointment_time} ${appt.service_name} randevusuna gelemeyeceğini bildirdi.`},
        0
      )
    `;
    await addNotification(sql, {
      userId: user.id,
      kind: "cancel",
      title: `${user.full_name} randevuyu iptal etti`,
      body: `${formatDateTr(appt.appointment_date)} ${appt.appointment_time} · ${appt.service_name}`,
      href: clientHref(user.id),
    });
    return {
      ok: true as const,
      sameDay,
      whatsapp: whatsappLink(CLINIC.phoneRaw, notice),
    };
  });

export const saveOffplan = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slot: z.enum(["sabah", "ogle", "aksam", "gece", "ara"]),
      kind: z.enum(["extra", "missing"]),
      detail: z.string().optional(),
      amount: z.string().optional(),
      note: z.string().optional(),
      photoB64: z.string().optional(),
      photoMime: z.string().optional(),
      photoName: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    const detail = data.detail?.trim() || "";
    const photoB64 = data.photoB64?.trim() || null;
    if (!detail && !photoB64) {
      return {
        ok: false as const,
        error: "Kısa bir not yazın veya fotoğraf ekleyin.",
      };
    }
    let photoPath: string | null = null;
    let mime = data.photoMime?.trim() || "image/jpeg";
    let photoName: string | null = null;
    if (photoB64) {
      let buf: Buffer;
      try {
        buf = Buffer.from(photoB64, "base64");
      } catch {
        return { ok: false as const, error: "Fotoğraf okunamadı." };
      }
      if (buf.length > MAX_UPLOAD_BYTES) {
        return { ok: false as const, error: "Fotoğraf en fazla 32 MB olmalı." };
      }
      const kind = detectLabFile(buf, data.photoName || "yemek.jpg", mime);
      if (!kind || kind.kind !== "image") {
        return { ok: false as const, error: "Yalnızca JPG, PNG veya WEBP yükleyin." };
      }
      mime = kind.mime;
      photoName = data.photoName?.trim() || "yemek.jpg";
      try {
        photoPath = await persistOffplanPhoto(buf, photoName);
      } catch {
        /* disk yoksa b64 yedek */
      }
    }
    const sql = await db();
    await ensureOffplanPhotoCol(sql);
    await sql`
      insert into offplan_logs (
        user_id, slot, kind, detail, amount, note, photo_b64, photo_mime, photo_name, photo_path, is_read
      )
      values (
        ${user.id},
        ${data.slot},
        ${data.kind},
        ${detail || ""},
        ${data.kind === "extra" ? data.amount?.trim() || null : null},
        ${data.note?.trim() || null},
        ${photoPath ? null : photoB64},
        ${photoB64 ? mime : null},
        ${photoB64 ? photoName : null},
        ${photoPath},
        0
      )
    `;
    const bits = [
      mealSlotLabel(data.slot),
      offplanKindLabel(data.kind),
      detail || null,
      photoB64 ? "Fotoğraf eklendi" : null,
    ].filter(Boolean);
    try {
      const plans = await sql<FastingPlan>`
        select user_id, enabled, protocol, window_start, window_end, days, notes
        from fasting_plans where user_id = ${user.id} limit 1
      `;
      const plan = plans[0];
      if (plan && isFastingEnabled(plan)) {
        bits.push(
          isInEatingWindow(nowTimeIstanbul(), plan.window_start, plan.window_end)
            ? "pencere içi"
            : "pencere dışı",
        );
      }
    } catch {
      /* ignore */
    }
    await addNotification(sql, {
      userId: user.id,
      kind: "offplan",
      title: `${user.full_name} plan dışı öğün kaydetti`,
      body: bits.join(" · "),
      href: clientHref(user.id),
    });
    return { ok: true as const };
  });

export const deleteOffplan = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await db();
    const role = getStaffRole();
    if (role) {
      await sql`delete from offplan_logs where id = ${data.id}`;
      await logAssistant(sql, "delete", "Plan dışı öğün kaydı sildi");
      return { ok: true as const };
    }
    const user = await requireClient();
    const rows = await sql<{ id: number }>`
      delete from offplan_logs where id = ${data.id} and user_id = ${user.id}
      returning id
    `;
    if (!rows[0]) return { ok: false as const, error: "Kayıt bulunamadı." };
    return { ok: true as const };
  });

export const getOffplanPhoto = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await db();
    await ensureOffplanPhotoCol(sql);
    const staff = getStaffRole();
    const rows = await sql<{
      user_id: number;
      photo_path: string | null;
      photo_b64: string | null;
      photo_mime: string | null;
      photo_name: string | null;
    }>`
      select user_id, photo_path, photo_b64, photo_mime, photo_name
      from offplan_logs where id = ${data.id} limit 1
    `;
    const row = rows[0];
    if (!row) return { ok: false as const };
    if (!staff) {
      const user = await requireClient();
      if (row.user_id !== user.id) return { ok: false as const };
    }
    const b64 = await readOffplanB64(row.photo_path, row.photo_b64);
    if (!b64) return { ok: false as const };
    return {
      ok: true as const,
      filename: row.photo_name || "yemek.jpg",
      mime: row.photo_mime || "image/jpeg",
      b64,
    };
  });

export const loadAdminNotifications = createServerFn({ method: "GET" })
  .validator(z.object({ all: z.boolean().optional() }))
  .handler(async ({ data }) => {
    try {
      await requireAdmin();
    } catch {
      return { auth: false as const };
    }
    const sql = await db();
    const hideBriefing = getStaffRole() === "assistant";
    const items = data.all
      ? await sql.query<AdminNotif>(
          `select n.id, n.user_id, n.kind, n.title, n.body, n.href, n.is_read,
                  n.created_at::text as created_at, u.full_name as client_name
           from admin_notifications n
           left join users u on u.id = n.user_id
           ${hideBriefing ? "where n.kind not in ('briefing','assistant')" : ""}
           order by n.created_at desc
           limit 80`,
        )
      : await sql.query<AdminNotif>(
          `select n.id, n.user_id, n.kind, n.title, n.body, n.href, n.is_read,
                  n.created_at::text as created_at, u.full_name as client_name
           from admin_notifications n
           left join users u on u.id = n.user_id
           where n.is_read = 0
             ${hideBriefing ? "and n.kind not in ('briefing','assistant')" : ""}
           order by n.created_at desc
           limit 80`,
        );
    const countRows = await sql.query<{ n: number }>(
      `select count(*)::int as n from admin_notifications where is_read = 0${hideBriefing ? " and kind not in ('briefing','assistant')" : ""}`,
    );
    return { auth: true as const, items, unread: countRows[0]?.n ?? 0 };
  });

export const getUnreadNotifCount = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdmin();
  } catch {
    return { auth: false as const, count: 0 };
  }
  const sql = await db();
  try {
    await tickAppointmentReminders(sql);
  } catch {
    /* ignore */
  }
  try {
    const rows = await sql.query<{ n: number }>(
      `select count(*)::int as n from admin_notifications where is_read = 0${getStaffRole() === "assistant" ? " and kind not in ('briefing','assistant')" : ""}`,
    );
    return { auth: true as const, count: rows[0]?.n ?? 0 };
  } catch {
    return { auth: true as const, count: 0 };
  }
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    await sql`update admin_notifications set is_read = 1 where id = ${data.id}`;
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  await requireAdmin();
  const sql = await db();
  if (getStaffRole() === "assistant") {
    await sql`update admin_notifications set is_read = 1
      where is_read = 0 and kind not in ('briefing','assistant')`;
  } else {
    await sql`update admin_notifications set is_read = 1 where is_read = 0`;
  }
  return { ok: true as const };
});

export const loadDietPdf = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    const rows = await sql<DietRow>`
      select id, user_id, title, content, is_active, is_new, created_at::text as created_at
      from diet_lists where id = ${data.id} and user_id = ${user.id} limit 1
    `;
    const diet = rows[0];
    if (!diet) return { ok: false as const };
    return {
      ok: true as const,
      diet,
      clientName: user.full_name,
    };
  });

export const getDietText = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await db();
    let row:
      | {
          content: string;
          pdf_b64: string | null;
          pdf_path: string | null;
        }
      | undefined;
    if (getStaffRole()) {
      const rows = await sql<{
        content: string;
        pdf_b64: string | null;
        pdf_path: string | null;
      }>`
        select content, pdf_b64, pdf_path from diet_lists where id = ${data.id} limit 1
      `;
      row = rows[0];
    } else {
      const user = await requireClient();
      const rows = await sql<{
        content: string;
        pdf_b64: string | null;
        pdf_path: string | null;
      }>`
        select content, pdf_b64, pdf_path from diet_lists
        where id = ${data.id} and user_id = ${user.id} limit 1
      `;
      row = rows[0];
    }
    if (!row) return { ok: false as const };
    if (row.content?.trim()) return { ok: true as const, text: row.content };
    const b64 = await readDietPdfB64(row.pdf_path, row.pdf_b64);
    if (!b64) return { ok: false as const };
    const text = await extractPdfText(Buffer.from(b64, "base64"));
    if (!text) return { ok: false as const };
    await sql`update diet_lists set content = ${text} where id = ${data.id}`;
    return { ok: true as const, text };
  });

export const getDietPdfFile = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await db();
    let row:
      | { title: string; pdf_name: string | null; pdf_b64: string | null; pdf_path: string | null }
      | undefined;
    if (getStaffRole()) {
      const rows = await sql<{ title: string; pdf_name: string | null; pdf_b64: string | null; pdf_path: string | null }>`
        select title, pdf_name, pdf_b64, pdf_path from diet_lists where id = ${data.id} limit 1
      `;
      row = rows[0];
    } else {
      const user = await requireClient();
      const rows = await sql<{ title: string; pdf_name: string | null; pdf_b64: string | null; pdf_path: string | null }>`
        select title, pdf_name, pdf_b64, pdf_path from diet_lists
        where id = ${data.id} and user_id = ${user.id} limit 1
      `;
      row = rows[0];
    }
    const b64 = await readDietPdfB64(row?.pdf_path ?? null, row?.pdf_b64 ?? null);
    if (!b64) return { ok: false as const };
    return {
      ok: true as const,
      filename: row?.pdf_name || `${row?.title ?? "diyet"}.pdf`,
      mime: "application/pdf" as const,
      b64,
    };
  });

export const uploadLab = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Form verisi bekleniyor.");
    return {
      title: String(input.get("title") || ""),
      note: String(input.get("note") || ""),
      file: input.get("file"),
    };
  })
  .handler(async ({ data }) => {
    const user = await requireClient();
    const file = data.file;
    if (!(file instanceof Blob) || file.size <= 0) {
      return { ok: false as const, error: "PDF veya fotoğraf seçin." };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false as const, error: "Dosya en fazla 32 MB olmalı." };
    }
    const name = file instanceof File && file.name ? file.name : "tahlil";
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = detectLabFile(buf, name, file.type || "");
    if (!kind) {
      return { ok: false as const, error: "Yalnızca PDF, JPG, PNG veya WEBP yükleyin." };
    }
    const title = data.title.trim() || `Kan tahlili · ${formatDateTr(todayISO())}`;
    const note = data.note.trim() || null;
    let filePath: string | null = null;
    let fileB64: string | null = null;
    try {
      filePath = await persistLabFile(buf, name);
    } catch {
      fileB64 = buf.toString("base64");
    }
    const sql = await db();
    await ensureLabTable(sql);
    await sql`
      insert into lab_uploads (user_id, title, note, kind, file_name, mime, file_path, file_b64, is_read)
      values (
        ${user.id}, ${title}, ${note}, ${kind.kind}, ${name}, ${kind.mime},
        ${filePath}, ${fileB64}, 0
      )
    `;
    await addNotification(sql, {
      userId: user.id,
      kind: "lab",
      title: `${user.full_name} tahlil dosyası yükledi`,
      body: `${title} · ${kind.kind === "pdf" ? "PDF" : "fotoğraf"} · değerleri siz girin`,
      href: "/admin/tahliller",
    });
    return { ok: true as const };
  });

export const deleteLab = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await db();
    await ensureLabTable(sql);
    const staff = getStaffRole();
    const rows = await sql<{
      user_id: number;
      title: string;
      file_path: string | null;
    }>`
      select user_id, title, file_path from lab_uploads where id = ${data.id} limit 1
    `;
    const row = rows[0];
    if (!row) return { ok: false as const, error: "Kayıt yok." };
    if (!staff) {
      const user = await requireClient();
      if (row.user_id !== user.id) return { ok: false as const, error: "Bu dosya size ait değil." };
    }
    await sql`delete from lab_uploads where id = ${data.id}`;
    await removeLabFile(row.file_path);
    if (staff) {
      await logAssistant(sql, "delete", `Tahlil sildi: ${row.title}`, null, clientHref(row.user_id));
    }
    return { ok: true as const };
  });

export const getLabFile = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const sql = await db();
    await ensureLabTable(sql);
    const staff = getStaffRole();
    const rows = await sql<{
      user_id: number;
      title: string;
      file_name: string | null;
      mime: string | null;
      file_path: string | null;
      file_b64: string | null;
      kind: string;
    }>`
      select user_id, title, file_name, mime, file_path, file_b64, kind
      from lab_uploads where id = ${data.id} limit 1
    `;
    const row = rows[0];
    if (!row) return { ok: false as const };
    if (!staff) {
      const user = await requireClient();
      if (row.user_id !== user.id) return { ok: false as const };
    }
    const b64 = await readLabB64(row.file_path, row.file_b64);
    if (!b64) return { ok: false as const };
    return {
      ok: true as const,
      filename: row.file_name || `${row.title}.${row.kind === "pdf" ? "pdf" : "jpg"}`,
      mime: row.mime || (row.kind === "pdf" ? "application/pdf" : "image/jpeg"),
      b64,
      kind: row.kind,
    };
  });

export const saveLabStaffNote = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number(), note: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    await ensureLabTable(sql);
    await sql`update lab_uploads set staff_note = ${data.note.trim() || null} where id = ${data.id}`;
    return { ok: true as const };
  });

export const loadLabReport = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdmin();
  } catch {
    return { auth: false as const };
  }
  const sql = await db();
  await ensureLabTable(sql);
  await ensureWellnessTables(sql);
  try {
  const month = monthISO();
  const today = todayISO();
  const stats = await sql.query<{
    total: number;
    unread: number;
    month_n: number;
    clients: number;
    pdf_n: number;
    image_n: number;
  }>(
    `select
      count(*)::int as total,
      coalesce(sum(case when is_read = 0 then 1 else 0 end), 0)::int as unread,
      coalesce(sum(case when created_at >= $1::date then 1 else 0 end), 0)::int as month_n,
      count(distinct user_id)::int as clients,
      coalesce(sum(case when kind = 'pdf' then 1 else 0 end), 0)::int as pdf_n,
      coalesce(sum(case when kind = 'image' then 1 else 0 end), 0)::int as image_n
     from lab_uploads`,
    [`${month}-01`],
  );
  const rows = await sql<LabRow>`
    select l.id, l.user_id, l.title, l.note, l.staff_note, l.kind, l.file_name, l.mime, l.is_read,
           l.created_at::text as created_at, u.full_name as client_name
    from lab_uploads l
    join users u on u.id = l.user_id
    order by l.created_at desc
    limit 200
  `;
  const weekStart = addDaysISO(today, -6);
  const todayLogs = await sql.query<{
    id: number;
    full_name: string;
    water_ml: number;
    sleep_hours: number | null;
    stress: number | null;
    sweaty: number;
    weight: number | null;
  }>(
    `select u.id, u.full_name, d.water_ml, d.sleep_hours, d.stress, d.sweaty,
            (select m.weight from measurements m
             where m.user_id = u.id and m.weight is not null
             order by m.measure_date desc, m.id desc limit 1) as weight
     from daily_logs d
     join users u on u.id = d.user_id
     where d.log_date = $1::date
     order by u.full_name`,
    [today],
  );
  const skipped = await sql.query<{ id: number; full_name: string }>(
    `select u.id, u.full_name
     from users u
     where u.is_active = 1
       and exists (
         select 1 from daily_logs d
         where d.user_id = u.id and d.log_date >= $1::date and d.log_date < $2::date
       )
       and not exists (
         select 1 from daily_logs d2 where d2.user_id = u.id and d2.log_date = $2::date
       )
     order by u.full_name
     limit 40`,
    [weekStart, today],
  );
  const emotionalWeek = await sql.query<{
    id: number;
    full_name: string;
    n: number;
    last_trigger: string | null;
  }>(
    `select u.id, u.full_name, count(*)::int as n,
            max(m.eat_trigger) as last_trigger
     from mindful_meals m
     join users u on u.id = m.user_id
     where m.log_date >= $1::date
       and m.eat_trigger in ('stres','sikinti','odul')
     group by u.id, u.full_name
     order by n desc, u.full_name
     limit 30`,
    [weekStart],
  );
  const labValues = await sql<LabValue>`
    select v.id, v.user_id, v.taken_at::text as taken_at, v.marker, v.value, v.unit, v.notes,
           v.ref_min, v.ref_max, v.created_at::text as created_at, u.full_name as client_name
    from lab_values v
    join users u on u.id = v.user_id
    order by v.taken_at desc, v.id desc
    limit 80
  `;
  await sql`update lab_uploads set is_read = 1 where is_read = 0`;
  return {
    auth: true as const,
    stats: stats[0] ?? { total: 0, unread: 0, month_n: 0, clients: 0, pdf_n: 0, image_n: 0 },
    todayLogs,
    skipped,
    emotionalWeek,
    labValues,
    rows,
  };
  } catch (err) {
    console.error("loadLabReport", err);
    return {
      auth: true as const,
      stats: { total: 0, unread: 0, month_n: 0, clients: 0, pdf_n: 0, image_n: 0 },
      todayLogs: [],
      skipped: [],
      emotionalWeek: [],
      labValues: [],
      rows: [],
    };
  }
});

export const saveDailyLog = createServerFn({ method: "POST" })
  .validator(
    z.object({
      waterMl: z.number().int().min(0).max(8000).optional(),
      addWaterMl: z.number().int().min(1).max(1000).optional(),
      sweaty: z.boolean().optional(),
      lowCarb: z.boolean().optional(),
      hungerBefore: z.number().int().min(1).max(10).optional(),
      hungerAfter: z.number().int().min(1).max(10).optional(),
      eatTrigger: z.string().optional(),
      sleepHours: z.number().min(0).max(16).optional(),
      stress: z.number().int().min(1).max(5).optional(),
      mood: z.enum(["iyi", "normal", "yorgun", "zorlaniyorum"]).optional(),
      energy: z.number().int().min(1).max(5).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    await ensureWellnessTables(sql);
    const day = todayISO();
    const existing = await sql<DailyLog>`
      select id, user_id, log_date::text as log_date, water_ml, sweaty, low_carb,
             hunger_before, hunger_after, eat_trigger, sleep_hours, stress,
             mood, energy, created_at::text as created_at
      from daily_logs where user_id = ${user.id} and log_date = ${day}::date
      limit 1
    `;
    const prev = existing[0];
    let water = prev?.water_ml ?? 0;
    if (data.addWaterMl) water = Math.min(8000, water + data.addWaterMl);
    else if (data.waterMl != null) water = data.waterMl;
    const sweaty = data.sweaty != null ? (data.sweaty ? 1 : 0) : (prev?.sweaty ?? 0);
    const lowCarb = data.lowCarb != null ? (data.lowCarb ? 1 : 0) : (prev?.low_carb ?? 0);
    const hungerBefore = data.hungerBefore ?? prev?.hunger_before ?? null;
    const hungerAfter = data.hungerAfter ?? prev?.hunger_after ?? null;
    const eatTrigger = data.eatTrigger !== undefined ? (data.eatTrigger.trim() || null) : (prev?.eat_trigger ?? null);
    const sleepHours = data.sleepHours !== undefined ? data.sleepHours : (prev?.sleep_hours ?? null);
    const stress = data.stress !== undefined ? data.stress : (prev?.stress ?? null);
    const mood = data.mood !== undefined ? data.mood : (prev?.mood ?? null);
    const energy = data.energy !== undefined ? data.energy : (prev?.energy ?? null);
    await sql`
      insert into daily_logs (
        user_id, log_date, water_ml, sweaty, low_carb,
        hunger_before, hunger_after, eat_trigger, sleep_hours, stress, mood, energy
      ) values (
        ${user.id}, ${day}::date, ${water},
        ${sweaty}, ${lowCarb},
        ${hungerBefore}, ${hungerAfter},
        ${eatTrigger},
        ${sleepHours}, ${stress}, ${mood}, ${energy}
      )
      on conflict (user_id, log_date) do update set
        water_ml = excluded.water_ml,
        sweaty = excluded.sweaty,
        low_carb = excluded.low_carb,
        hunger_before = excluded.hunger_before,
        hunger_after = excluded.hunger_after,
        eat_trigger = excluded.eat_trigger,
        sleep_hours = excluded.sleep_hours,
        stress = excluded.stress,
        mood = excluded.mood,
        energy = excluded.energy
    `;
    return { ok: true as const, waterMl: water };
  });

export const saveMindfulMeal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      slot: z.enum(["sabah", "ogle", "aksam", "ara"]),
      hungerBefore: z.number().int().min(1).max(10),
      hungerAfter: z.number().int().min(1).max(10).optional(),
      eatTrigger: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    await ensureWellnessTables(sql);
    await sql`
      insert into mindful_meals (user_id, log_date, slot, hunger_before, hunger_after, eat_trigger)
      values (
        ${user.id}, ${todayISO()}::date, ${data.slot}, ${data.hungerBefore},
        ${data.hungerAfter ?? null}, ${data.eatTrigger?.trim() || null}
      )
    `;
    return { ok: true as const };
  });

export const deleteMindfulMeal = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const user = await requireClient();
    const sql = await db();
    await sql`delete from mindful_meals where id = ${data.id} and user_id = ${user.id}`;
    return { ok: true as const };
  });

export const saveLabValue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number().optional(),
      takenAt: z.string(),
      marker: z.string(),
      value: z.number(),
      notes: z.string().optional(),
      refMin: z.number().optional(),
      refMax: z.number().optional(),
      customLabel: z.string().optional(),
      customUnit: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (!data.takenAt) return { ok: false as const, error: "Tarih gerekli." };
    const sql = await db();
    await requireAdmin();
    await ensureWellnessTables(sql);
    const userId = data.userId;
    if (!userId) return { ok: false as const, error: "Danışan seçin." };
    const u = await findClientById(sql, userId);
    if (!u) return { ok: false as const, error: "Danışan yok." };
    const name = u.full_name;
    let key: string;
    let unit: string;
    let label: string;
    if (data.marker === "__custom__") {
      label = (data.customLabel ?? "").trim();
      if (label.length < 2) return { ok: false as const, error: "Parametre adını yazın." };
      key = label.slice(0, 48);
      unit = (data.customUnit ?? "").trim().slice(0, 16);
    } else {
      const meta = labMarkerMeta(data.marker);
      if (!meta) return { ok: false as const, error: "Geçersiz parametre." };
      key = meta.key;
      unit = meta.unit;
      label = meta.label;
    }
    const refMin = data.refMin ?? null;
    const refMax = data.refMax ?? null;
    await sql`
      insert into lab_values (user_id, taken_at, marker, value, unit, notes, ref_min, ref_max)
      values (
        ${userId}, ${data.takenAt}::date, ${key}, ${data.value},
        ${unit}, ${data.notes?.trim() || null}, ${refMin}, ${refMax}
      )
    `;
    const flag = labOutOfRange(key, data.value, refMin, refMax);
    await addNotification(sql, {
      userId,
      kind: "lab-value",
      title: `${name} kan değeri girildi`,
      body: `${label}: ${data.value} ${unit}${flag === "high" ? " · yüksek" : flag === "low" ? " · düşük" : ""}`,
      href: `/admin/danisan/${userId}`,
      skipTelegram: getStaffRole() === "admin",
    });
    await logAssistant(sql, "create", `Kan değeri: ${label}`, `${data.value} ${unit}`, clientHref(userId));
    return { ok: true as const };
  });

export const deleteLabValue = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    await ensureWellnessTables(sql);
    await sql`delete from lab_values where id = ${data.id}`;
    return { ok: true as const };
  });

export const updateLabValue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
      takenAt: z.string(),
      marker: z.string(),
      value: z.number(),
      notes: z.string().optional(),
      refMin: z.number().optional(),
      refMax: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (!data.takenAt) return { ok: false as const, error: "Tarih gerekli." };
    const sql = await db();
    await ensureWellnessTables(sql);
    const rows = await sql<{ user_id: number; unit: string | null }>`
      select user_id, unit from lab_values where id = ${data.id}
    `;
    if (!rows[0]) return { ok: false as const, error: "Kayıt yok." };
    const meta = labMarkerMeta(data.marker);
    const key = meta?.key ?? data.marker.trim().slice(0, 48);
    if (!key) return { ok: false as const, error: "Geçersiz parametre." };
    const unit = meta?.unit ?? rows[0].unit ?? "";
    const label = meta?.label ?? key;
    const refMin = data.refMin ?? null;
    const refMax = data.refMax ?? null;
    await sql`
      update lab_values
      set taken_at = ${data.takenAt}::date,
          marker = ${key},
          value = ${data.value},
          unit = ${unit},
          notes = ${data.notes?.trim() || null},
          ref_min = ${refMin},
          ref_max = ${refMax}
      where id = ${data.id}
    `;
    await logAssistant(
      sql,
      "update",
      `Kan değeri düzeltildi: ${label}`,
      `${data.value} ${unit}`,
      clientHref(rows[0].user_id),
    );
    return { ok: true as const };
  });

export const toggleAppointmentMeasure = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number(), isMeasure: z.boolean() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    try {
      await sql.query(
        "alter table appointments add column if not exists is_measure integer not null default 0",
      );
    } catch {
      /* exists */
    }
    await sql`update appointments set is_measure = ${data.isMeasure ? 1 : 0} where id = ${data.id}`;
    await logAssistant(
      sql,
      "update",
      data.isMeasure ? "Ölçüm randevusu işaretlendi" : "Ölçüm işareti kaldırıldı",
    );
    return { ok: true as const };
  });

export const saveClientPackage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.number(),
      kind: z.enum(["ishape", "diyet", "combo", "ozel"]),
      title: z.string().optional(),
      total: z.number().int().min(1).max(99),
      nextNo: z.number().int().min(1).max(99),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const meta = packageKindMeta(data.kind);
    const title = data.title?.trim() || meta.label;
    const sql = await db();
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
    const nextNo = Math.min(data.nextNo, data.total + 1);
    await sql`
      insert into client_packages (user_id, kind, title, total, next_no, unit, notes, is_active)
      values (
        ${data.userId}, ${data.kind}, ${title}, ${data.total}, ${nextNo}, ${meta.unit},
        ${data.notes?.trim() || null}, ${nextNo > data.total ? 0 : 1}
      )
    `;
    await logAssistant(
      sql,
      "create",
      `Paket eklendi: ${title} · ${nextNo}. ${meta.unit} / ${data.total}`,
      null,
      clientHref(data.userId),
    );
    await notifyPackageStatus(sql, data.userId, title, nextNo, data.total, meta.unit);
    return { ok: true as const };
  });

export const bumpClientPackage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number(), delta: z.number().int().min(-1).max(1) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const rows = await sql<ClientPackage>`
      select id, user_id, kind, title, total, next_no, unit, notes, is_active,
             created_at::text as created_at
      from client_packages where id = ${data.id} limit 1
    `;
    const p = rows[0];
    if (!p) return { ok: false as const, error: "Paket yok." };
    const next = Math.max(1, Math.min(p.total + 1, p.next_no + data.delta));
    const active = next > p.total ? 0 : 1;
    await sql`update client_packages set next_no = ${next}, is_active = ${active} where id = ${p.id}`;
    await logAssistant(
      sql,
      "update",
      `${p.title} · ${next}. ${p.unit} / ${p.total}`,
      null,
      clientHref(p.user_id),
    );
    await notifyPackageStatus(sql, p.user_id, p.title, next, p.total, p.unit);
    return { ok: true as const };
  });

export type PackageTrackRow = ClientPackage & {
  client_name: string;
  remaining: number;
  next_date: string | null;
  next_time: string | null;
};

export const loadPackageTrack = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdmin();
  } catch {
    return { auth: false as const };
  }
  const sql = await db();
  try {
    await applyDuePackageTicks(sql);
  } catch {
    /* ignore */
  }
  const today = todayISO();
  const clock = nowTimeIstanbul();
  try {
    const rows = await sql.query<PackageTrackRow>(
      `select p.id, p.user_id, p.kind, p.title, p.total, p.next_no, p.unit, p.notes,
              p.is_active, p.created_at::text as created_at,
              u.full_name as client_name,
              greatest(0, p.total - p.next_no + 1)::int as remaining,
              na.appointment_date::text as next_date,
              na.appointment_time as next_time
       from client_packages p
       join users u on u.id = p.user_id
       left join lateral (
         select appointment_date, appointment_time
         from appointments a
         where a.user_id = p.user_id
           and a.status in ('onaylandi', 'beklemede')
           and (
             a.appointment_date > $1
             or (a.appointment_date = $1 and a.appointment_time >= $2)
           )
         order by a.appointment_date, a.appointment_time
         limit 1
       ) na on true
       order by p.is_active desc, remaining asc, u.full_name
       limit 400`,
      [today, clock],
    );
    const active = rows.filter((r) => Number(r.is_active) === 1 && r.next_no <= r.total);
    const last = active.filter((r) => r.remaining === 1);
    const two = active.filter((r) => r.remaining === 2);
    const noAppt = active.filter((r) => r.remaining > 0 && !r.next_date);
    const done = rows.filter((r) => Number(r.is_active) === 0 || r.next_no > r.total).slice(0, 30);
    return {
      auth: true as const,
      active,
      last,
      two,
      noAppt,
      done,
      counts: {
        active: active.length,
        last: last.length,
        two: two.length,
        noAppt: noAppt.length,
      },
    };
  } catch (err) {
    console.error("loadPackageTrack", err);
    return {
      auth: true as const,
      active: [],
      last: [],
      two: [],
      noAppt: [],
      done: [],
      counts: { active: 0, last: 0, two: 0, noAppt: 0 },
    };
  }
});

async function notifyPackageStatus(
  sql: Sql,
  userId: number,
  title: string,
  nextNo: number,
  total: number,
  unit: string,
) {
  const user = await findClientById(sql, userId);
  const name = user?.full_name || "Danışan";
  const remaining = Math.max(0, total - nextNo + 1);
  if (remaining === 2) {
    await addNotification(sql, {
      userId,
      kind: "package",
      title: `${name} paketinde 2 ${unit} kaldı`,
      body: `${title} · kullanılan ${Math.max(0, nextNo - 1)}/${total}`,
      href: clientHref(userId),
    });
  } else if (remaining === 1) {
    await addNotification(sql, {
      userId,
      kind: "package",
      title: `${name} paketinde son ${unit}`,
      body: `${title} · ${nextNo} / ${total}`,
      href: clientHref(userId),
    });
  } else if (remaining === 0) {
    await addNotification(sql, {
      userId,
      kind: "package",
      title: `${name} paketi bitti`,
      body: `${title} · ${total} ${unit} tamamlandı`,
      href: clientHref(userId),
    });
  }
}

export const deleteClientPackage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await db();
    const rows = await sql<{ title: string; user_id: number }>`
      select title, user_id from client_packages where id = ${data.id} limit 1
    `;
    await sql`delete from client_packages where id = ${data.id}`;
    if (rows[0]) {
      await logAssistant(sql, "delete", `Paket silindi: ${rows[0].title}`, null, clientHref(rows[0].user_id));
    }
    return { ok: true as const };
  });

export const runReminderCron = createServerFn({ method: "GET" })
  .validator(z.object({ key: z.string() }))
  .handler(async ({ data }) => {
    const sql = await db();
    await ensureTelegramTables(sql);
    const rows = await sql<{ cron_key: string | null }>`
      select cron_key from clinic_telegram where id = 1 limit 1
    `;
    const expected = rows[0]?.cron_key?.trim();
    if (!expected || data.key.trim() !== expected) {
      return { ok: false as const, error: "yetkisiz" };
    }
    try {
      await tickAppointmentReminders(sql, true);
    } catch (err) {
      console.error("runReminderCron", err);
    }
    return { ok: true as const, clock: nowTimeIstanbul() };
  });

export const getStaffSession = createServerFn({ method: "GET" }).handler(async () => {
  await db();
  const role = getStaffRole();
  if (!role) return { auth: false as const };
  return { auth: true as const, role };
});

export const loadAssistantDay = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireOwner();
  } catch {
    return { auth: false as const };
  }
  const sql = await db();
  const istanbulDay = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  const raw = await sql<AssistantLogRow>`
    select id, kind, title, body, href, created_at::text as created_at
    from assistant_logs
    order by created_at desc
    limit 200
  `;
  const logs = raw.filter((row) => {
    const day = new Date(row.created_at).toLocaleDateString("en-CA", {
      timeZone: "Europe/Istanbul",
    });
    return day === istanbulDay;
  });
  const login = logs.filter((l) => l.kind === "login");
  const logout = logs.filter((l) => l.kind === "logout");
  const pending = await sql<DeleteRequestRow>`
    select id, target_table, target_id, summary, status,
           created_at::text as created_at, decided_at::text as decided_at
    from delete_requests
    where status = 'beklemede'
    order by created_at desc
  `;
  return {
    auth: true as const,
    logs,
    pending,
    firstLogin: login.at(-1)?.created_at ?? null,
    lastLogout: logout[0]?.created_at ?? null,
    loginCount: login.length,
  };
});

export const decideDeleteRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
      decision: z.enum(["onaylandi", "reddedildi"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner();
    const sql = await db();
    const rows = await sql<DeleteRequestRow>`
      select id, target_table, target_id, summary, status,
             created_at::text as created_at, decided_at::text as decided_at
      from delete_requests where id = ${data.id}
    `;
    const req = rows[0];
    if (!req || req.status !== "beklemede") {
      return { ok: false as const, error: "Talep bulunamadı." };
    }
    if (data.decision === "onaylandi") {
      await executeQueuedDelete(sql, req.target_table, req.target_id);
    }
    await sql`
      update delete_requests
      set status = ${data.decision}, decided_at = now()
      where id = ${data.id}
    `;
    return { ok: true as const };
  });

export type StaffAccountRow = { role: StaffRole; username: string };

export const loadCredentials = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireOwner();
  } catch {
    return { auth: false as const };
  }
  const sql = await db();
  const staff = await sql<StaffAccountRow>`
    select role, username from staff_accounts order by role
  `;
  const clients = await sql<{ id: number; full_name: string; phone: string; is_active: number }>`
    select id, full_name, phone, is_active from users order by full_name
  `;
  const admin = staff.find((s) => s.role === "admin") ?? { role: "admin" as const, username: "admin" };
  const assistant =
    staff.find((s) => s.role === "assistant") ?? { role: "assistant" as const, username: "asistan" };
  return { auth: true as const, admin, assistant, clients };
});

export const updateStaffAccount = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.enum(["admin", "assistant"]),
      username: z.string(),
      password: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner();
    const username = data.username.trim().toLowerCase();
    if (username.length < 3 || username.length > 32 || !/^[a-z0-9._-]+$/.test(username)) {
      return { ok: false as const, error: "Kullanıcı adı 3–32 karakter, harf/rakam olsun." };
    }
    const pass = data.password?.trim() ?? "";
    if (pass && pass.length < 4) {
      return { ok: false as const, error: "Şifre en az 4 karakter olmalı." };
    }
    const sql = await db();
    const clash = await sql<{ role: string }>`
      select role from staff_accounts where username = ${username} and role <> ${data.role}
    `;
    if (clash[0]) {
      return { ok: false as const, error: "Bu kullanıcı adı diğer hesapta kullanılıyor." };
    }
    if (pass) {
      await sql`
        insert into staff_accounts (role, username, password_hash, updated_at)
        values (${data.role}, ${username}, ${hashPassword(pass)}, now())
        on conflict (role) do update set
          username = excluded.username,
          password_hash = excluded.password_hash,
          updated_at = now()
      `;
    } else {
      await sql`
        insert into staff_accounts (role, username, password_hash, updated_at)
        values (
          ${data.role},
          ${username},
          ${data.role === "admin"
            ? "5b15d85d94f78a139358294f4c5cae60395fc7c50ef11b90cca669aa77300a6f"
            : "20e209320af88010f1fd69284cb66abd69aa765b362ee3f803fc492d9c342573"},
          now()
        )
        on conflict (role) do update set
          username = excluded.username,
          updated_at = now()
      `;
    }
    return { ok: true as const };
  });

export const updateClientLogin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number(),
      phone: z.string(),
      password: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireOwner();
    const phone = normalizePhone(data.phone);
    if (phone.length !== 11) return { ok: false as const, error: "Geçerli telefon girin." };
    const pass = data.password?.trim() ?? "";
    if (pass && pass.length < 4) {
      return { ok: false as const, error: "Şifre en az 4 karakter olmalı." };
    }
    const sql = await db();
    const user = await findClientById(sql, data.id);
    if (!user) return { ok: false as const, error: "Danışan bulunamadı." };
    const existing = await findClientByPhone(sql, phone);
    if (existing && existing.id !== data.id) {
      return { ok: false as const, error: "Bu telefon başka danışanda kayıtlı." };
    }
    await sql`update users set phone = ${phone} where id = ${data.id}`;
    if (pass) {
      await sql`update users set password = ${hashPassword(pass)} where id = ${data.id}`;
    }
    return { ok: true as const };
  });

export const loadTelegramSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdmin();
  } catch {
    return { auth: false as const };
  }
  const role = getStaffRole();
  const sql = await db();
  await ensureTelegramTables(sql);
  const bots = await sql<{
    bot_token: string | null;
    bot_username: string | null;
    cron_key: string | null;
  }>`
    select bot_token, bot_username, cron_key from clinic_telegram where id = 1 limit 1
  `;
  let cronKey = bots[0]?.cron_key?.trim() || "";
  if (role === "admin" && !cronKey) {
    cronKey = crypto.randomUUID().replace(/-/g, "");
    await sql`
      insert into clinic_telegram (id, cron_key, updated_at)
      values (1, ${cronKey}, now())
      on conflict (id) do update set
        cron_key = coalesce(clinic_telegram.cron_key, excluded.cron_key)
    `;
    const again = await sql<{ cron_key: string | null }>`select cron_key from clinic_telegram where id = 1`;
    cronKey = again[0]?.cron_key?.trim() || cronKey;
  }
  const links = await sql<{
    role: string;
    chat_id: string | null;
    telegram_name: string | null;
    pending_code: string | null;
    pending_until: string | null;
  }>`
    select role, chat_id, telegram_name, pending_code, pending_until::text as pending_until
    from telegram_links
  `;
  const token = bots[0]?.bot_token?.trim() || "";
  function pack(key: string) {
    const mine = links.find((l) => l.role === key);
    const pendingUntil = mine?.pending_until ? new Date(mine.pending_until).getTime() : 0;
    const pendingValid = Boolean(mine?.pending_code && pendingUntil > Date.now());
    return {
      linked: Boolean(mine?.chat_id),
      telegramName: mine?.telegram_name || "",
      pendingCode: pendingValid ? mine?.pending_code || "" : "",
    };
  }
  const mine = pack(telegramRoleKey(role ?? "admin", 1));
  const admin2 = pack("admin2");
  return {
    auth: true as const,
    role,
    hasToken: Boolean(token),
    botUsername: bots[0]?.bot_username || "",
    maskedToken: role === "admin" && token ? maskToken(token) : "",
    linked: mine.linked,
    telegramName: mine.telegramName,
    pendingCode: mine.pendingCode,
    admin2,
    cronKey: role === "admin" ? cronKey : "",
  };
});

export const saveTelegramToken = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner();
    const token = cleanTelegramToken(data.token);
    if (!token) return { ok: false as const, error: "Token gerekli." };
    let me: { username: string; name: string };
    try {
      me = await telegramGetMe(token);
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Token geçersiz." };
    }
    const sql = await db();
    await ensureTelegramTables(sql);
    await sql`
      insert into clinic_telegram (id, bot_token, bot_username, updated_at)
      values (1, ${token}, ${me.username}, now())
      on conflict (id) do update set
        bot_token = excluded.bot_token,
        bot_username = excluded.bot_username,
        updated_at = now()
    `;
    return { ok: true as const, username: me.username };
  });

export const startTelegramLink = createServerFn({ method: "POST" })
  .validator(z.object({ slot: z.union([z.literal(1), z.literal(2)]).optional() }))
  .handler(async ({ data }) => {
  await requireAdmin();
  const role = getStaffRole();
  if (!role) return { ok: false as const, error: "Oturum yok." };
  const slot: 1 | 2 = role === "admin" && data.slot === 2 ? 2 : 1;
  const key = telegramRoleKey(role, slot);
  const sql = await db();
  await ensureTelegramTables(sql);
  const bots = await sql<{ bot_token: string | null; bot_username: string | null }>`
    select bot_token, bot_username from clinic_telegram where id = 1 limit 1
  `;
  if (!bots[0]?.bot_token) {
    return { ok: false as const, error: "Önce yönetici bot tokenini kaydetsin." };
  }
  const code = makePairCode();
  await sql`
    insert into telegram_links (role, pending_code, pending_until)
    values (${key}, ${code}, now() + interval '15 minutes')
    on conflict (role) do update set
      pending_code = excluded.pending_code,
      pending_until = excluded.pending_until
  `;
  return {
    ok: true as const,
    code,
    username: bots[0].bot_username || "",
    slot,
  };
});

export const confirmTelegramLink = createServerFn({ method: "POST" })
  .validator(z.object({ slot: z.union([z.literal(1), z.literal(2)]).optional() }))
  .handler(async ({ data }) => {
  await requireAdmin();
  const role = getStaffRole();
  if (!role) return { ok: false as const, error: "Oturum yok." };
  const slot: 1 | 2 = role === "admin" && data.slot === 2 ? 2 : 1;
  const key = telegramRoleKey(role, slot);
  const sql = await db();
  const bots = await sql<{ bot_token: string | null }>`
    select bot_token from clinic_telegram where id = 1 limit 1
  `;
  const token = bots[0]?.bot_token?.trim();
  if (!token) return { ok: false as const, error: "Bot yok." };
  const rows = await sql<{ pending_code: string | null; pending_until: string | null }>`
    select pending_code, pending_until::text as pending_until
    from telegram_links where role = ${key} limit 1
  `;
  const code = rows[0]?.pending_code;
  const until = rows[0]?.pending_until ? new Date(rows[0].pending_until).getTime() : 0;
  if (!code || until < Date.now()) {
    return { ok: false as const, error: "Kodun süresi doldu. Yeni kod alın." };
  }
  let found: { chatId: string; name: string } | null = null;
  try {
    found = await telegramFindCode(token, code);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Telegram yanıt vermedi." };
  }
  if (!found) {
    return {
      ok: false as const,
      error: "Henüz kodu göremedim. Telegram’da bota kodu yazıp Başlat’a basın, sonra tekrar deneyin.",
    };
  }
  const taken = await sql<{ role: string }>`
    select role from telegram_links
    where chat_id = ${found.chatId} and role <> ${key}
    limit 1
  `;
  if (taken[0]) {
    return { ok: false as const, error: "Bu Telegram başka bir bağlantıda kayıtlı." };
  }
  await sql`
    update telegram_links
    set chat_id = ${found.chatId},
        telegram_name = ${found.name},
        pending_code = null,
        pending_until = null,
        linked_at = now()
    where role = ${key}
  `;
  try {
    await telegramSend(token, found.chatId, "Bağlandı. Klinik bildirimleri buraya düşecek.");
  } catch {
    /* ignore */
  }
  return { ok: true as const, name: found.name };
});

export const unlinkTelegram = createServerFn({ method: "POST" })
  .validator(z.object({ slot: z.union([z.literal(1), z.literal(2)]).optional() }))
  .handler(async ({ data }) => {
  await requireAdmin();
  const role = getStaffRole();
  if (!role) return { ok: false as const, error: "Oturum yok." };
  const slot: 1 | 2 = role === "admin" && data.slot === 2 ? 2 : 1;
  const key = telegramRoleKey(role, slot);
  const sql = await db();
  await sql`
    update telegram_links
    set chat_id = null, telegram_name = null, pending_code = null, pending_until = null, linked_at = null
    where role = ${key}
  `;
  return { ok: true as const };
});

export const sendTelegramTest = createServerFn({ method: "POST" })
  .validator(z.object({ slot: z.union([z.literal(1), z.literal(2)]).optional() }))
  .handler(async ({ data }) => {
  await requireAdmin();
  const role = getStaffRole();
  const slot: 1 | 2 = role === "admin" && data.slot === 2 ? 2 : 1;
  const key = telegramRoleKey(role ?? "admin", slot);
  const sql = await db();
  const bots = await sql<{ bot_token: string | null }>`
    select bot_token from clinic_telegram where id = 1 limit 1
  `;
  const token = bots[0]?.bot_token?.trim();
  if (!token) return { ok: false as const, error: "Bot yok." };
  const links = await sql<{ chat_id: string | null }>`
    select chat_id from telegram_links where role = ${key} limit 1
  `;
  const chatId = links[0]?.chat_id;
  if (!chatId) return { ok: false as const, error: "Önce Telegram hesabınızı bağlayın." };
  try {
    await telegramSend(token, chatId, formatTelegramNotice("Test bildirimi", "Bağlantı çalışıyor."));
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Gönderilemedi." };
  }
  return { ok: true as const };
});

export const loadBackupStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireOwner();
  } catch {
    return { auth: false as const };
  }
  const items = await listClinicBackups();
  const sql = await db();
  let dbName = "";
  let dbSize = "";
  let tables: Array<{
    name: string;
    rows: number;
    dead: number;
    seq: number;
    idx: number;
    size: string;
  }> = [];
  try {
    const nameRows = await sql.query<{ current_database: string }>(`select current_database()`);
    dbName = nameRows[0]?.current_database ?? "";
  } catch {
    dbName = "";
  }
  try {
    const sizeRows = await sql.query<{ pretty: string }>(
      `select pg_size_pretty(pg_database_size(current_database())) as pretty`,
    );
    dbSize = sizeRows[0]?.pretty ?? "";
  } catch {
    dbSize = "";
  }
  try {
    tables = await sql.query(
      `select relname as name,
              coalesce(n_live_tup, 0)::int as rows,
              coalesce(n_dead_tup, 0)::int as dead,
              coalesce(seq_scan, 0)::int as seq,
              coalesce(idx_scan, 0)::int as idx,
              coalesce(pg_size_pretty(pg_total_relation_size(relid)), '—') as size
       from pg_stat_user_tables
       order by pg_total_relation_size(relid) desc nulls last
       limit 24`,
    );
  } catch {
    try {
      tables = await sql.query(
        `select relname as name,
                coalesce(n_live_tup, 0)::int as rows,
                coalesce(n_dead_tup, 0)::int as dead,
                coalesce(seq_scan, 0)::int as seq,
                coalesce(idx_scan, 0)::int as idx,
                '—' as size
         from pg_stat_user_tables
         order by n_live_tup desc
         limit 24`,
      );
    } catch {
      tables = [];
    }
  }
  return {
    auth: true as const,
    items,
    last: items[0] ?? null,
    dbName,
    dbSize,
    tables,
  };
});

export const runClinicBackupNow = createServerFn({ method: "POST" }).handler(async () => {
  try {
    await requireOwner();
  } catch {
    return { ok: false as const, error: "Yedek yalnızca yönetici alır." };
  }
  const sql = await db();
  try {
    const res = await writeClinicBackup(sql);
    return {
      ok: true as const,
      name: res.name,
      bytes: res.bytes,
      filename: res.name,
      mime: "application/json",
      b64: Buffer.from(res.json, "utf8").toString("base64"),
    };
  } catch (e) {
    console.error("runClinicBackupNow", e);
    return { ok: false as const, error: e instanceof Error ? e.message : "Yedek alınamadı." };
  }
});

export const downloadClinicBackup = createServerFn({ method: "GET" })
  .validator(z.object({ name: z.string() }))
  .handler(async ({ data }) => {
    await requireOwner();
    const buf = await readClinicBackup(data.name);
    if (!buf) return { ok: false as const, error: "Yedek bulunamadı." };
    return {
      ok: true as const,
      filename: data.name,
      mime: "application/json",
      b64: buf.toString("base64"),
    };
  });

void asInt;
void isoStamp;
