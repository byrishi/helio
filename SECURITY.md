# Security policy

Please **do not** open a public issue for security problems. Report them privately through
[GitHub private vulnerability reporting](https://github.com/byrishi/helio/security/advisories/new).
You'll get a reply within a few days. Full details: [docs/security.md](docs/security.md).

## What Helio protects
- Every page and data API requires a signed session cookie (HMAC-SHA256, `httpOnly`, `Secure`, `SameSite=Lax`, 30 days).
- Data APIs re-check the session in addition to middleware.
- `SHINE_PASS`, `DASH_PASSWORD` and `AUTH_SECRET` are server-only and never shipped to the browser.
- Security headers: `X-Frame-Options: DENY`, `nosniff`, HSTS, strict referrer policy, `Permissions-Policy`; `noindex` on private dashboards.
- Data responses use `Cache-Control: no-store`.

## Known limits
- Login lockout (5 tries / 15 min per IP) is in-memory, so it isn't shared across serverless instances. Use a strong `DASH_PASSWORD`.
- A single shared dashboard login; no per-user accounts.
