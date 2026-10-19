# Daily alert

Every evening, between 6:30 and 7:30 pm India time by default, Helio sends one Telegram message with today's units and anything that needs a look. It comes from the **Helio Solar** bot, so there's nothing to build.

## Connect in two steps

1. On your dashboard, open **Daily alert → Connect Telegram** and press **Start**. The Helio Solar bot replies with your connect code.
2. In Vercel, open your Helio project → **Settings → Environment Variables**, add `TELEGRAM_LINK` with that code, and redeploy.

Then tap **Send a test alert**. That's it: the daily schedule is already in `vercel.json`.

## What it says

```
My Rooftop: 21.4 kWh today · 1 to check

My Rooftop · Mon, 19 Oct

21.4 kWh today (3.96 kWh/kWp) · expected 21–23 for a clean system
Yesterday 22.0 kWh · this month 401 kWh
Yesterday: good (96% of a good day).

Needs a look:
• High grid voltage 11:05 am–1:40 pm. Peaked at 258.6 V, above 253 V (230 V + 10%). The inverter kept running, so its trip setting is above this.
```

It lists, when they happen:

- the WiFi stick going offline, or no units on a sunny day
- the inverter reporting a status other than normal
- yesterday scoring **low** for its sunshine, and **cleaning recommended**
- high or low grid voltage, grid frequency out of range, and output stops, grouped with their times
- inverter alarms raised today

These are the same checks as on the dashboard. See [Health and inverter checks](health-and-inverter.md).

## How the Helio Solar bot works

- Your connect code holds your Telegram chat id plus a signature only the bot can make. It lets your Helio message **your** chat and nothing else.
- Your Helio sends the finished message to the bot's relay at `helio.rishishah.in`, which passes it straight to Telegram. The relay **stores nothing**: no database, no message log.
- The message contains your plant's name and readings. Your ShineMonitor login and dashboard password never leave your Helio.
- To stop: remove `TELEGRAM_LINK` and redeploy, or block the bot in Telegram.

## Prefer your own bot?

If you'd rather nothing passes through the relay:

1. In Telegram, message **@BotFather**, send `/newbot`, and copy the token.
2. Send any message to your bot, then open `https://api.telegram.org/bot<token>/getUpdates` and copy `chat.id`.
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Vercel instead of `TELEGRAM_LINK`, and redeploy.

## Settings

| Variable | What it does |
|---|---|
| `TELEGRAM_LINK` | Connect code from the Helio Solar bot |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Your own bot instead |
| `ALERT_ONLY_ISSUES` | `true` to send only on days with something to check |
| `CRON_SECRET` | Optional. When set, only Vercel's scheduler (which sends it) can trigger the daily job |
| `APP_URL` | Link added to the message; default is your Vercel production address |
| `TELEGRAM_RELAY_URL` | For forks running their own relay |

Without `CRON_SECRET`, the daily job accepts only requests that identify as Vercel Cron and runs at most once every 20 hours. The worst a fake call could do is send you your own summary early. Set `CRON_SECRET` to rule that out.

## Changing the time

The schedule is in `vercel.json`: `"0 13 * * *"`, 13:00 UTC. Times are in UTC, so change the hour for your time zone, for example `"0 17 * * *"` for around 6 pm in Berlin in winter. On Vercel's free plan a job runs once a day and [can start any time within that hour](https://vercel.com/docs/cron-jobs/usage-and-pricing), so `0 13` means 13:00–13:59 UTC, 6:30–7:29 pm in India.
