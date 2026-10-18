# Changelog

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
