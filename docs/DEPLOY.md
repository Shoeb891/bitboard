# Bitboard — Render Deployment Guide

This walks through deploying Bitboard on Render from scratch. The repo already has a `render.yaml` at the root describing both services — the API and the static frontend — but we create them in the dashboard by hand because Render's Blueprint flow has been flaky on the free plan. Most of the work is filling in secrets and pointing the two services at each other.

---

## Prerequisites

You'll need a Render account linked to the GitHub user or org that owns the repo, a Supabase project with the Email provider turned on (Authentication → Providers → Email → ON), and the code pushed to `origin/main`. The Supabase Postgres database should be empty — Prisma will run the initial migration on the first deploy.

---

## Step 1 — Collect Supabase values

Open the Supabase dashboard for your project. Six values need to be grabbed before you touch Render.

### 1a. API keys and URL

Project Settings → **API**. Copy:

* The Project URL (e.g. `https://<ref>.supabase.co`) — used for both `SUPABASE_URL` and `VITE_SUPABASE_URL`
* The **anon** public key (a long JWT) — used for `VITE_SUPABASE_ANON_KEY`
* The **service_role** key (marked "secret — server only") — used for `SUPABASE_SERVICE_ROLE_KEY`

The `service_role` key is a secret. Don't put it in any frontend env var, don't commit it.

### 1b. Database connection strings

Project Settings → **Database** → **Connection string** → **URI** tab. You need two different connection strings:

* `DATABASE_URL` — runtime queries. Pick **Transaction** pooler mode (port 6543) and append `?pgbouncer=true&connection_limit=1` if it isn't already there:
  ```
  postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
  ```

* `DIRECT_URL` — migrations only. Pick **Session** mode (or "Direct connection"), port 5432:
  ```
  postgresql://postgres.<project-ref>:<db-password>@<region>.pooler.supabase.com:5432/postgres
  ```

Prisma needs both: one for regular queries, one for running migrations. If the DB password contains special characters (`@`, `#`, `/`, `:`), URL-encode them.

---

## Step 2 — Create the two services

Sign in to <https://dashboard.render.com>. We're creating the API and the frontend as separate services.

### 2a. Create the API (Web Service)

Top-right **New +** → **Web Service**. Connect the `ludensg/bitboard` repo (click **Configure account** first if it's not listed), then fill in:

| Field | Value |
|---|---|
| Name | `bitboard-api` |
| Region | pick one close to your Supabase region (e.g. Oregon if Supabase is `us-west-2`) |
| Branch | `main` |
| Root Directory | *(leave blank)* |
| Runtime | Node |
| Build Command | `npm install && npx prisma generate` |
| Start Command | `npm start` |
| Instance Type | Free |

Expand **Advanced** and set:

| Field | Value |
|---|---|
| Health Check Path | `/api/health` |
| Pre-Deploy Command | `npx prisma migrate deploy` |
| Auto-Deploy | Yes |

Leave environment variables blank for now — those come in Step 3. Click **Create Web Service**. The first build will fail because the env vars aren't set yet. That's expected.

### 2b. Create the frontend (Static Site)

Top-right **New +** → **Static Site**. Pick the same `ludensg/bitboard` repo, then:

| Field | Value |
|---|---|
| Name | `bitboard-frontend` |
| Branch | `main` |
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |

After it's created, open the service → **Redirects/Rewrites** → **Add Rule**:

| Source | Destination | Action |
|---|---|---|
| `/*` | `/index.html` | Rewrite |

This is needed for SPA routing — without it, refreshing `/feed` or `/profile/x` returns a 404.

Env vars come in Step 4. The first build will fail — also expected.

---

## Step 3 — Fill env vars on `bitboard-api`

Render dashboard → `bitboard-api` → **Environment** → **Environment Variables**. `PORT` and `NODE_ENV` already come from `render.yaml`, so you just need to add:

* `DATABASE_URL` — the pooled URL from Step 1b
* `DIRECT_URL` — the direct URL from Step 1b
* `SUPABASE_URL` — the Project URL from Step 1a
* `SUPABASE_SERVICE_ROLE_KEY` — the service_role JWT from Step 1a
* `CORS_ORIGIN` — leave blank for now; filled in at Step 6

Click **Save Changes**. Render redeploys. In the **Logs** tab you should see:

```
Bitboard API running on http://localhost:<port>
```

Once the status is Live, copy the service URL (e.g. `https://bitboard-api.onrender.com`).

Quick check that it's up:

```
curl https://bitboard-api.onrender.com/api/health
```

Expected: `{"ok":true}`.

Then confirm the migration ran. In Supabase → **SQL Editor**:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by 1;
```

You should see `User`, `Post`, `Like`, `Follow`, `Notification`, `ModerationLog`, and `_prisma_migrations`. If anything's missing, go to Render → **Manual Deploy → Clear build cache & deploy**.

---

## Step 4 — Fill env vars on `bitboard-frontend`

Render dashboard → `bitboard-frontend` → **Environment** → **Environment Variables**:

* `VITE_SUPABASE_URL` — the Project URL from Step 1a
* `VITE_SUPABASE_ANON_KEY` — the anon key from Step 1a
* `VITE_API_BASE_URL` — the API URL from Step 3 (e.g. `https://bitboard-api.onrender.com`)

Click **Save Changes** — a rebuild starts. Vite bakes `VITE_*` values into the bundle at build time, so if you change any of them later you need to redeploy for it to take effect.

Once it's Live, copy the frontend URL (e.g. `https://bitboard-frontend.onrender.com`).

---

## Step 5 — Configure Supabase Auth redirect URLs

Supabase dashboard → **Authentication** → **URL Configuration**:

* Site URL: `https://bitboard-frontend.onrender.com`
* Redirect URLs — add each of these:
  * `https://bitboard-frontend.onrender.com`
  * `https://bitboard-frontend.onrender.com/*`
  * `http://localhost:5173`
  * `http://localhost:5173/*`

Click **Save**. Password-reset emails bounce through `/auth/confirm` before landing on `/reset-password`; both are covered by the `/*` wildcards above, so no extra entries needed.

If you're spinning this up for a demo and don't want to wait on confirmation emails, go to **Authentication** → **Providers** → **Email** and turn off **Confirm email** — new users can then sign in immediately.

---

## Step 6 — Set `CORS_ORIGIN` on the API

Back to `bitboard-api` → **Environment** → edit `CORS_ORIGIN`:

```
CORS_ORIGIN=https://bitboard-frontend.onrender.com
```

No trailing slash. Save — Render redeploys. Both the Express API and the Socket.io server read this value, so once it's set, both sides of the frontend ↔ backend conversation are allowed through.

---

## Step 7 — End-to-end smoke test

Open the frontend URL in an incognito window and walk through:

| Step | Expected |
|---|---|
| Open `/` | Redirects to `/login` |
| Register (email + username + password) | Lands on `/feed` |
| Open `/draw`, paint pixels, Post | Post appears on your profile |
| Second incognito window: register user B, follow user A | User A sees a realtime notification |
| User A posts another drawing | User B's `/feed` updates without a refresh |
| User B likes the post | User A receives a like notification |
| Toggle theme in Settings | Persists across refresh |

If realtime notifications never show up: DevTools → Network → WS filter. You should see a `socket.io/?...transport=websocket` connection with status `101 Switching Protocols`. If there are CORS errors, recheck Step 6.

If login fails with "Invalid Refresh Token", recheck Step 5 — the redirect URLs must include the deployed frontend origin.

---

## Step 8 — Promote the first admin

There's no self-serve promotion endpoint, so the first admin has to be set directly in the database.

The quickest way is Supabase → **SQL Editor**:

```sql
update "User" set role = 'ADMIN' where username = 'yourusername';
```

Or if you'd rather use Prisma Studio locally, populate `backend/.env` and run `npx prisma studio`, then edit the row and set `role` to `ADMIN`.

If `/admin` returns 403 after promotion, sign out and back in — the client caches the profile.

---

## Step 9 — Ongoing operations

### Redeploys
Any push to `main` rebuilds both services. The API's pre-deploy command runs `npx prisma migrate deploy` on every deploy, so new migrations ship themselves.

### Schema changes
Edit `prisma/schema.prisma` locally, run `npx prisma migrate dev --name <short-description>` to generate and apply a new migration folder, commit it, and push. Render applies it on the next API deploy.

### Logs
Render dashboard → service → **Logs**. API errors bubble up through the error-handler middleware as `console.error` lines.

### Free-tier spin-down
Free web services on Render sleep after about 15 minutes idle, and the first request after a sleep takes 30–60 seconds to wake them up. Static sites (the frontend) don't sleep. Upgrading the API to the Starter plan ($7/mo) removes the spin-down if that's a problem for demos.

### Rotating secrets
If `SUPABASE_SERVICE_ROLE_KEY` leaks, reset it in Supabase (Project Settings → API → **Reset service_role secret**), paste the new key into `bitboard-api`'s env on Render, and save. The service redeploys with the new key.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Build fails — can't reach database | Bad `DATABASE_URL` or missing `?pgbouncer=true` | Re-copy from Supabase Transaction mode; URL-encode the password |
| Pre-deploy fails on migration | DB already has conflicting tables | Drop schema in Supabase SQL Editor (`drop schema public cascade; create schema public;`) and redeploy |
| Frontend loads but every API call errors with CORS | `CORS_ORIGIN` doesn't exactly match the frontend origin | Copy the frontend URL from Render, no trailing slash, into `CORS_ORIGIN` |
| Login bounces back to `/login` | Supabase redirect URLs missing the frontend origin | Step 5 — add the URL and its `/*` wildcard |
| Realtime notifications never arrive | Socket.io CORS or wrong `VITE_API_BASE_URL` | Check Network → WS; confirm `VITE_API_BASE_URL` points at the API, not the frontend |
| `/admin` returns 403 for a just-promoted user | Stale client profile | Sign out and back in |
| Password reset link shows "Not Found" | Missing SPA rewrite rule | Confirm the `/* → /index.html` rewrite from Step 2b exists |
| Queries fail with "PrismaClient is not initialized" | Client not regenerated after a schema change | Manual Deploy → Clear build cache & deploy |
