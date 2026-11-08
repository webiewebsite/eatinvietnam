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

### Hostinger (hPanel)

- Node version: 22
- Build command: `npm run build` (webpack; Turbopack panicked on Hostinger's build machine, dev still uses Turbopack)
- Start command: `npm start`
- Env vars: everything in `.env.example`
