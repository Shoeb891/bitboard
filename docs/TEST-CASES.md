# Bitboard — Automated Test Cases

This walks through how to run Bitboard's automated test suite locally. The suite covers **5 of the 46** documented test cases from `docs/UML_and_RTM/Bitboard_RTM.xlsx` — one per major non-optional component (UAS, DCS, FS, PS, AMS). Notifications and the two optional modules (cooperative animation, mini-games) are deliberately left out; WebSocket delivery and the optional modules don't give enough return-on-effort to automate for this milestone.

All five tests are backend API integration tests: Jest + Supertest hit the Express app directly, and Prisma reads/writes against a Dockerised Postgres. Supabase auth is mocked at the middleware level, so the suite is fully offline — no Supabase project, no network, no real JWTs.

---

## Prerequisites

You'll need Node.js 18+ and Docker Desktop installed and running. Everything else is handled by `npm install`. The test DB lives in a container on port `15432` so it can't clash with any Postgres you already have on `5432`.

The suite doesn't touch your Supabase project or your local `.env` — it uses `backend/.env.test`, which points at the local container.

---

## Step 1 — Start the test database

From the repo root:

```
docker compose -f docker-compose.test.yml up -d
```

First run pulls the `postgres:16` image (one-time, ~150 MB). Subsequent runs are instant. The container is named `bitboard-postgres-test` and persists in a named volume, so stopping and starting again keeps whatever was last in it — the test suite truncates tables between runs anyway, so state between runs doesn't matter.

Quick check it's up:

```
docker ps --filter name=bitboard-postgres-test
```

Status should read `Up … (healthy)` within a few seconds.

---

## Step 2 — Install backend dependencies (one-time)

```
cd backend
npm install
```

This pulls the test-only devDependencies alongside the usual runtime ones:

| Package | Why it's needed |
|---|---|
| `jest` | test runner |
| `supertest` | sends HTTP requests straight to the Express app (no network port) |
| `cross-env` | sets `NODE_ENV=test` in a Windows-friendly way |
| `dotenv-cli` | loads `.env.test` for the test run without polluting `.env` |

If Jest later complains that `@prisma/client did not initialize yet`, force the fallback once:

```
rm -rf node_modules/@prisma/client node_modules/.prisma
cd .. && npx prisma generate
```

This happens because both the root `package.json` and `backend/package.json` list `@prisma/client`; Prisma generates into whichever copy is nearest the schema, and Node's module resolution has to find the generated one. Removing the backend-local copy lets Node walk up to the root one, which is the copy that actually gets generated.

---

## Step 3 — Run the suite

```
cd backend
npm test
```

That's it. Behind the scenes `npm test` runs:

```
cross-env NODE_ENV=test dotenv -e .env.test -- jest --runInBand
```

…which loads `backend/.env.test`, points Prisma at the local container, applies any pending migrations via `prisma migrate deploy`, and runs every `tests/*.test.js` file serially (`--runInBand` — one DB, no parallel-write races).

The whole thing finishes in about 1.5 seconds after the first migrate.

---

## Step 4 — What you should see

```
> bitboard-backend@1.0.0 test
> cross-env NODE_ENV=test dotenv -e .env.test -- jest --runInBand

Prisma schema loaded from ..\prisma\schema.prisma
Datasource "db": PostgreSQL database "bitboard_test" … at "localhost:15432"
5 migrations found in prisma/migrations
No pending migrations to apply.

PASS tests/uas.test.js
  TC-UAS1.11 — auth enforced on protected endpoints
    √ POST /api/posts without JWT returns 401 and creates no post
    √ POST /api/posts/:id/like without JWT returns 401 and creates no like

PASS tests/dcs.test.js
  TC-DCS1.4 — drawings stored as bitmap data
    √ POST /api/posts persists pixels as a flat array with width, height, palette

PASS tests/fs.test.js
  TC-FS1.1 — like a post from the feed
    √ POST /api/posts/:id/like creates a Like row and returns likes=1

PASS tests/ps.test.js
  TC-PS1.1 — publish drawing appears on profile
    √ POST /api/posts then GET /api/posts/user/:id lists the new post

PASS tests/ams.test.js
  TC-AMS1.0 — admin flagged posts filter
    √ GET /api/admin/posts?flagged=true returns only flagged posts to admins
    √ non-admin cannot access /api/admin/posts

Test Suites: 5 passed, 5 total
Tests:       7 passed, 7 total
```

If you see `No pending migrations to apply.` on the first run you're good — that line is how Prisma tells you the test DB's schema is in sync with `prisma/schema.prisma`. On a fresh Docker volume it'll instead print each migration as it applies.

---

## What each test covers

| TC-ID | Component | What it verifies |
|---|---|---|
| **TC-UAS1.11** | User Account System | `POST /api/posts` and `POST /api/posts/:id/like` both return 401 when called without an `Authorization` header. No rows are written. |
| **TC-DCS1.4** | Drawing Canvas System | A published post persists `pixels` as a flat row-major `Int[]` of length `width × height`, along with `width`, `height`, and a `palette` of hex strings. |
| **TC-FS1.1** | Feed System | Liking a post creates exactly one `Like` row for the viewer, and the endpoint returns `{ liked: true, likes: 1 }`. |
| **TC-PS1.1** | Profile System | A post created via `POST /api/posts` appears in the author's own profile feed at `GET /api/posts/user/:userId`, with matching id and caption. |
| **TC-AMS1.0** | Admin Moderation | `GET /api/admin/posts?flagged=true` returns only flagged posts when called by an admin. A regular user calling `GET /api/admin/posts` gets 403. |

Each `describe` block is titled with its TC-ID so the terminal output lines up directly with the RTM rows.

---

## How the suite is wired

A few things that aren't obvious from the file names:

* **`backend/app.js` vs `backend/server.js`.** The Express app is defined in `app.js` and exported without calling `listen`. `server.js` imports the app, wires Socket.io on top, and starts the HTTP server. This split exists so Supertest can hold the app as a plain JS object and never open a real port — production behavior through `node server.js` is unchanged.

* **Mocked auth.** `tests/setup.js` replaces `src/middleware/authenticate` with a stub that reads `x-test-user-id` from the request headers and sets `req.userId`. A missing header produces 401, which is exactly what TC-UAS1.11 needs to see. No real Supabase JWTs are ever signed or verified during tests.

* **Fixtures.** `tests/fixtures.js` defines three fixed-UUID users — `alice`, `bob`, and `admin` (role `ADMIN`). `tests/helpers.js` exposes `resetDb()`, which truncates every table and reseeds those three before each suite, plus `asUser('alice')` / `asGuest()` Supertest wrappers.

* **Test database.** `tests/globalSetup.js` runs once before Jest boots any workers: it loads `.env.test`, then shells out to `npx prisma migrate deploy --schema=../prisma/schema.prisma`. After that, each `*.test.js` file opens the same Prisma client (pointed at `bitboard_test` by the env) and wipes/seeds as needed.

* **Fan-out is silenced.** `tests/setup.js` also mocks `src/websockets/socketServer` so the fire-and-forget `emitToUser` calls in the routes don't try to open real sockets during tests.

---

## Running a single suite

Useful for demos or when you're iterating on one test:

```
cd backend
npx jest tests/fs.test.js
```

Or any individual TC file. Jest respects the same `NODE_ENV=test` and `.env.test` if you keep the wrapper:

```
npm test -- tests/fs.test.js
```

---

## Cleaning up

When you're done, either leave the container running (it's harmless at rest — ~20 MB of RAM idle) or shut it down:

```
docker compose -f docker-compose.test.yml down
```

Add `-v` to also drop the volume and start completely fresh next time:

```
docker compose -f docker-compose.test.yml down -v
```

The next `npm test` will re-apply every migration to the empty DB, which takes a couple of extra seconds.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `bind: An attempt was made to access a socket in a way forbidden by its access permissions.` | Windows has port 15432 reserved in an excluded range | Edit `docker-compose.test.yml` and `backend/.env.test`, swap 15432 for something else (e.g. 25432), bring the container back up |
| `@prisma/client did not initialize yet` | Backend's local `@prisma/client` is a stub — Prisma generated into the root `node_modules` copy instead | `rm -rf backend/node_modules/@prisma/client backend/node_modules/.prisma` then `npx prisma generate` from repo root |
| `Could not find Prisma Schema` during `globalSetup` | Prisma CLI looked for `./prisma/schema.prisma` relative to `backend/`, which doesn't exist | Check `tests/globalSetup.js` — the `--schema=` flag must point at `../prisma/schema.prisma` |
| Tests hang on the first run, then fail with `ECONNREFUSED 127.0.0.1:15432` | Postgres container not healthy yet | `docker ps` — wait until health column shows `(healthy)`, or `docker logs bitboard-postgres-test` to see what's wrong |
| `console.error: notify error: … Response from the Engine was empty` printed between passing tests | The like route fires a `setImmediate` notify that hits Prisma after the test's `afterAll` has already disconnected | Cosmetic only; the tests still pass. The FS suite already adds a short settle delay before `$disconnect` to avoid it |
| Suite runs against Supabase instead of the container | `backend/.env` shadowed `backend/.env.test` somewhere | Confirm `npm test` uses `dotenv -e .env.test`; the header line of the Jest output should print `localhost:15432` as the datasource |
| `Unknown option "setupFilesAfterEach"` warning | Typo in an older `jest.config.js` | The correct key is `setupFiles` — should already be fixed in the repo |

---

## Where to go from here

The harness is deliberately small — five tests, one file per component, ~30 lines each — but the scaffolding (`app.js` split, mocked auth, fixtures, Docker Postgres) will happily carry more. Natural next steps if you want to grow it:

* A second case in each component (e.g. TC-UAS1.4 follow/unfollow, TC-FS1.3 hashtag filtering, TC-PS1.6 can-only-delete-own-posts).
* A minimal NS suite that asserts the DB-side notification row rather than the WebSocket delivery (cheap, skips the realtime part).
* A GitHub Actions workflow that runs `docker compose up -d` + `npm test` on every PR. The whole suite finishes in under two seconds, so it won't slow anything down.
