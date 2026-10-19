# Daily alert

Once a day, between 6:30 and 7:30 pm India time by default, Helio sends one short message with today's units and anything that needs a look. It goes to the free [ntfy](https://ntfy.sh) app, to Telegram, or to both.

## What it says

```
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
- high or low grid voltage, grid frequency out of range, and output stops, with times
- inverter alarms raised today

The checks are the same ones on the dashboard. See [Health and inverter checks](health-and-inverter.md).

## Set it up with ntfy (no account)

1. Install **ntfy** on your phone ([Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy), [iPhone](https://apps.apple.com/us/app/ntfy/id1625396347)).
2. Tap **+**, and subscribe to a topic name nobody would guess, for example `helio-7f3k9q2m`. Anyone who knows the name can read it, so treat it like a password.
3. In Vercel, add `NTFY_TOPIC` with that name.
4. Add `CRON_SECRET` with any long random text (`openssl rand -hex 32`). Vercel uses it to call the daily job; nobody else can.
5. Redeploy. On the dashboard, **Daily alert → Send a test alert**.

Self-hosting ntfy or using a protected topic? Set `NTFY_SERVER` and `NTFY_TOKEN` too.

## Or with Telegram

1. In Telegram, message **@BotFather**, send `/newbot`, and follow the steps. Copy the token it gives you.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<token>/getUpdates` in a browser and copy `chat.id` from the reply.
3. In Vercel, add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, plus `CRON_SECRET` as above.
4. Redeploy and send a test alert.

## Settings

| Variable | What it does |
|---|---|
| `NTFY_TOPIC` | ntfy topic to post to |
| `NTFY_SERVER` | default `https://ntfy.sh` |
| `NTFY_TOKEN` | access token, for protected topics |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | your bot and the chat it posts to |
| `CRON_SECRET` | required for the daily schedule; Vercel sends it to `/api/cron/daily` |
| `ALERT_ONLY_ISSUES` | `true` to send only on days with something to check |
| `APP_URL` | link added to the message; default is your Vercel production address |

## Changing the time

The schedule is in `vercel.json`: `"0 13 * * *"`, 13:00 UTC. Times are in UTC, so change the hour for your time zone, for example `"0 17 * * *"` for around 6 pm in Berlin in winter. On Vercel's free plan a job runs once a day and [can start any time within that hour](https://vercel.com/docs/cron-jobs/usage-and-pricing), so `0 13` means 13:00–13:59 UTC, which is 6:30–7:29 pm in India.

## Privacy

The message goes from your own server to the channels you set. It contains your plant's name and readings, nothing else. Helio itself stores nothing.
