/**
 * Mobile JSON API helpers (Bearer tokens + CORS).
 * Web cookie sessions stay intact via existing set*Cookie helpers.
 */
import { normalizePhone } from "@/lib/clinic";
import {
  ADMIN_COOKIE,
  ASSISTANT_COOKIE,
  CLIENT_COOKIE,
  buildClearCookieHeader,
  buildCookieHeader,
  checkAdminLogin,
  checkAssistantLogin,
  clearClientCookie,
  clearStaffCookies,
  db,
  findClientById,
  findClientByPhone,
  getClientIdFromCookie,
  getStaffRole,
  hashPassword,
  issueClientToken,
  issueStaffToken,
  setAdminCookie,
  setAssistantCookie,
  setClientCookie,
  type StaffRole,
} from "@/lib/session";

const CORS_ORIGINS = new Set([
  "https://feyzakahyaoglu.com",
  "https://www.feyzakahyaoglu.com",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:19006",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:19006",
]);

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allowOrigin =
    origin && (CORS_ORIGINS.has(origin) || origin.startsWith("exp://"))
      ? origin
      : origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ? origin
        : "*";

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Accept, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (allowOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}

export function jsonResponse(
  request: Request,
  body: unknown,
  init: { status?: number; setCookies?: string[] } = {},
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    ...corsHeaders(request),
  });
  for (const c of init.setCookies ?? []) {
    headers.append("Set-Cookie", c);
  }
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers,
  });
}

export function optionsResponse(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function readJsonBody<T extends Record<string, unknown>>(
  request: Request,
): Promise<T | null> {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as T;
  } catch {
    return null;
  }
}

async function logAssistantSilent(
  kind: string,
  title: string,
): Promise<void> {
  try {
    const sql = await db();
    await sql`
      insert into assistant_logs (kind, title, body, href)
      values (${kind}, ${title}, null, null)
    `;
  } catch {
    /* ignore */
  }
}

export async function apiClientLogin(
  phoneRaw: string,
  password: string,
): Promise<
  | { ok: true; name: string; token: string; role: "client"; setCookies: string[] }
  | { ok: false; error: string }
> {
  const sql = await db();
  const phone = normalizePhone(phoneRaw);
  const user = await findClientByPhone(sql, phone);
  if (!user || user.is_active !== 1) {
    return { ok: false, error: "Telefon veya şifre hatalı." };
  }
  const rows = await sql<{ password: string }>`
    select password from users where id = ${user.id}
  `;
  if (!rows[0] || rows[0].password !== hashPassword(password)) {
    return { ok: false, error: "Telefon veya şifre hatalı." };
  }
  const token = issueClientToken(user.id);
  setClientCookie(user.id);
  return {
    ok: true,
    name: user.full_name,
    token,
    role: "client",
    setCookies: [buildCookieHeader(CLIENT_COOKIE, token)],
  };
}

export async function apiStaffLogin(
  role: StaffRole,
  username: string,
  password: string,
): Promise<
  | { ok: true; token: string; role: StaffRole; setCookies: string[] }
  | { ok: false; error: string }
> {
  await db();
  const ok =
    role === "admin"
      ? await checkAdminLogin(username, password)
      : await checkAssistantLogin(username, password);
  if (!ok) {
    return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
  }
  const token = issueStaffToken(role);
  if (role === "admin") {
    setAdminCookie();
  } else {
    setAssistantCookie();
    await logAssistantSilent("login", "Panele giriş yaptı");
  }
  const cookieName = role === "admin" ? ADMIN_COOKIE : ASSISTANT_COOKIE;
  const clearOther =
    role === "admin"
      ? buildClearCookieHeader(ASSISTANT_COOKIE)
      : buildClearCookieHeader(ADMIN_COOKIE);
  return {
    ok: true,
    token,
    role,
    setCookies: [buildCookieHeader(cookieName, token), clearOther],
  };
}

export async function apiLogout(): Promise<{ ok: true; setCookies: string[] }> {
  const sql = await db();
  if (getStaffRole() === "assistant") {
    try {
      await sql`
        insert into assistant_logs (kind, title, body, href)
        values ('logout', 'Panelden çıkış yaptı', null, null)
      `;
    } catch {
      /* ignore */
    }
  }
  clearStaffCookies();
  clearClientCookie();
  return {
    ok: true,
    setCookies: [
      buildClearCookieHeader(ADMIN_COOKIE),
      buildClearCookieHeader(ASSISTANT_COOKIE),
      buildClearCookieHeader(CLIENT_COOKIE),
    ],
  };
}

export async function apiMe(): Promise<{
  admin: boolean;
  assistant: boolean;
  client: { id: number; name: string; phone?: string } | null;
  role: "admin" | "assistant" | "client" | null;
}> {
  await db();
  const staff = getStaffRole();
  let client: { id: number; name: string; phone?: string } | null = null;
  const clientId = getClientIdFromCookie();
  if (clientId) {
    const user = await findClientById(await db(), clientId);
    if (user && user.is_active === 1) {
      client = { id: user.id, name: user.full_name, phone: user.phone };
    }
  }
  const role: "admin" | "assistant" | "client" | null = staff
    ? staff
    : client
      ? "client"
      : null;
  return {
    admin: staff === "admin",
    assistant: staff === "assistant",
    client,
    role,
  };
}
