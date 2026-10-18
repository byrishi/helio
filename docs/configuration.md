# Configuration

Everything is set with environment variables. On Vercel: **Project → Settings → Environment Variables**. After changing anything, **redeploy** (Deployments → ⋯ → Redeploy). Variables are read at build and start time.

## Required

| Variable | What it is | Example |
|---|---|---|
| `SHINE_USER` | ShineMonitor / SmartClient username, exactly as you log in (case-sensitive) | `MyName123` |
| `SHINE_PASS` | ShineMonitor password. Server-only | |
| `DASH_USER` | Username for your Helio dashboard. Case-insensitive | `family` |
| `DASH_PASSWORD` | Password for your Helio dashboard. 12+ characters, different from `SHINE_PASS` | |
| `AUTH_SECRET` | Random text that signs sessions. Changing it signs everyone out | `openssl rand -hex 32` |
| `TARIFF` | What you pay the grid per unit (kWh) | `7.5` |

## Optional

| Variable | Default | What it does |
|---|---|---|
| `EXPORT_TARIFF` | `0` | What the grid pays per exported unit. When set, values show as a range. See [Accuracy and savings](accuracy-and-savings.md) |
| `CURRENCY` | `₹` | Currency symbol, e.g. `$`, `€`, `£` |
| `LOCALE` | `en-IN` | Number and date formatting, e.g. `en-US`, `de-DE` |
| `TIMEZONE` | `Asia/Kolkata` | IANA timezone of your plant, e.g. `Europe/Berlin` |
| `SHINE_PLANT_ID` | first plant | Only for accounts with several plants: the **API** plant id to show |
| `NEXT_PUBLIC_BRAND_NAME` | `Rishi Shah` | Name in the footer credit |
| `NEXT_PUBLIC_BRAND_URL` | `https://rishishah.in` | Link for the footer credit |
| `NEXT_PUBLIC_PROJECT_URL` | `https://helio.rishishah.in` | "About Helio" link on the demo page |
| `NEXT_PUBLIC_REPO_URL` | `https://github.com/byrishi/helio` | GitHub links in the app |

### Changing rates without redeploying

`TARIFF`, `EXPORT_TARIFF` and `CURRENCY` are the defaults. Anyone signed in can override them from **What it's worth → Edit rates** on the dashboard. That choice is saved in their browser only, so each phone can use its own rates, and **Reset** goes back to the defaults.

## Advanced

Only change these if ShineMonitor changes something or your account lives on a vendor-specific portal.

| Variable | Default | Notes |
|---|---|---|
| `SHINE_BASE_URL` | `https://web.shinemonitor.com/public/` | API endpoint |
| `SHINE_COMPANY_KEY` | ShineMonitor web portal key | Vendor portals may use their own |
| `SHINE_SUFFIX` | empty | Extra query parameters on every request. **Never add `source=1`**, which targets the battery-storage platform and returns `ERR_NOT_FOUND_USR` for solar accounts |

## Example `.env.local`

```bash
SHINE_USER=MyName123
SHINE_PASS=••••••••
DASH_USER=family
DASH_PASSWORD=••••••••••••
AUTH_SECRET=3f9c…
TARIFF=7.5
EXPORT_TARIFF=2.25
CURRENCY=₹
TIMEZONE=Asia/Kolkata
```

## Custom domain

1. Vercel → **Project → Settings → Domains** → add e.g. `solar.yourdomain.com`.
2. At your domain provider, add the record Vercel shows (usually a `CNAME` to `cname.vercel-dns.com`).
3. HTTPS is issued automatically within a few minutes.

## Share with family

- Send the link and the `DASH_USER` / `DASH_PASSWORD` privately, never in a group.
- **iPhone:** Safari → Share → *Add to Home Screen*. **Android:** Chrome → ⋮ → *Add to Home screen*.
- Sign-in lasts 30 days per device. To sign everyone out, change `AUTH_SECRET` and redeploy.

## Updating

One-click deploys create a **copy** of the repo, so updates aren't automatic:

```bash
git clone https://github.com/<you>/helio.git && cd helio
git remote add upstream https://github.com/byrishi/helio.git
git pull upstream main
git push              # Vercel redeploys on push
```

Watch the repo (**Watch → Custom → Releases**) to hear about new versions.
