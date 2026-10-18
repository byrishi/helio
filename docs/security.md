# Security

## What's protected

- **Every page and data API needs a session.** Without one, pages redirect to `/login` and APIs return `401`. Only `/demo` and `/api/demo` (sample data) are public.
- **Defence in depth.** Middleware checks the session, and each data API checks it again on its own.
- **Signed session cookie.** `user.expiry.HMAC-SHA256(AUTH_SECRET)`; `httpOnly` (scripts can't read it), `Secure`, `SameSite=Lax`, 30-day expiry. Forged or edited cookies fail verification.
- **Constant-time comparisons** for passwords and signatures.
- **Secrets stay on the server.** `SHINE_USER`, `SHINE_PASS`, `DASH_PASSWORD` and `AUTH_SECRET` are only read server-side; none of them appear in any JavaScript sent to the browser. Only `NEXT_PUBLIC_*` values (branding and links) are public.
- **Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS (2 years, preload), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic, location, payment off), CSP `frame-ancestors 'none'`, `X-Robots-Tag: noindex`.
- **No caching of your data:** data responses send `Cache-Control: private, no-store`.
- **Up-to-date framework:** Next.js 15.5+, which includes the fix for the middleware bypass CVE-2025-29927.
- **No database, no third parties.** Helio only talks to ShineMonitor. No analytics, no trackers.

## Known gaps

| Gap | Impact | Mitigation |
|---|---|---|
| Lockout counter is per server instance | A determined attacker spread across instances gets more guesses | Use a strong `DASH_PASSWORD` (12+ chars). Add a shared store (e.g. Upstash Redis) for a strict lockout |
| One shared login | Can't revoke one person | Change `DASH_PASSWORD` + `AUTH_SECRET` and redeploy |
| ShineMonitor password stored in host env | Anyone with Vercel project access can read it | Limit who can access the project; use a ShineMonitor password you don't reuse elsewhere |
| ShineMonitor login uses SHA-1 signing | It's their protocol; Helio can't change it | Requests go over HTTPS |

## Recommendations

1. Use a long, unique `DASH_PASSWORD`, different from `SHINE_PASS`.
2. Set `AUTH_SECRET` to 32+ random bytes.
3. Keep your forked repo **private** if you edit config into it (env vars are safer).
4. Pull upstream updates now and then; see [Configuration → Updating](configuration.md#updating).

## Reporting a vulnerability

Please don't open a public issue. Use [GitHub private vulnerability reporting](https://github.com/byrishi/helio/security/advisories/new). See [SECURITY.md](../SECURITY.md).
