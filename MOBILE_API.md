# Mobil JSON API (`/api/v1`)

Stable REST endpoints for the Expo app (`feyza-kahyaoglu-mobile`).  
Web panel auth (httpOnly cookies + TanStack `createServerFn`) is unchanged.

## Base URL

Production: `https://feyzakahyaoglu.com/api/v1`  
Override in the mobile app with `EXPO_PUBLIC_API_URL` (no trailing slash; should end with `/api/v1` or the app appends paths under `/api/v1`).

**Staging (Railway):** `https://feyza-kahyaoglu-klinik-production.up.railway.app/api/v1`  
**Production cutover:** point mobile `DEFAULT_API_BASE` / `EXPO_PUBLIC_API_URL` at `https://feyzakahyaoglu.com/api/v1` after DNS cutover.

## Auth mechanism

- **Web:** existing `fk_client` / `fk_admin` / `fk_assistant` httpOnly cookies (HMAC-signed).
- **Mobile (preferred):** opaque **Bearer** token — the same HMAC payload as the cookies, returned as `token` on login and sent as `Authorization: Bearer <token>`.
- Cookies are still set on login responses for hybrid/WebView use; Expo should store the Bearer token in `expo-secure-store` and send it on every request.
- Session helpers (`getStaffRole`, `getClientIdFromCookie`, `requireClient`, …) accept **either** Bearer or cookie, so existing server functions also work with the mobile token.

## CORS

`OPTIONS` + CORS headers on all `/api/v1` routes. Allows `Authorization` and `Content-Type`. Methods: `GET, POST, PATCH, OPTIONS`. Reflects localhost / Expo origins; otherwise `Access-Control-Allow-Origin: *` (Bearer does not need credentials).

## Endpoints

All error messages are Turkish. JSON `Content-Type: application/json`.

### `POST /api/v1/auth/client/login`

Body: `{ "phone": "05XXXXXXXXX", "password": "..." }`

Success `200`:

```json
{ "ok": true, "token": "<opaque>", "role": "client", "name": "Ayşe Yılmaz" }
```

Failure `401`: `{ "ok": false, "error": "Telefon veya şifre hatalı." }`

### `POST /api/v1/auth/admin/login`

Body: `{ "username": "...", "password": "..." }`  
Success: `{ "ok": true, "token": "...", "role": "admin" }`

### `POST /api/v1/auth/assistant/login`

Body: `{ "username": "...", "password": "..." }`  
Success: `{ "ok": true, "token": "...", "role": "assistant" }`

### `POST /api/v1/auth/logout`

Clears staff + client cookies. Mobile should also delete the stored Bearer token.  
Success: `{ "ok": true }`

### `GET /api/v1/auth/me`

Requires Bearer or cookie.

Success:

```json
{
  "ok": true,
  "role": "client",
  "admin": false,
  "assistant": false,
  "client": { "id": 1, "name": "...", "phone": "..." }
}
```

Unauthorized `401`: `{ "ok": false, "error": "Oturum bulunamadı.", ... }`

### `GET /api/v1/client/panel`

Authenticated **client**. Returns the same payload shape as `loadClientPanel`:
`auth`, `user`, `diets`, `measures`, `measuresChrono`, `ishape`, `messages`, `appts`,
`requests`, `offplans`, `progress`, `nextAppt`, `packages`, `labs`, `dailyToday`,
`waterTarget`, `labValues`, `mindfulToday`, `weekHabits`, `fasting`, `fastingToday`, …

Diet list items include `has_pdf`, `pdf_name`, and **`has_pdf_blob`** (`1` only when `pdf_path` or `pdf_b64` is present — mobile must not offer download when blob is missing).

Unauthorized `401`: `{ "auth": false, "error": "Danışan oturumu gerekli." }`

### `GET /api/v1/client/diets/:id/pdf`

Authenticated **client** who owns the diet. Streams `application/pdf` when `pdf_path` or `pdf_b64` is present.

List payloads expose `has_pdf_blob` separately from `has_pdf`/`pdf_name` so the app can hide a dead download button when only a name exists.

- `200` — binary PDF (`Content-Disposition: inline`)
- `401` — `{ "ok": false, "error": "Danışan oturumu gerekli." }`
- `404` — JSON when the diet is missing **or** only `pdf_name` exists with no blob/path on disk:
  `{ "ok": false, "error": "PDF dosyası sunucuda yok (…).", "pdf_name": "…" }`
- Serving uses `getDietPdfFile` → `pdf_path` under `DATA_DIR/diet-pdfs` **or** `pdf_b64`. If neither exists, mobile should show the Turkish error (diyetisyen yeniden yüklemeli) — do not fall back to a site WebView.

### `POST /api/v1/client/water`

Body (any combination): `{ "waterMl": 1500, "addWaterMl": 250, "sweaty": true }`

Reuses `saveDailyLog`. Success: `{ "ok": true, "waterMl": 1500 }`

### `POST /api/v1/client/daily`

Authenticated **client**. Reuses `saveDailyLog` — uyku / stres / ruh hali / enerji (and optional su fields). Matches web “Öğün ve uyku yaz” sleep/stress card.

Body (any combination):  
`{ "sleepHours": 7.5, "stress": 1..5, "mood": "iyi"|"normal"|"yorgun"|"zorlaniyorum", "energy": 1..5, "waterMl"?, "addWaterMl"?, "sweaty"?, "lowCarb"?, "hungerBefore"?, "hungerAfter"?, "eatTrigger"? }`

Success: `{ "ok": true, "waterMl": 1500 }`


### `POST /api/v1/client/fasting`

Authenticated **client**. Reuses `clientLogFasting` (web aralıklı oruç günlüğü). Plan remains on `GET /client/panel` → `fasting` / `fastingToday`.

Body: `{ "kind": "broke"|"opened"|"undo", "reason?", "detail?", "energy?": 1..5, "dizzy?", "endReason?" }`

Success: `{ "ok": true }`

### `POST /api/v1/client/mindful`

Authenticated **client**. Reuses `saveMindfulMeal` — öğün farkındalığı.

Body: `{ "slot": "sabah"|"ogle"|"aksam"|"ara", "hungerBefore": 1..10, "hungerAfter?": 1..10, "eatTrigger?": "aclik"|… }`

Success: `{ "ok": true }`

### `POST /api/v1/client/offplan`

JSON body: `{ "slot": "ogle", "kind": "extra"|"missing", "detail": "…", "amount?": "…", "note?": "…", "photoB64?": "…", "photoMime?": "image/jpeg", "photoName?": "yemek.jpg" }`  
(`slot`: `sabah|ogle|aksam|gece|ara`). Detail **or** photo required (same as web `saveOffplan`).

Also accepts `multipart/form-data` with fields `slot`, `kind`, `detail`, `amount`, `note`, and file field `photo` / `file` (JPG/PNG/WEBP, max 32 MB). Stored via `photo_path` on disk (`DATA_DIR/offplan-photos`) with `photo_b64` fallback — same as web.

Success: `{ "ok": true }`

### `POST /api/v1/client/messages`

Body: `{ "message": "…" }`  
Success: `{ "ok": true }`

### `PATCH` / `POST /api/v1/client/profile`

Authenticated **client**. Reuses `clientUpdateProfile` (web `/panel/profil`).

Body: `{ "email": "…" }` (empty string clears email)

Success: `{ "ok": true, "email": "…" | null }`

### `POST /api/v1/client/password`

Authenticated **client**. Reuses `clientChangePassword` (web `/panel/sifre`).

Body: `{ "current": "…", "next": "…", "again?": "…" }`  
(`again` optional; if present must match `next`. New password min 4 chars.)

Success: `{ "ok": true }`  
Failure `400`: `{ "ok": false, "error": "Mevcut şifre hatalı." }` (etc.)

### `POST /api/v1/client/labs`

Authenticated **client**. Reuses `uploadLab` (web tahlil yükleme). List remains on `GET /client/panel` → `labs`.

- **JSON:** `{ "title?": "…", "note?": "…", "fileB64": "…", "fileName?": "tahlil.pdf", "mime?": "application/pdf" }`
- **multipart/form-data:** fields `title`, `note`, file field `file` (PDF/JPG/PNG/WEBP, max 32 MB)

Stored under `DATA_DIR/lab-files` (`file_path`) with `file_b64` fallback — same as web.

Success: `{ "ok": true }`

### `GET /api/v1/staff/session`

Authenticated **admin** or **assistant**.  
Success: `{ "auth": true, "role": "admin" | "assistant" }`


### `GET /api/v1/staff/dashboard`

Authenticated **admin** or **assistant**. Today’s clinic summary (Europe/Istanbul date).

Success `200`:

```json
{
  "auth": true,
  "role": "admin",
  "username": "feyza",
  "today": "2026-09-07",
  "summary": {
    "appointmentsToday": 3,
    "clientsActive": 42,
    "pendingRequests": 1,
    "unreadNotifications": 2
  },
  "appointments": [
    {
      "id": 1,
      "appointment_date": "2026-09-07",
      "appointment_time": "10:00",
      "service_name": "Kontrol",
      "client_name": "Ayşe Yılmaz",
      "client_phone": "05XXXXXXXXX",
      "status": "onaylandi",
      "notes": ""
    }
  ]
}
```

Unauthorized `401`: `{ "auth": false, "error": "Personel oturumu gerekli." }`



### `GET /api/v1/staff/clients`

Authenticated **admin** or **assistant**. Active clients (optional `?q=` name/phone search).

Success `200`:

```json
{
  "auth": true,
  "role": "admin",
  "clients": [
    {
      "id": 1,
      "full_name": "Ayşe Yılmaz",
      "phone": "05XXXXXXXXX",
      "last_panel_visit": "2026-09-07T10:00:00",
      "has_ishape": true,
      "notes": "…"
    }
  ]
}
```

Notes are truncated (~120 chars). Unauthorized `401`: `{ "auth": false, "error": "Personel oturumu gerekli." }`

### `GET /api/v1/staff/clients/:id`

Authenticated **admin** or **assistant**. Read-only client summary.

Success `200`: `auth`, `role`, `client` (profile), `counts` (`appointments`/`measures`/`diets`), `recentAppointments`, `recentMeasures`, `recentDiets`.

Missing `404`: `{ "ok": false, "error": "Danışan bulunamadı." }`

### `GET /api/v1/staff/appointments?from=&to=&range=`

Authenticated **admin** or **assistant**. Default range: today .. today+7 (Europe/Istanbul). Same appointment fields as dashboard, plus `user_id`.

- `range=today` → from=to=today
- `range=week` → today .. today+7
- Explicit `from` / `to` (ISO date) override `range`.

Success `200`: `{ "auth": true, "role": "admin", "from": "…", "to": "…", "appointments": [ … ] }`

### `GET /api/v1/staff/notifications`

Authenticated **admin** or **assistant**. Recent `admin_notifications` (limit 50) + `unread` count. Assistants do not see `briefing` / `assistant` kinds.

Success `200`:

```json
{
  "auth": true,
  "role": "admin",
  "unread": 2,
  "notifications": [
    {
      "id": 1,
      "user_id": 3,
      "kind": "message",
      "title": "…",
      "body": "…",
      "href": "",
      "is_read": false,
      "created_at": "2026-09-07T10:00:00",
      "client_name": "Ayşe Yılmaz"
    }
  ]
}
```

### `POST /api/v1/staff/notifications/read`

Authenticated **admin** or **assistant**. Mark one or all as read.

Body: `{ "id": 12 }` **or** `{ "all": true }` (omit / empty also marks all).  
Success: `{ "ok": true, "id": 12 }` or `{ "ok": true, "all": true }`

### `POST /api/v1/staff/clients`

Authenticated **admin** or **assistant**. Create client (safe subset of web `createClient`).

Body: `{ "fullName": "…", "phone": "05…", "gender?": "kadin"|"erkek", "password?", "email?", "notes?", "hasIshape?", "targetWeight?" }`  
If `password` omitted, a temp password is generated and returned as `tempPassword`.

Success: `{ "ok": true, "id": 12, "tempPassword?": "…" }`

### `PATCH /api/v1/staff/clients/:id`

Authenticated **admin** or **assistant**. Update basic fields.

Body (any subset): `{ "fullName?", "phone?", "notes?", "isActive?", "email?", "hasIshape?", "gender?", "targetWeight?" }`

Success: `{ "ok": true, "id": 12, "client": { … } }`

### `POST /api/v1/staff/appointments`

Authenticated **admin** or **assistant**. Create one or weekly series (status `onaylandi`).

Body: `{ "userId": 1, "serviceKey": "diyet", "date": "YYYY-MM-DD", "time": "HH:MM", "weeks?": 1..9, "notes?", "isMeasure?" }`  
`serviceKey`: `diyet` | `online-diyet` | `diyet-ishape` | `ishape`

Success: `{ "ok": true, "count": 1, "ids": […], "dates": […] }`

### `PATCH /api/v1/staff/appointments`

Authenticated **admin** or **assistant**. Change status.

Body: `{ "id": 12, "status": "onaylandi"|"beklemede"|"iptal"|"tamamlandi"|"gelmedi", "adminNotes?" }`

Success: `{ "ok": true, "id": 12, "status": "…" }`

### `GET /api/v1/staff/packages`

Authenticated **admin** or **assistant**. Package track list + counts.

Success: `{ "auth": true, "role": "admin", "packages": [ { "id", "user_id", "client_name", "title", "total", "next_no", "remaining", "unit", "is_active", "next_date?", "next_time?" } ], "counts": { "active", "last", "two" } }`

### `PATCH /api/v1/staff/packages`

Authenticated **admin** or **assistant**. Adjust ticks.

Body: `{ "id": 3, "delta": -1|1 }` **or** `{ "id": 3, "remaining": 2 }`

Success: `{ "ok": true, "id", "next_no", "remaining", "is_active" }`

### `GET /api/v1/staff/mali?month=YYYY-MM`

Authenticated **admin** or **assistant**. Month summary. Assistants get `hideTotals: true` and null amounts.

Success: `{ "auth", "role", "hideTotals", "month", "summary": { "income", "totalDebt", "paymentCount", "debtorCount" }, "payments": […], "debtors": […] }`

### `POST /api/v1/staff/mali/payment`

Body: `{ "userId", "amount", "method": "nakit"|"kredi-karti"|"havale"|"diger", "paidAt?", "notes?", "applyToDebt?" }`  
Success: `{ "ok": true, "id" }`

### `POST /api/v1/staff/mali/debt`

Body: `{ "userId", "amount", "notes?" }`  
Success: `{ "ok": true, "id" }`

### `POST /api/v1/staff/password`

Authenticated staff — change **own** password.

Body: `{ "current": "…", "next": "…", "again?" }`  
Success: `{ "ok": true }`



### `GET /api/v1/staff/feedback`

Authenticated **admin** or **assistant**. Client feedback list (marks unread as read, same as web).

Success: `{ "auth": true, "role": "admin", "rows": [ { "id", "user_id", "message", "is_read", "created_at", "client_name", "client_phone" } ] }`

### `POST /api/v1/staff/feedback`

Body: `{ "id": 12 }` — delete feedback.  
Success: `{ "ok": true }`

### `GET /api/v1/staff/tracking`

Authenticated **admin** or **assistant**. Staff “Takip” dashboard: today’s logs, low water, sleep/stress, skipped trackers, emotional eating week, out-of-range lab values, uploads, markers.

Success includes: `stats`, `todayLogs`, `lowWater`, `sleepStress`, `skipped`, `emotionalWeek`, `flagged`, `labValues`, `uploads`, `markers`.

### `POST /api/v1/staff/tracking`

Body `action`:

- `staffNote` — `{ "action":"staffNote", "id", "note" }`
- `deleteLab` — `{ "action":"deleteLab", "id" }`
- `saveValue` — `{ "action":"saveValue", "userId", "takenAt", "marker", "value", "notes?", "refMin?", "refMax?", "customLabel?", "customUnit?" }`
- `deleteValue` — `{ "action":"deleteValue", "id" }`

### `GET /api/v1/staff/telegram`

Authenticated staff. Bot status (masked token for admin only — raw token never returned), link slots, pending codes.

### `POST /api/v1/staff/telegram`

Body `action`:

- `saveToken` — **admin only** `{ "action":"saveToken", "token":"…" }` (token never logged)
- `startLink` / `confirmLink` / `unlink` / `test` — `{ "action":"…", "slot?": 1|2 }`

### `GET /api/v1/staff/credentials`

**Admin only.** Staff usernames + client phone list (no password hashes).

### `POST /api/v1/staff/credentials`

**Admin only.**

- `updateStaff` — `{ "action":"updateStaff", "role":"admin"|"assistant", "username", "password?" }`
- `updateClient` — `{ "action":"updateClient", "id", "phone", "password?" }`

### `GET /api/v1/staff/export`

**Admin only.** Backup list + Postgres table stats.

### `POST /api/v1/staff/export`

**Admin only.** Returns base64 file payloads for mobile save/share:

- `backupNow` → `{ ok, filename, mime, b64, name, bytes }`
- `downloadBackup` — `{ "action":"downloadBackup", "name":"klinik-YYYY-MM-DD.json" }`
- `excelAll` / `excelAppts` → `{ ok, filename, mime, b64 }`

### `GET /api/v1/staff/assistant`

**Admin only.** Assistant day summary: login/logout, pending delete approvals, today’s logs.

### `POST /api/v1/staff/assistant`

**Admin only.** `{ "action":"decide", "id", "decision":"onaylandi"|"reddedildi" }`



## Example (client)

```bash
TOKEN=$(curl -s -X POST https://feyzakahyaoglu.com/api/v1/auth/client/login \
  -H 'content-type: application/json' \
  -d '{"phone":"05551112233","password":"danisan123"}' | jq -r .token)

curl -s https://feyzakahyaoglu.com/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

curl -s https://feyzakahyaoglu.com/api/v1/client/panel \
  -H "Authorization: Bearer $TOKEN"

curl -s https://feyza-kahyaoglu-klinik-production.up.railway.app/api/v1/client/water \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"addWaterMl":250,"sweaty":false}'

curl -s -OJ https://feyza-kahyaoglu-klinik-production.up.railway.app/api/v1/client/diets/1/pdf \
  -H "Authorization: Bearer $TOKEN"
```

curl -s https://feyza-kahyaoglu-klinik-production.up.railway.app/api/v1/client/daily \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"sleepHours":7.5,"stress":2}'

curl -s https://feyza-kahyaoglu-klinik-production.up.railway.app/api/v1/client/profile \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -X PATCH -d '{"email":"ornek@mail.com"}'

## Deploy + test

1. Merge PR `feat/mobile-api` and deploy klinik (same pipeline as today — Vite/Nitro → Vercel).
2. Confirm `GET https://feyzakahyaoglu.com/api/v1/auth/me` returns JSON `401` (not HTML 404).
3. Login with a known client / staff account; call `/client/panel` or `/staff/session`.
4. Install/update the mobile app pointing at production (or `EXPO_PUBLIC_API_URL`).
5. Web regression: `/giris`, `/admin/login`, `/asistan/giris` cookie login still works.

## Implementation notes

- Route files: `src/routes/api/v1/**` (TanStack Start `server.handlers`).
- Shared helpers: `src/lib/mobile-api.server.ts`.
- Session Bearer support: `src/lib/session.ts` (`readBearerToken`, `issueClientToken`, `issueStaffToken`).
