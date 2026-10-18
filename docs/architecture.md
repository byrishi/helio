# Architecture

```
Inverter ──RS485──▶ Eybond WiFi stick ──WiFi──▶ ShineMonitor cloud
                                                     ▲
                                  signed HTTPS, your login, server-side
                                                     │
Browser ──HTTPS + session cookie──▶ Helio (Next.js, your Vercel project)
```

- **No central server.** Each person deploys their own copy, and it talks to ShineMonitor with their own login.
- **No database.** Every number is fetched on demand and cached in memory for 60 seconds per server instance.
- **ShineMonitor signing** follows their [documented scheme](https://api.shinemonitor.com): log in with `sign = SHA1(salt + SHA1(password) + action)`, then sign each request with `SHA1(salt + secret + token + action)`. Tokens are cached and refreshed automatically.
- **Plant discovery.** Helio asks ShineMonitor for the account's plants (`queryPlants`) rather than trusting a configured id, because the id shown on shinemonitor.com can differ from the API id.

### ShineMonitor calls used

`auth`, `queryPlants`, `queryPlantInfo`, `queryPlantActiveOuputPowerCurrent`, `queryPlantEnergyDay`, `queryPlantEnergyTotal`, `queryPlantEnergyMonthPerDay`, `queryPlantEnergyYearPerMonth`, `queryPlantActiveOuputPowerOneDay`.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · UI primitives from [Watermelon UI](https://ui.watermelon.sh) (shadcn/ui) · Recharts · Geist.

## Project structure

```
app/
  page.tsx                dashboard
  demo/page.tsx           public demo with sample data
  login/page.tsx          sign-in
  api/solar/…             live data (session required)
  api/demo/…              sample data (public)
  api/auth/…              login / logout
components/
  dashboard.tsx           the dashboard (live and demo)
  charts.tsx              power curve, bar charts, sparkline
  brand.tsx               logo and footer credit
  ui/…                    Watermelon UI / shadcn primitives
lib/
  shinemonitor.ts         ShineMonitor client, data shaping, sample data
  auth.ts                 signed sessions
  guard.ts                per-route session check
  config.ts               every environment-driven setting
  links.ts                project / repo links
middleware.ts             route protection
scripts/test-login.mjs    check ShineMonitor credentials from a terminal
docs/                     these docs
```

## Local development

```bash
git clone https://github.com/byrishi/helio.git && cd helio
npm install
npm run dev                  # http://localhost:3000/demo works with no setup
cp .env.example .env.local   # fill in to use your real data
npm run test:login           # checks your ShineMonitor login
npm run build                # type-checks and builds
```
