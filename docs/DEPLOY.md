# Bitboard — Render Deployment Guide

This guide walks through deploying Bitboard to Render Cloud from a fresh account, step by step. The repo already has `render.yaml` at the root declaring both services (Node web service for the API, static site for the frontend), so most of the work is filling in secrets and wiring the two services' URLs back to each other.

---

## Prerequisites

Before starting, confirm:

- [ ] Code is pushed to `origin/main` on GitHub.
- [ ] You have a Render account linked to the GitHub user/org that owns the repo.
- [ ] You have a Supabase project. If not, create one at <https://supabase.com/dashboard> and enable the Email provider (Authentication → Providers → Email → ON).
- [ ] The Supabase project's Postgres database is empty (Prisma will run the init migration on first deploy).

---

## Step 1 — Collect Supabase values

Open the Supabase dashboard for the project. Collect six values before touching Render.

### 1a. API keys and URL
Project Settings → **API**

| Copy this | For env var(s) |
|---|---|
| Project URL (e.g. `https://<ref>.supabase.co`) | `SUPABASE_URL`, `VITE_SUPABASE_URL` |
| **anon** public key (long JWT) | `VITE_SUPABASE_ANON_KEY` |
| **service_role** key (marked "secret — server only") | `SUPABASE_SERVICE_ROLE_KEY` |

The `service_role` key is a secret. Never put it in a frontend env var, never commit it.

### 1b. Database connection strings
Project Settings → **Database** → **Connection string** → **URI** tab.

- **`DATABASE_URL`** (runtime, pooled, port 6543): select **Transaction** pooler mode. Append `?pgbouncer=true&connection_limit=1` if not already present.
  ```
  postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
  ```

- **`DIRECT_URL`** (`prisma migrate deploy` only, unpooled, port 5432): select **Session** mode (or "Direct connection").
  ```
  postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:5432/postgres
  ```

Prisma needs both: pooled for fast runtime queries, direct so the migration advisory lock works (PgBouncer in transaction mode can't hold the session state `prisma migrate deploy` requires).

If the DB password contains special characters (`@`, `#`, `/`, `:`), URL-encode them.

---

## Step 2 — Create the two services manually

Render's Blueprint feature has intermittent issues with the free plan, so create each service by hand. `render.yaml` stays in the repo as reference but isn't used here.

Sign in to <https://dashboard.render.com>.

### 2a. Create the API (Web Service)

1. Top-right **New +** → **Web Service**.
2. **Connect a repository** → select `ludensg/bitboard`. If it's not listed, click **Configure account** and grant Render access first.
3. Fill in the form:

   | Field | Value |
   |---|---|
   | Name | `bitboard-api` |
   | Region | pick closest to your Supabase region (e.g. Oregon if Supabase is `us-west-2`) |
   | Branch | `main` |
   | Root Directory | *(leave blank)* |
   | Runtime | **Node** |
   | Build Command | `npm install && npx prisma generate` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

4. Expand **Advanced**:

   | Field | Value |
   |---|---|
   | Health Check Path | `/api/health` |
   | Pre-Deploy Command | `npx prisma migrate deploy` |
   | Auto-Deploy | **Yes** |

5. Under **Environment Variables**, leave blank for now — you'll fill these in Step 3.
6. Click **Create Web Service**. The first build will fail because env vars aren't set. That's expected.

### 2b. Create the frontend (Static Site)

1. Top-right **New +** → **Static Site**.
2. Select the same `ludensg/bitboard` repo.
3. Fill in the form:

   | Field | Value |
   |---|---|
   | Name | `bitboard-frontend` |
   | Branch | `main` |
   | Root Directory | `frontend` |
   | Build Command | `npm install && npm run build` |
   | Publish Directory | `dist` |

4. After creation, open the service → **Redirects/Rewrites** → **Add Rule**:

   | Source | Destination | Action |
   |---|---|---|
   | `/*` | `/index.html` | **Rewrite** |

   This is required for SPA routing — without it, refreshing `/feed` or `/profile/x` returns 404.

5. Environment variables come in Step 4.
6. First build will fail on missing env vars. Expected.

---

## Step 3 — Fill env vars on `bitboard-api`

Render dashboard → **bitboard-api** service → **Environment** → **Environment Variables**.

`PORT` and `NODE_ENV` come from `render.yaml`. Add:

| Key | Value |
|---|---|
| `DATABASE_URL` | pooled URL from Step 1b |
| `DIRECT_URL` | direct URL from Step 1b |
| `SUPABASE_URL` | Project URL from Step 1a |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT from Step 1a |
| `CORS_ORIGIN` | **leave blank for now** — filled in Step 6 |

Click **Save Changes**. Render redeploys. Watch **Logs** for:

```
Bitboard API running on http://localhost:<port>
```

Once **Status** is "Live", copy the service URL (e.g. `https://bitboard-api.onrender.com`).

### Verify the API

```
curl https://bitboard-api.onrender.com/api/health
```
Expected: `{"ok":true}`.

### Confirm the migration ran

Supabase → **SQL Editor**:
```sql
select table_name from information_schema.tables
where table_schema = 'public' order by 1;
```

Expected tables: `User`, `Post`, `Like`, `Follow`, `Notification`, `ModerationLog`, `_prisma_migrations`. If missing, redeploy from Render → **Manual Deploy → Clear build cache & deploy**.

---

## Step 4 — Fill env vars on `bitboard-frontend`

Render dashboard → **bitboard-frontend** service → **Environment** → **Environment Variables**.

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL from Step 1a |
| `VITE_SUPABASE_ANON_KEY` | anon key from Step 1a |
| `VITE_API_BASE_URL` | API URL from Step 3 (e.g. `https://bitboard-api.onrender.com`) |

Click **Save Changes** — rebuild starts. Vite bakes `VITE_*` values into the static bundle at build time, so any change later requires a manual redeploy to take effect.

Once **Status** is "Live", copy the frontend URL (e.g. `https://bitboard-frontend.onrender.com`).

---

## Step 5 — Configure Supabase Auth redirect URLs

Supabase dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** `https://bitboard-frontend.onrender.com`
- **Redirect URLs** (add each):
  - `https://bitboard-frontend.onrender.com`
  - `https://bitboard-frontend.onrender.com/*`
  - `http://localhost:5173`
  - `http://localhost:5173/*`

Click **Save**.

Password-recovery links land on `/reset-password`, which is covered by the existing `/*` wildcards above — no extra entry required.

### Optional — disable email confirmation for demos

Supabase → **Authentication** → **Providers** → **Email** → turn off **Confirm email**. New users can then use the app immediately without waiting for a confirmation email.

---

## Step 6 — Set `CORS_ORIGIN` on the API

Back to **bitboard-api** → **Environment** → edit `CORS_ORIGIN`:

```
CORS_ORIGIN=https://bitboard-frontend.onrender.com
```

Save. Render redeploys automatically. Both Express CORS (`backend/server.js:20`) and Socket.io CORS (`backend/src/websockets/socketServer.js:8`) read this value.

No trailing slash.

---

## Step 7 — End-to-end smoke test

Open the frontend URL in an incognito window.

| Step | Expected |
|---|---|
| Open `/` | Redirected to `/login` |
| Register (email + username + password) | Redirect to `/feed` |
| Open `/draw`, paint pixels, Post | Post appears on your profile |
| Second incognito window: register user B, follow user A | User A sees a realtime notification |
| User A posts another drawing | User B's `/feed` updates without refresh |
| User B likes the post | User A receives a like notification |
| Toggle theme in Settings | Persists across refresh |

If realtime notifications don't arrive: DevTools → Network → WS filter. Expect a `socket.io/?...transport=websocket` connection with status "101 Switching Protocols". CORS errors → recheck Step 6.

If login fails with "Invalid Refresh Token": recheck Step 5 (the redirect URLs must include the deployed frontend origin).

---

## Step 8 — Promote the first admin

There's no self-serve promotion endpoint; the first admin must be set in the database.

### Option A — Supabase SQL Editor
```sql
update "User" set role = 'ADMIN' where username = 'yourusername';
```

### Option B — Prisma Studio (local)
With `backend/.env` populated:
```
npx prisma studio
```
Edit the row, set `role` to `ADMIN`, save.

If `/admin` returns 403 after promotion, sign out and back in to refresh the client-cached profile.

---

## Step 9 — Ongoing operations

### Redeploys
Any push to `main` triggers both services to rebuild. The API's `preDeployCommand` (`npx prisma migrate deploy`) runs on every API deploy, so new migrations ship themselves.

### Schema changes
1. Locally edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name <short-description>` — creates a new folder under `prisma/migrations/` and applies it locally.
3. Commit the new migration folder.
4. Push to `main`. Render applies it on the next API deploy.

### Logs
Render dashboard → service → **Logs**. API errors surface via `console.error` in `backend/src/middleware/errorHandler.js`.

### Free-tier spin-down
Render free web services sleep after ~15 min idle. The first request after a sleep takes 30–60s. Static sites (the frontend) don't sleep. Upgrade the API to the Starter plan ($7/mo) if that's unacceptable for demos.

### Rotating secrets
If `SUPABASE_SERVICE_ROLE_KEY` leaks:
1. Supabase → Project Settings → API → **Reset service_role secret**.
2. Paste the new key into `bitboard-api`'s env on Render.
3. Save — service redeploys.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails with `P1001 Can't reach database` | Bad `DATABASE_URL` or missing `?pgbouncer=true` | Re-copy from Supabase Transaction mode; URL-encode the password |
| Pre-deploy fails with `P3018 A migration failed` | DB already has conflicting tables | Drop schema in Supabase SQL Editor (`drop schema public cascade; create schema public;`) and redeploy, or baseline with `prisma migrate resolve` |
| Frontend loads, every API call fails with CORS | `CORS_ORIGIN` doesn't exactly match the frontend origin | Copy the frontend URL from Render (no trailing slash) into `CORS_ORIGIN` |
| Login redirects back to `/login` | Supabase redirect URLs missing the frontend origin | Step 5 — add URL and `/*` wildcard |
| Realtime notifications never arrive | Socket.io CORS or wrong `VITE_API_BASE_URL` | Check Network → WS; confirm `VITE_API_BASE_URL` points at the API, not the frontend |
| `/admin` returns 403 for a just-promoted user | Stale client profile | Sign out and back in |
| Queries fail with "PrismaClient is not initialized" | Client not regenerated after schema change | Manual Deploy → Clear build cache & deploy |

---

## Files referenced

| Path | Role |
|---|---|
| `render.yaml` | Blueprint Render reads on first Apply |
| `backend/server.js` | API entry; reads `CORS_ORIGIN`, `PORT` |
| `backend/src/middleware/authenticate.js` | Reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `backend/src/websockets/socketServer.js` | Socket.io auth + CORS |
| `prisma/schema.prisma` | Reads `DATABASE_URL`, `DIRECT_URL` |
| `prisma/migrations/` | Applied by `preDeployCommand` |
| `frontend/src/lib/supabase.js` | Reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `frontend/src/api/apiFetch.js` | Reads `VITE_API_BASE_URL` |
| `frontend/src/hooks/useWebSocket.js` | Reads `VITE_API_BASE_URL` for Socket.io client |
