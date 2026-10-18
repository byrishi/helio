# API

All responses are JSON. Live endpoints need the session cookie that `/api/auth/login` sets. Demo endpoints are public and return sample data in the same shape.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | none | Body `{ "user": "…", "pass": "…" }`. Sets the session cookie. `401` wrong login, `429` locked out, `500` not configured |
| `POST` | `/api/auth/logout` | none | Clears the session cookie |
| `GET` | `/api/solar` | session | Overview (below) |
| `GET` | `/api/solar/day?date=YYYY-MM-DD` | session | One day's detail. `date` defaults to today in `TIMEZONE` |
| `GET` | `/api/demo` | public | Overview with sample data |
| `GET` | `/api/demo/day?date=YYYY-MM-DD` | public | Day detail with sample data |

Errors look like `{ "error": "message" }` with status `400`, `401`, `429` or `502` (ShineMonitor error, passed through).

## `GET /api/solar`

```json
{
  "plant": { "id": 1234567, "name": "My Rooftop", "capacityKw": 5.4, "installed": "2024-01-15" },
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

## Example

```bash
# sign in and keep the cookie
curl -c jar -X POST https://your-helio.vercel.app/api/auth/login \
  -H 'content-type: application/json' -d '{"user":"family","pass":"…"}'

# read today's numbers
curl -b jar https://your-helio.vercel.app/api/solar | jq '.todayKwh, .nowKw'
```
