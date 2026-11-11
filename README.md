# EatInVietnam

Curated restaurant discovery web app / PWA — Vietnam-wide brand, starting with Ho Chi Minh City (Q1, Q3, Q4).

> Ăn ngon, đúng chất Việt — bắt đầu từ Sài Gòn.

## Stack

| Layer | Choice |
|---|---|
| Hosting | Hostinger Cloud Startup (managed Node.js), auto-deploy from GitHub |
| Framework | Next.js App Router + TypeScript (strict) |
| UI | Tailwind CSS, mobile-first, tokens from the EatInVietnam Design System v2 |
| DB | MySQL 8 + Drizzle ORM |
| Map | Mapbox GL JS, lazy-loaded on `/ban-do` only |
| Images | Cloudflare R2 + Cloudflare CDN (pre-resized WebP) |
| NL search | Claude Haiku 5.5 (server only, structured output validated by Zod) |
| Tests | Vitest, Playwright, NL parser eval |

## Branches

- `main` → production (auto-deploy)
- `develop` → staging (auto-deploy, separate DB and R2 bucket)
- `feat/<issue>-<slug>`, `fix/<issue>-<slug>` → PR into `develop`

No direct pushes to `main` or `develop`. Every PR needs a linked issue and green CI (`lint`, `typecheck`, `test`, `build`). Commits follow Conventional Commits.

## Getting started

Requires Node 22 (same major as Hostinger; see `engines`).

```bash
cp .env.example .env.local   # fill what you need; all keys are optional for the UI demo
npm install
npm run dev                  # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run lint` / `typecheck` / `test` / `build` | Same four checks CI requires |
| `npm run test:e2e` | Playwright e2e (main flow) |
| `npm run screenshots` | Full-page 360px / 390px screenshots of main routes into `screenshots/` (needs a running server) |

CI uploads the screenshots and the resolved `package-lock.json` as workflow artifacts on every PR.

### Where restaurants come from

Pages read restaurants through `src/lib/restaurants.ts`, which picks a source (`src/lib/data/`):

- **Database** (`data/db.ts`) whenever `DATABASE_URL` is set. Filters, distance sort/radius and
  "đang mở" run in SQL; only the current page of restaurants is loaded in full. Only `verified`
  restaurants are ever returned.
- **Demo list** (`data/demo.ts`, `src/data/demo-restaurants.ts`) when `DATABASE_URL` is empty, or when
  `DATA_SOURCE=demo` (stopgap if the DB breaks). `/api/health` reports `db.dataSource`.

Both follow the same rules; `npm run db:parity` (CI, MariaDB + MySQL) compares them on a matrix of
filters × locations × times. Data pages are never built at `next build` time: they render on the
first request and ISR caches them for an hour (admin saves will call `revalidatePath`, #8).
Client components import card shapes from `src/lib/cards.ts`, never from `lib/restaurants`.

### Admin (`/admin`, #8)

One account per person (decision #7): roles **editor** (only restaurants in their areas) and
**admin** (everything + user management). Every change is written to `audit_log` and shown on the
restaurant's edit page. Code: `src/lib/admin/`, `app/admin/`, `app/api/admin/`.

- **First admins.** Set `ADMIN_BOOTSTRAP_EMAILS` (comma-separated) and `ADMIN_SETUP_CODE`
  (≥ 12 chars, given in person) in hPanel. Each listed email registers once at `/admin/thiet-lap`.
  Everyone else is invited from **Người dùng**: the admin gets a one-time link (also emailed when
  SMTP is set). Lost password → the admin creates a reset link there.
- **2FA (TOTP).** Required unless `REQUIRE_ADMIN_2FA=0` (staging). Needs `ADMIN_SECRET_KEY`
  (≥ 32 chars, encrypts the secrets; changing it means everyone re-enrols).
- **Security.** Sessions are server-side (`sessions`, 12 h, cookie holds a random token, DB its
  SHA-256). Mutating `/api/admin` calls need the header `x-eiv-admin: 1` (CSRF). Login is
  rate-limited per email and per client; disabling an account ends its sessions immediately.
- **Restaurants.** New ones start as draft. "Xác minh & đăng" records the method, the person and
  the 90-day deadline; only `verified` is public. Saves revalidate the public pages (ISR).
  The slug freezes after the first verification.
- **Photos.** Upload → `sharp` decodes (no trust in Content-Type), rotates, strips all metadata
  (EXIF/GPS), writes WebP 480/960/1440 to R2 under `restaurants/<id>/<uuid>-<w>.webp`. Deleting a
  photo deletes every size. Without `R2_*` the admin works but upload is disabled.
- **Reminders (decision A).** `/admin/sap-qua-han` lists overdue + due within 14 days; the daily
  cron `/api/cron/reverify` emails each editor their areas on Mondays (Saigon), once per week.

- **Importing the ops sheet (#48).** `npm run db:import -- <file.xlsx> --as <admin email>` reads
  sheet "Quán" of the template and prints what it would do (works without `DATABASE_URL`, minus the
  duplicate check); add `--apply` to write. A CSV report per row (what is still missing to verify,
  warnings) is written next to the file. Rows become **draft** (complete + verified in the file →
  **pending**), never verified. Re-running skips restaurants that already exist (same
  ShopeeFood/GrabFood link, or same name + address). Missing coordinates get a placeholder pin and
  ShopeeFood menus land in the group "Cần kiểm tra (từ ShopeeFood)"; both block "Xác minh" until an
  editor fixes them (`src/lib/admin/placeholders.ts`). The row's internal note is in the
  restaurant's history. Run it from a machine whitelisted in Remote MySQL, staging first.

CI (`db`, MariaDB) runs `scripts/admin-e2e.mjs` against the built server with a fake S3
(`scripts/fake-s3.mjs`) and publishes admin screenshots to `ci/admin-screenshots-pr-<n>`.

### Hostinger (hPanel)

- Node version: 22
- Build command: `npm run build` (webpack; Turbopack panicked on Hostinger's build machine, dev still uses Turbopack)
- Start command: `npm start`
- Env vars: everything in `.env.example`
- Database: MariaDB 11.8 on `127.0.0.1:3306` (only reachable from the server). Staging sets
  `MIGRATE_ON_START=1` and `SEED_DEMO_IF_EMPTY=1` so pending migrations (and, on an empty DB, the
  demo data) are applied when the app starts — see `src/db/boot.ts`. While the DB holds only demo
  restaurants, the same flag also fills in demo fields added later (photos, features, amenities). Look for `[db]` lines in the
  runtime log after each deploy. Production leaves both unset.
- Admin env: `ADMIN_BOOTSTRAP_EMAILS`, `ADMIN_SETUP_CODE`, `ADMIN_SECRET_KEY`, `REQUIRE_ADMIN_2FA=0` (staging), `R2_*`, `SMTP_*`.
- Cron (hPanel → Advanced → Cron Jobs), daily:
  `curl -fsS -H "x-cron-secret: $CRON_SECRET" https://<domain>/api/cron/reverify`
