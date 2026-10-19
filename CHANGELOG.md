# Changelog

## 2.1.0 (2026-10-19)

- **Daily alert** on ntfy or Telegram: today's units, yesterday's health, cleaning advice, grid events, alarms and WiFi stick status. Scheduled with Vercel Cron, protected by `CRON_SECRET`; preview and test from the dashboard
- The Helio logo animates in, breathes while the system is generating, and turns on hover. Same shape; still under reduced motion
- "Use this device's location" now works: the security headers allowed no geolocation at all before
- Narrow phones: the header keeps the plant name readable down to 320 px

## 2.0.0 (2026-10-19)

- **System health:** each day scored against your own best days, adjusted for sunshine from Open-Meteo; cloudy days aren't scored
- **Cleaning advice:** compares recent sunny days with output just after the last heavy rain or a recorded cleaning; *I cleaned them today* button
- **Today's estimate:** expected range for a clean system from the sunshine forecast
- **Inverter and grid:** live status, PV voltage and current, grid voltage and frequency, temperatures; daily grid check against IEC 61727 limits with output-stop and likely-trip detection
- **Alarms** from the last 180 days and **WiFi stick** status, interval and firmware
- **CSV export** (daily up to 366 days, monthly) with labelled units, using the rates shown on screen
- **Automatic location** from the ShineMonitor plant, with `SITE_LAT` / `SITE_LON` or this device's location as alternatives
- Per-kW figures use panels × watts from the datalogger (`SYSTEM_KWP` to override); kWh/kWp column in the daily log
- New settings: `SITE_LAT`, `SITE_LON`, `SYSTEM_KWP`, `GRID_VOLTAGE`, `GRID_FREQUENCY`, `WEATHER`
- Animated 404 page
- Fixed: dates could shift by a day for plants far west of India; "last reading" age used India's offset for every time zone; the power chart now fits long summer days

## 1.1.0 (2026-10-18)

- Edit your electricity rates and currency from the dashboard (What it's worth → Edit rates). Saved per browser, with reset to the env defaults
- Lifetime card uses a neutral icon instead of the rupee sign
- Security: CodeQL, Gitleaks, OpenSSF Scorecard, Dependabot and dependency review; CI fails on vulnerable dependencies; actions pinned to commits
- Fixed: nested PostCSS in Next.js pinned to a patched version (GHSA-qx2v-qp2m-jg93 and related)

## 1.0.0 (2026-10-18)

First public release.

- Exact daily and lifetime units from the inverter's own counters via ShineMonitor
- Live power with capacity share and status
- Day explorer with 5-minute power curve, peak and producing hours
- 30-day and yearly history, clickable daily log
- Value in any currency with separate self-use and export rates
- Password login with signed `httpOnly` sessions, security headers, `no-store` data
- Public `/demo` with sample data
- Automatic plant discovery (website and API plant ids can differ)
- Light and dark themes, built for phones
