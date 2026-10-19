# API

All responses are JSON. Live endpoints need the session cookie that `/api/auth/login` sets. Demo endpoints are public and return sample data in the same shape.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | none | Body `{ "user": "…", "pass": "…" }`. Sets the session cookie. `401` wrong login, `429` locked out, `500` not configured |
| `POST` | `/api/auth/logout` | none | Clears the session cookie |
| `GET` | `/api/solar` | session | Overview (below) |
| `GET` | `/api/solar/day?date=YYYY-MM-DD` | session | One day's detail. `date` defaults to today in `TIMEZONE` |
| `GET` | `/api/solar/health` | session | Health, cleaning advice and today's estimate. Optional `cleaned=YYYY-MM-DD`, and `lat` / `lon` when the server has no location |
| `GET` | `/api/solar/inverter?date=YYYY-MM-DD` | session | Live inverter readings, the day's grid check, alarms (180 days), WiFi stick status |
| `GET` | `/api/solar/export` | session | CSV. Daily: `from`, `to` (up to 366 days). Monthly: `scope=months&year=YYYY`. Optional `tariff`, `export`, `currency`, `lat`, `lon` |
| `GET` | `/api/demo` | public | Overview with sample data |
| `GET` | `/api/demo/day?date=YYYY-MM-DD` | public | Day detail with sample data |
| `GET` | `/api/demo/health`, `/api/demo/inverter`, `/api/demo/export` | public | The same, with sample data |

Errors look like `{ "error": "message" }` with status `400`, `401`, `429` or `502` (ShineMonitor error, passed through).

## `GET /api/solar`

```json
{
  "plant": { "id": 1234567, "name": "My Rooftop", "capacityKw": 5.4, "installed": "2024-01-15", "panels": { "count": 12, "watt": 450 }, "panelKwp": 5.4 },
  "location": { "lat": 28.61, "lon": 77.21, "source": "plant" },
  "nowKw": 1.92,
  "todayKwh": 14.0,
  "yesterdayKwh": 13.1,
  "monthKwh": 245.6,
  "yearKwh": 3979.2,
  "totalKwh": 10119,
  "daily": [{ "date": "2026-09-19", "kwh": 12.8 }, "… 30 days, oldest first, includes today"],
  "months": [{ "m": 1, "kwh": 512.4 }, "… 12 months, Jan–Dec of the current year"],
  "lastReadingAt": "2026-10-18 17:35",
  "fetchedAt": "2026-10-18T12:06:01.512Z",
  "settings": { "timezone": "Asia/Kolkata", "tariff": 7.5, "exportTariff": 2.25, "currency": "₹", "locale": "en-IN" }
}
```

- Energy is in **kWh** (units) and power in **kW**.
- `lastReadingAt` is the last sample with non-zero output today, in the plant's local time, or `null`.

## `GET /api/solar/day?date=2026-10-18`

```json
{
  "date": "2026-10-18",
  "kwh": 14.0,
  "curve": [{ "t": "06:25", "kw": 0.012 }, "… 5-minute samples up to now"],
  "peak": { "t": "12:45", "kw": 2.63 },
  "firstAt": "06:25",
  "lastAt": "17:35"
}
```

## `GET /api/solar/health`

```json
{
  "method": "weather",
  "baseline": 0.71,
  "latest": { "date": "2026-10-18", "kwh": 18.9, "specificYield": 3.5, "irradiation": 5.6, "rainMm": 0, "score": 0.89, "status": "slightly-low" },
  "days": ["… one entry per finished day, same shape as latest"],
  "soiling": { "lossPct": 0.09, "reference": "after-wash", "sunnyDays": 7, "lastRain": { "date": "2026-10-01", "mm": 14 }, "advice": "clean" },
  "today": { "expectedKwh": 22.8, "low": 21.6, "high": 23.0, "forecastIrradiation": 6.0 },
  "location": { "source": "plant" },
  "weatherError": null
}
```

`status` is one of `good`, `slightly-low`, `low`, `too-cloudy`, `no-generation`, `no-data`, `unknown`. `advice` is `clean`, `watch`, `fine` or `not-enough-data`. Method and thresholds: [Health and inverter checks](health-and-inverter.md).

## `GET /api/solar/inverter?date=2026-10-19`

```json
{
  "device": { "status": 0, "label": "Online" },
  "collector": { "online": true, "firmware": "8.4.4.11", "intervalSec": 300, "panels": { "count": 12, "watt": 450, "kwp": 5.4 } },
  "live": { "at": "2026-10-19 17:24:44", "status": "Normal", "standard": "IEC 61727", "powerW": 176,
            "pv": [{ "n": 1, "v": 221.9, "a": 1.0, "w": 221.9 }], "grid": { "v": 244.5, "hz": 49.97, "phases": [{ "name": "R", "v": 244.5 }] },
            "temps": [{ "name": "Internal", "c": 53 }, { "name": "Heatsink", "c": 49.5 }] },
  "day": { "date": "2026-10-19", "samples": ["… 5-minute rows"], "grid": { "min": { "v": 239.4, "t": "06:37" }, "max": { "v": 264, "t": "12:39" }, "hzMin": 49.83, "hzMax": 50.27 },
           "tempMax": { "c": 80.1, "t": "13:38", "name": "Heatsink" }, "pvVMax": 235.4,
           "events": [{ "kind": "over-voltage", "t": "10:59", "until": "14:03", "detail": "Peaked at 264.0 V, above 253 V (230 V + 10%). The inverter kept running, so its trip setting is above this." }] },
  "alarms": { "items": [], "error": null, "days": 180 },
  "limits": { "nominalV": 230, "highV": 253, "lowV": 195.5, "nominalHz": 50, "hzBand": 1 }
}
```

## Example

```bash
# sign in and keep the cookie
curl -c jar -X POST https://your-helio.vercel.app/api/auth/login \
  -H 'content-type: application/json' -d '{"user":"family","pass":"…"}'

# read today's numbers
curl -b jar https://your-helio.vercel.app/api/solar | jq '.todayKwh, .nowKw'

# download the last 30 days as CSV
curl -b jar -o helio.csv "https://your-helio.vercel.app/api/solar/export"
```
