# Limitations

Helio is small on purpose. Here's what it doesn't do, so you know before you set it up.

## Hardware and cloud

- **Eybond + ShineMonitor only.** Helio talks to the ShineMonitor cloud. Systems on Solarman, Growatt ShinePhone, SolisCloud, Sungrow iSolarCloud, Huawei FusionSolar and others are not supported yet.
- **Unofficial API.** Helio uses the same web API that shinemonitor.com uses, with your login. It isn't a published partner API, so ShineMonitor could change it without notice. The endpoint, key and parameters are configurable for that reason.
- **Depends on the cloud.** No internet at home, or ShineMonitor down, means no new data in Helio. Helio doesn't talk to the stick or inverter directly.
- **5-minute resolution.** The stick reports roughly every 5 minutes, so the curve can't show shorter spikes or dips.

## Data

- **Generation only.** Helio shows what your panels produce. It doesn't know your home's consumption, grid import, or grid export, because a standard inverter doesn't measure them.
- **Savings are a range, not a bill.** Without consumption data Helio can't know how many units you used versus exported. See [Accuracy and savings](accuracy-and-savings.md).
- **No history before the stick was online.** Daily and monthly values only exist from the day the stick first connected. Lifetime total is the exception: it comes from the inverter's own counter.
- **No battery views.** Hybrid and battery systems show generation only, with no state of charge, charge/discharge or backup time.
- **One plant per deployment.** Several plants means several deployments, each with its own `SHINE_PLANT_ID`.
- **No exports or alerts yet.** No CSV download, no email or WhatsApp alerts when generation drops.

## Accounts and security

- **One shared dashboard login.** Everyone uses the same `DASH_USER` / `DASH_PASSWORD`; there are no per-person accounts or roles.
- **Best-effort brute-force protection.** Wrong passwords are slowed down and an IP is locked out after 5 tries for 15 minutes, but on serverless hosts each instance keeps its own counter, so the lockout isn't global. Use a strong password. See [Security](security.md).
- **Your ShineMonitor password lives in your host's settings.** It's never sent to browsers, but anyone with access to your Vercel project can read it.

## Product

- **English only.** Translations are welcome.
- **Not affiliated with anyone.** No support from Eybond, ShineMonitor, SmartClient, or any inverter brand. Issues go to this repo.

Most of these are on the [contribution wishlist](../CONTRIBUTING.md#wanted).
