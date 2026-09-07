# Mobil JSON API (`/api/v1`)

Stable REST endpoints for the Expo app (`feyza-kahyaoglu-mobile`).  
Web panel auth (httpOnly cookies + TanStack `createServerFn`) is unchanged.

## Base URL

Production: `https://feyzakahyaoglu.com/api/v1`  
Override in the mobile app with `EXPO_PUBLIC_API_URL` (no trailing slash; should end with `/api/v1` or the app appends paths under `/api/v1`).

**Deploy note:** Until this branch is merged and deployed to production, `/api/v1` will 404 on the live site. Ship the klinik PR before relying on the mobile client in production.

## Auth mechanism

- **Web:** existing `fk_client` / `fk_admin` / `fk_assistant` httpOnly cookies (HMAC-signed).
- **Mobile (preferred):** opaque **Bearer** token — the same HMAC payload as the cookies, returned as `token` on login and sent as `Authorization: Bearer <token>`.
- Cookies are still set on login responses for hybrid/WebView use; Expo should store the Bearer token in `expo-secure-store` and send it on every request.
- Session helpers (`getStaffRole`, `getClientIdFromCookie`, `requireClient`, …) accept **either** Bearer or cookie, so existing server functions also work with the mobile token.

## CORS

`OPTIONS` + CORS headers on all `/api/v1` routes. Allows `Authorization` and `Content-Type`. Reflects localhost / Expo origins; otherwise `Access-Control-Allow-Origin: *` (Bearer does not need credentials).

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

Authenticated **client**. Returns the same payload shape as `loadClientPanel` (`auth`, `user`, `diets`, `measures`, `messages`, `appts`, …).

Unauthorized `401`: `{ "auth": false, "error": "Danışan oturumu gerekli." }`

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


## Example (client)

```bash
TOKEN=$(curl -s -X POST https://feyzakahyaoglu.com/api/v1/auth/client/login \
  -H 'content-type: application/json' \
  -d '{"phone":"05551112233","password":"danisan123"}' | jq -r .token)

curl -s https://feyzakahyaoglu.com/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

curl -s https://feyzakahyaoglu.com/api/v1/client/panel \
  -H "Authorization: Bearer $TOKEN"
```

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
