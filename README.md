<div align="center">

<img src="docs/images/logo.png" width="56" height="56" alt="" />

# Helio

**Know exactly what your roof made today.**

A private, open-source dashboard for rooftop solar systems that report to ShineMonitor through an Eybond WiFi stick, the setup behind the SmartClient app.

[Website](https://helio.rishishah.in) · [Live demo](https://helio.rishishah.in/demo) · [Docs](docs/README.md)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fbyrishi%2Fhelio&project-name=helio&repository-name=helio&env=SHINE_USER,SHINE_PASS,DASH_USER,DASH_PASSWORD,AUTH_SECRET,TARIFF&envDescription=Your%20ShineMonitor%20login%2C%20a%20dashboard%20login%2C%20and%20your%20electricity%20rate.&envLink=https%3A%2F%2Fgithub.com%2Fbyrishi%2Fhelio%2Fblob%2Fmain%2Fdocs%2Fconfiguration.md)

<br />

<img src="docs/images/dashboard-light.png" alt="Helio dashboard: today's units, live power, month and lifetime totals, and the day's power curve" width="920" />

</div>

## Why

The official apps show the right numbers, but they're slow, cluttered and hard to read on a phone. Helio shows the same numbers, from the same cloud, as a fast private dashboard you host yourself for free.

## What you get

- **Exact daily units** from the inverter's own energy counter, not estimated from a graph
- **Live power** in kW and as a share of your system's capacity, with a *Generating / Idle / No recent data* status
- **Any past day** in detail: units, value, peak power and when it hit, producing hours, a 5-minute power curve
- **History:** the last 30 days with average and best day, every month of the year, and a daily log you can click into
- **What it's worth** in your currency, with separate rates for units you use and units you export. Rates can be edited right on the dashboard
- **Private by default:** a password-protected dashboard; your ShineMonitor login never reaches the browser
- **Made for phones**, with light and dark themes and nothing to install
- **Free to run** on Vercel: no database, no server to look after

<table>
  <tr>
    <td><img src="docs/images/mobile-light.png" alt="Helio on a phone, light theme" width="260" /></td>
    <td><img src="docs/images/mobile-dark.png" alt="Helio on a phone, dark theme" width="260" /></td>
    <td><img src="docs/images/dashboard-dark.png" alt="Helio dashboard, dark theme" width="420" /></td>
  </tr>
</table>

## Will it work for me?

Yes, if your inverter has an **Eybond WiFi datalogger** (a small black stick with a QR code and `PWR COM NET SRV` lights) and you can see today's energy at **[shinemonitor.com](https://www.shinemonitor.com)** or in the SmartClient app.

Stick offline? Follow [Connect the WiFi stick](docs/wifi-stick.md). No account yet? See [ShineMonitor account](docs/shinemonitor-account.md).

## Quick start

1. Click **Deploy with Vercel** above and sign in with GitHub.
2. Fill in six values:

   | Variable | Value |
   |---|---|
   | `SHINE_USER` / `SHINE_PASS` | Your ShineMonitor login |
   | `DASH_USER` / `DASH_PASSWORD` | A new login for your dashboard |
   | `AUTH_SECRET` | Any long random text (`openssl rand -hex 32`) |
   | `TARIFF` | What you pay per unit, e.g. `7.5` |

3. Deploy, open your link, sign in. Today's units should match shinemonitor.com exactly.

Optional: `EXPORT_TARIFF`, `CURRENCY`, `LOCALE`, `TIMEZONE`, and more in [Configuration](docs/configuration.md).

## Limitations

Helio is deliberately small. Before you set it up, know that:

- **It only supports Eybond / ShineMonitor.** Solarman, Growatt, SolisCloud, Sungrow and others aren't supported yet.
- **It uses ShineMonitor's unofficial web API**, the same one their website uses. It could change without notice.
- **It shows generation only.** It knows nothing about home consumption, grid import or export, or batteries.
- **Money values are a range**, between all-exported and all-used-at-home, because consumption isn't measured.
- **History starts when your stick first came online.** The lifetime total is the exception.
- **There's one shared login**, and brute-force lockout is per server instance. Use a strong password.
- **5-minute resolution, one plant per deployment, English only.**

Full list: [docs/limitations.md](docs/limitations.md).

## Security

Signed, `httpOnly` session cookies; every data route checks the session twice; secrets never ship to the browser; strict security headers; `no-store` on data; Next.js 15.5+. Known gaps and how to report issues: [docs/security.md](docs/security.md).

## Documentation

| | |
|---|---|
| [Getting started](docs/getting-started.md) | [Configuration](docs/configuration.md) |
| [Connect the WiFi stick](docs/wifi-stick.md) | [Accuracy and savings](docs/accuracy-and-savings.md) |
| [ShineMonitor account](docs/shinemonitor-account.md) | [Troubleshooting](docs/troubleshooting.md) |
| [Limitations](docs/limitations.md) | [API](docs/api.md) |
| [Security](docs/security.md) | [Architecture](docs/architecture.md) · [FAQ](docs/faq.md) |

## Develop

```bash
git clone https://github.com/byrishi/helio.git && cd helio
npm install
npm run dev        # http://localhost:3000/demo works with no setup
```

Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · [Watermelon UI](https://ui.watermelon.sh) · Recharts. Contributions are welcome, especially support for other monitoring clouds; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). Designed and built by [Rishi Shah](https://rishishah.in).

Helio is an independent project. It is not affiliated with or endorsed by Eybond, ShineMonitor, SmartClient, or any inverter, panel or utility company; their names are used only to describe compatibility. Figures are provided as-is. For billing, rely on your utility meter.
