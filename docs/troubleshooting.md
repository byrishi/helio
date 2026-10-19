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

## Health, grid and alerts

| What you see | What it means | Fix |
|---|---|---|
| Health says *Not enough history* | Health needs at least 7 sunny days of readings to know what a good day looks like | Wait. It fills in by itself; days before the WiFi stick came online are shown as no data |
| *Needs weather data* or *Too cloudy to judge* on every day | Helio has no location, so it can't tell clouds from dust | Tap **Use this device's location** on the dashboard, or set `SITE_LAT` and `SITE_LON`. See [Health and inverter](health-and-inverter.md) |
| *Location permission was denied* | The browser blocked location | Allow location for your dashboard's address, or type the coordinates in the box below it |
| Cleaning advice never appears | It needs 4+ sunny days since the last heavy rain (5 mm or more) or the cleaning date you marked | Normal after rain. Mark the day you cleaned so the comparison restarts |
| *Grid voltage was above 253 V* but the inverter kept running | Your installer widened the inverter's limits. Helio checks against IEC 61727 | Nothing to fix in Helio. If the grid is high even with your system off, tell your utility. Set `GRID_VOLTAGE` if your supply isn't 230 V |
| No grid, temperature or WiFi stick section | Your inverter model doesn't report those fields | Nothing to fix. Helio hides what it can't read |
| Test alert: *Invalid connect code* | `TELEGRAM_LINK` was mistyped or is from a different bot | Send `/start` to [@HelioSolarBot](https://t.me/HelioSolarBot) for a fresh code, paste it into `TELEGRAM_LINK`, redeploy |
| Test alert: *Too many messages this hour* | The bot relays at most 12 messages an hour per code | Wait an hour. The daily alert itself sends once |
| Test works, but no evening alert | The scheduled job didn't run | Check Vercel → your project → **Cron Jobs**. On the free plan it runs once a day, sometime between 13:00 and 13:59 UTC (6:30–7:29 pm IST) |
| Alert arrives as text, not an image | The image couldn't be drawn on this run, so Helio sent the same content as text | Nothing is lost. If it keeps happening, open an issue with your Vercel logs |
| CSV is empty or has gaps | ShineMonitor has no history for those days | History starts when your WiFi stick first came online |

## Check your ShineMonitor login from a terminal

```bash
cp .env.example .env.local   # fill SHINE_USER and SHINE_PASS
npm run test:login
```

It prints your plants, today's units and lifetime units, or the exact error.

Still stuck? [Open an issue](https://github.com/byrishi/helio/issues/new/choose). Include the error text but **never your passwords**.
