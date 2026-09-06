# Railway deployment - Klinik

EN+TR notes for hosting.

## Env

- DATABASE_URL: Postgres connection (pg)
- VITE_AUTH_ENABLED: false
- SESSION_SECRET: random >=32 chars
- APP_URL: public https origin
- DATA_DIR: optional volume path
- BETTER_AUTH_SECRET / BETTER_AUTH_URL / GROK_AUTH_*: only if enabling Grok auth later

## Start

npm run start

### Start / build

- Start: npm run start (= migrate then node .output/server/index.mjs)
- Build: npm run build (vite + Nitro node-server + migrate)
- PORT is injected by the platform

### Behavior

- DATABASE_URL set uses pg; unset uses PGLite (local/Grok).
- Uploads under data/ or DATA_DIR.
- Clinic cookies use SESSION_SECRET.
- Skip backup import on first deploy.

### Clicks after GitHub connect

1. New Project
2. Deploy from GitHub - resulkahyaoglu/feyza-kahyaoglu-klinik
3. Branch main (after merge) or feat/railway-deploy to test
4. + New -> Database -> Add PostgreSQL
5. Web service Variables:
   - DATABASE_URL = Postgres service reference
   - VITE_AUTH_ENABLED = false
   - SESSION_SECRET = openssl rand -hex 32
   - APP_URL = https://YOUR-SERVICE.up.railway.app
   - optional DATA_DIR=/data with volume at /data
6. Settings: build npm run build, start npm run start (see railway.toml)
7. Networking -> Generate Domain
8. Deploy Logs: look for [migrate] then Node listening
9. Verify /admin/login, /asistan/giris, /giris -- no backup import yet

### TR

1. New Project -> Deploy from GitHub
2. PostgreSQL ekle
3. Env: DATABASE_URL, VITE_AUTH_ENABLED=false, SESSION_SECRET, APP_URL
4. Domain uret; loglarda migrate + start
5. Istersen volume /data. Yedek import sonra.

### Local / Grok

npm install && npm run dev
(do not set DATABASE_URL in Grok unless you want real Postgres.)
