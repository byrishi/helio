# Getting started

## Will Helio work for me?

Helio works when all three are true:

1. Your inverter has an **Eybond WiFi datalogger** plugged in: a small black stick with a QR code, a `PN:` number, and lights labelled `PWR COM NET SRV`.
2. The stick is **online**: its `NET` and `SRV` lights are on. If not, see [Connect the WiFi stick](wifi-stick.md).
3. You can **log in at [shinemonitor.com](https://www.shinemonitor.com)** (or the SmartClient app) and see today's energy for your plant. If not, see [ShineMonitor account](shinemonitor-account.md).

> **Quick test:** if shinemonitor.com shows your daily energy, Helio will show the same number.

You'll also need free accounts on [GitHub](https://github.com/signup) and [Vercel](https://vercel.com/signup).

## Deploy in five minutes

1. Click **Deploy with Vercel** in the [README](../README.md#quick-start) and sign in with GitHub. Vercel copies Helio into your GitHub account.
2. Fill in the variables Vercel asks for:

   | Variable | What to enter |
   |---|---|
   | `SHINE_USER` | Your ShineMonitor username, exactly as you type it to log in |
   | `SHINE_PASS` | Your ShineMonitor password |
   | `DASH_USER` | A new username for your dashboard |
   | `DASH_PASSWORD` | A new password for your dashboard (12+ characters, different from `SHINE_PASS`) |
   | `AUTH_SECRET` | Any long random text, e.g. from `openssl rand -hex 32` |
   | `TARIFF` | What you pay per unit, e.g. `7.5` |

3. Click **Deploy**. After about a minute you get a link like `helio-yourname.vercel.app`.
4. Open it, sign in with your **dashboard** login (not your ShineMonitor one), and check today's units match shinemonitor.com.

Optional settings like `EXPORT_TARIFF`, `CURRENCY` and `TIMEZONE` are covered in [Configuration](configuration.md).

## After the first sign-in

Three things make the rest of Helio work. Each takes under a minute:

1. **Location.** If the Health card asks for one, tap **Use this device's location** while you're at home. The weather check then tells cloudy days apart from dirty panels. See [Health and inverter](health-and-inverter.md).
2. **Daily alert.** In the Daily alert card, tap **Connect Telegram**, press Start in the Helio Solar bot, and add the code it sends as `TELEGRAM_LINK` in Vercel. Redeploy, then tap **Send a test alert**. See [Daily alert](alerts.md).
3. **Cleaning date.** The next time the panels are washed, mark it on the Health card so the dust check starts from a clean baseline.

## Other hosts

Helio is a standard Next.js 15 app. Any Node 18+ host works:

```bash
git clone https://github.com/byrishi/helio.git && cd helio
npm install
npm run build
npm start            # set the same environment variables first
```

## Try it without an account

Every deployment has a public `/demo` page with sample data from a fictional 5.4 kW rooftop. It never touches a real account.
