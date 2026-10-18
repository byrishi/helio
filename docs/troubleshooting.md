# Troubleshooting

Errors from ShineMonitor appear on the dashboard as `ShineMonitor err 0x…: NAME`.

| What you see | What it means | Fix |
|---|---|---|
| `0x0105 ERR_NOT_FOUND_USR` | ShineMonitor doesn't know this username | `SHINE_USER` must match what you type at shinemonitor.com exactly, case included. Remove any `SHINE_SUFFIX` containing `source=1`. Redeploy |
| `0x0010 ERR_PASSWORD_VERIF_FAIL` | Wrong ShineMonitor password | Fix `SHINE_PASS`, redeploy |
| `0x0104 ERR_NOT_FOUND_PLANT` | No plant on this account, or a wrong plant id | Remove `SHINE_PLANT_ID` so Helio picks it automatically. Confirm the plant exists on shinemonitor.com |
| `0x000C ERR_NO_RECORD` | No data for that period | Normal before sunrise, on the first day, or for dates before the stick was online |
| *Login is not configured* | `DASH_USER` or `DASH_PASSWORD` missing | Add both, redeploy |
| *Incorrect username or password* | Dashboard login didn't match | Use your `DASH_*` values, not your ShineMonitor login. Usernames are case-insensitive; passwords aren't |
| *Too many attempts* | 5 wrong passwords from your IP | Wait 15 minutes, or redeploy |
| Status *No recent data* | No reading for 30+ minutes in daylight | The stick is offline: check its `NET` / `SRV` lights and your router. See [Connect the WiFi stick](wifi-stick.md) |
| *Last reading* shows a strange time | Plant timezone is wrong | Fix the timezone in ShineMonitor plant settings and set `TIMEZONE` |
| Yesterday, month or year too low | Cloud history only starts when the stick came online | Fills in from the next day |
| Numbers differ slightly from my utility meter | Different meters | 1–2% is normal; the utility meter is official |
| Changed a variable, nothing happened | Env vars apply on deploy | Vercel → Deployments → ⋯ → Redeploy |

## Check your ShineMonitor login from a terminal

```bash
cp .env.example .env.local   # fill SHINE_USER and SHINE_PASS
npm run test:login
```

It prints your plants, today's units and lifetime units, or the exact error.

Still stuck? [Open an issue](https://github.com/byrishi/helio/issues/new/choose). Include the error text but **never your passwords**.
