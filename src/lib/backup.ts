import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Sql } from "@/lib/db";
import { todayISO } from "@/lib/clinic";

const BACKUP_DIR = join(process.cwd(), "data", "backups");
const KEEP_DAYS = 14;

const CLINIC_TABLES = [
  "users",
  "appointments",
  "diet_lists",
  "measurements",
  "ishape_sessions",
  "messages",
  "appointment_requests",
  "payments",
  "expenses",
  "offplan_logs",
  "client_feedback",
  "fasting_plans",
  "fasting_logs",
  "lab_uploads",
  "daily_logs",
  "lab_values",
  "mindful_meals",
  "admin_notifications",
  "client_debts",
  "assistant_logs",
  "delete_requests",
  "staff_accounts",
  "clinic_telegram",
  "telegram_links",
  "appointment_reminders",
  "reminder_digests",
  "client_packages",
  "package_ticks",
] as const;

export type BackupMeta = {
  name: string;
  taken: string;
  bytes: number;
};

function jsonSafe(_key: string, val: unknown) {
  if (val == null) return val;
  if (typeof val === "bigint") return Number(val);
  if (val instanceof Date) return val.toISOString();
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(val)) return null;
  if (val instanceof Uint8Array) return null;
  if (typeof val === "string" && val.length > 80_000) {
    return `[kesildi: ${val.length} karakter]`;
  }
  if (typeof val === "object") {
    const rec = val as Record<string, unknown>;
    if (rec.type === "Buffer" && Array.isArray(rec.data)) return null;
  }
  return val;
}

function sanitizeRow(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (/b64|token|password_hash|^password$/i.test(k)) {
      if (/password/i.test(k)) out[k] = v == null ? null : "[hash]";
      else out[k] = null;
      continue;
    }
    out[k] = jsonSafe(k, v);
  }
  return out;
}

async function dumpTables(sql: Sql) {
  const tables: Record<string, unknown[]> = {};
  for (const table of CLINIC_TABLES) {
    try {
      const rows = await sql.query<Record<string, unknown>>(`select * from "${table}"`);
      tables[table] = rows.map((r) => sanitizeRow(r));
    } catch {
      tables[table] = [];
    }
  }
  return tables;
}

async function fileInventory() {
  const dirs = ["diet-pdfs", "lab-files", "offplan-photos"];
  const files: Record<string, number> = {};
  for (const dir of dirs) {
    try {
      const list = await readdir(join(process.cwd(), "data", dir));
      files[dir] = list.filter((n) => !n.startsWith(".")).length;
    } catch {
      files[dir] = 0;
    }
  }
  return files;
}

export async function buildClinicBackupJson(sql: Sql) {
  const day = todayISO();
  const payload = {
    version: 1,
    taken_at: new Date().toISOString(),
    day,
    tables: await dumpTables(sql),
    files: await fileInventory(),
  };
  const json = JSON.stringify(payload, jsonSafe);
  const name = `klinik-${day}.json`;
  return { name, json, day, bytes: Buffer.byteLength(json) };
}

export async function writeClinicBackup(sql: Sql) {
  const built = await buildClinicBackupJson(sql);
  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    await writeFile(join(BACKUP_DIR, built.name), built.json, "utf8");
    await pruneOldBackups();
  } catch (err) {
    console.error("backup write", err);
  }
  return built;
}

async function pruneOldBackups() {
  let list: string[] = [];
  try {
    list = (await readdir(BACKUP_DIR)).filter((n) => /^klinik-\d{4}-\d{2}-\d{2}\.json$/.test(n));
  } catch {
    return;
  }
  list.sort();
  const drop = list.slice(0, Math.max(0, list.length - KEEP_DAYS));
  for (const name of drop) {
    try {
      await unlink(join(BACKUP_DIR, name));
    } catch {
      /* ignore */
    }
  }
}

export async function listClinicBackups(): Promise<BackupMeta[]> {
  let names: string[] = [];
  try {
    names = (await readdir(BACKUP_DIR)).filter((n) => /^klinik-\d{4}-\d{2}-\d{2}\.json$/.test(n));
  } catch {
    return [];
  }
  names.sort().reverse();
  const out: BackupMeta[] = [];
  for (const name of names) {
    try {
      const st = await stat(join(BACKUP_DIR, name));
      out.push({
        name,
        taken: name.replace("klinik-", "").replace(".json", ""),
        bytes: st.size,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function readClinicBackup(name: string) {
  if (!/^klinik-\d{4}-\d{2}-\d{2}\.json$/.test(name)) return null;
  try {
    const buf = await readFile(join(BACKUP_DIR, name));
    return buf;
  } catch {
    return null;
  }
}

export async function maybeDailyBackup(sql: Sql) {
  try {
    const ins = await sql<{ kind: string }>`
      insert into reminder_digests (kind, for_date)
      values ('db-backup', ${todayISO()}::date)
      on conflict do nothing
      returning kind
    `;
    if (!ins[0]) return null;
  } catch {
    /* table may be missing; still write */
  }
  return writeClinicBackup(sql);
}
