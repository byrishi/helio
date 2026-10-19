// Shared handlers for the signed-in routes (/api/solar/*) and the public demo (/api/demo/*).
// The demo never touches a real account: every read goes to the mock functions instead.
import { NextResponse } from "next/server";
import { anyChannel, buildReport, channels, send } from "@/lib/alerts";
import { config } from "@/lib/config";
import { toCsv } from "@/lib/csv";
import { computeHealth, fetchWeather, type Weather } from "@/lib/health";
import { DEVICE_STATUS, GRID, getAlarms, getCollector, getDeviceDay, getDeviceKey, getLive, mockCollector, mockInverterDay, mockLive, type Alarm, type InverterDay } from "@/lib/inverter";
import { getDay, getMonthDays, getOverview, getYearMonths, mockDay, mockMonthDays, mockOverview, mockWeather, mockYearMonths, shift, validLatLon, ymd, type DayDetail, type Overview } from "@/lib/shinemonitor";

export const noStore = { "Cache-Control": "private, no-store, max-age=0" };
const weatherOn = () => !/^(off|false|0|no)$/i.test(process.env.WEATHER ?? "");

/* ---------- Overview with panel size, cached ---------- */
let cache: { at: number; data: Overview } | null = null;
const TTL = 60_000; // the inverter reports every ~5 min; no need to hit the cloud more often

// Panel size for per-kW figures: SYSTEM_KWP if set, else panels × watts recorded on the datalogger,
// else the plant's nominal power.
async function panels(): Promise<{ kwp: number; count: number; watt: number } | null> {
  try {
    const k = await getDeviceKey();
    return k.key ? (await getCollector(k.key.pn, k.collectorStatus)).panels : null;
  } catch { return null; }
}

export async function overview(demo: boolean): Promise<Overview> {
  if (demo) {
    const o = mockOverview();
    o.plant.panels = { count: mockCollector.panels!.count, watt: mockCollector.panels!.watt };
    o.plant.panelKwp = mockCollector.panels!.kwp;
    return o;
  }
  if (!cache || Date.now() - cache.at > TTL) {
    const [data, p] = await Promise.all([getOverview(), panels()]);
    const env = Number(process.env.SYSTEM_KWP);
    data.plant.panels = p ? { count: p.count, watt: p.watt } : null;
    data.plant.panelKwp = env > 0 ? env : p?.kwp ?? null;
    cache = { at: Date.now(), data };
  }
  return cache.data;
}
export const kwpOf = (o: Overview) => o.plant.panelKwp || o.plant.capacityKw;

/** Location used for weather: settings or plant record (server side), else coordinates the browser sent. */
function locationFor(o: Overview, q: URLSearchParams, demo: boolean) {
  if (demo) return { lat: 0, lon: 0, source: "demo" as const };
  if (!weatherOn()) return null;
  if (o.location) return o.location;
  const a = Number(q.get("lat")), b = Number(q.get("lon"));
  return q.get("lat") && q.get("lon") && validLatLon(a, b) ? { lat: a, lon: b, source: "device" as const } : null;
}

/* ---------- Health ---------- */
export async function health(req: Request, demo: boolean) {
  const q = new URL(req.url).searchParams;
  const cleaned = q.get("cleaned");
  const cleanedOn = cleaned && /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null;
  try {
    const o = await overview(demo);
    const today = ymd(new Date());
    const loc = locationFor(o, q, demo);
    let weather: Weather[] | null = null, weatherError: string | null = null;
    if (demo) weather = mockWeather(o.daily.map((d) => d.date));
    else if (loc && weatherOn()) { try { weather = await fetchWeather(loc.lat, loc.lon, 35, config.timezone); } catch (e) { weatherError = (e as Error).message; } }
    const h = computeHealth({ days: o.daily, today, capacityKw: kwpOf(o), weather, cleanedOn });
    return NextResponse.json({ ...h, location: loc ? { source: loc.source } : null, weatherError, weatherOff: !demo && !weatherOn() }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/* ---------- Inverter, grid, alarms, datalogger ---------- */
let alarmCache: { at: number; items: Alarm[]; error: string | null } | null = null;
export async function inverter(req: Request, demo: boolean) {
  const q = new URL(req.url).searchParams.get("date");
  const today = ymd(new Date());
  const date = q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q <= today ? q : today;
  if (demo) {
    return NextResponse.json({ device: { status: 0, label: "Online" }, collector: mockCollector, live: mockLive(), day: mockInverterDay(date), alarms: { items: [], error: null, days: 180 }, limits: GRID }, { headers: noStore });
  }
  try {
    const k = await getDeviceKey();
    if (!k.key) return NextResponse.json({ error: "No inverter found on this plant" }, { status: 404 });
    if (!alarmCache || Date.now() - alarmCache.at > 10 * 60_000) alarmCache = { at: Date.now(), ...(await getAlarms(k.key, 180)) };
    const [collector, live, day] = await Promise.all([getCollector(k.key.pn, k.collectorStatus), getLive(k.key), getDeviceDay(k.key, date)]);
    return NextResponse.json({
      device: { status: k.deviceStatus, label: DEVICE_STATUS[k.deviceStatus] ?? `Status ${k.deviceStatus}` },
      collector, live, day, alarms: { items: alarmCache.items, error: alarmCache.error, days: 180 }, limits: GRID,
    }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/* ---------- CSV export ---------- */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 366;      // energy for up to a year per file
const CURVE_DAYS = 93;     // peak / first / last need one call per day
const INVERTER_DAYS = 31;  // grid / temperature columns need up to 3 calls per day
const WEATHER_DAYS = 92;   // Open-Meteo's forecast API keeps ~92 past days
const r = (n: number | null | undefined, d = 2) => (n === null || n === undefined || !Number.isFinite(n) ? null : +n.toFixed(d));
const hoursBetween = (a: string | null, b: string | null) => {
  if (!a || !b) return null;
  const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  return (m(b) - m(a)) / 60;
};
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}
function file(name: string, body: string) {
  return new Response(body, { headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
}
const rate = (v: string | null, d: number) => (v !== null && v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d);

export async function exportCsv(req: Request, demo: boolean) {
  const q = new URL(req.url).searchParams;
  // Rates the viewer set on their device are passed along so the file matches the screen.
  const tariff = rate(q.get("tariff"), demo ? 7.5 : config.tariff);
  const exportRate = rate(q.get("export"), demo ? 2.25 : config.exportTariff);
  const currency = (q.get("currency") || (demo ? "₹" : config.currency)).trim().slice(0, 5);
  const today = ymd(new Date());
  try {
    const o = await overview(demo);
    const cap = kwpOf(o);

    if (q.get("scope") === "months") {
      const year = /^\d{4}$/.test(q.get("year") || "") ? q.get("year")! : today.slice(0, 4);
      const months = demo ? mockYearMonths(year) : await getYearMonths(year);
      const rows: (string | number | null)[][] = [];
      for (const { m, kwh } of months) {
        const month = `${year}-${String(m).padStart(2, "0")}`;
        if (month > today.slice(0, 7)) continue;
        const days = (demo ? mockMonthDays(month) : await getMonthDays(month)).filter((d) => d.date <= today);
        const gen = days.filter((d) => d.kwh > 0);
        const best = gen.reduce<typeof gen[0] | null>((b, d) => (!b || d.kwh > b.kwh ? d : b), null);
        const total = kwh || days.reduce((s, d) => s + d.kwh, 0);
        rows.push([
          month, r(total, 1), cap ? r(total / cap, 1) : null, gen.length, days.length,
          gen.length ? r(gen.reduce((s, d) => s + d.kwh, 0) / gen.length, 1) : null,
          best?.date ?? null, best ? r(best.kwh, 1) : null,
          r(total * exportRate, 0), r(total * tariff, 0), currency, cap || null, month === today.slice(0, 7) ? "month in progress" : "",
        ]);
      }
      const header = ["month", "energy_kwh", "specific_yield_kwh_per_kwp", "days_with_generation", "days_in_data", "average_per_generating_day_kwh",
        "best_day", "best_day_kwh", "value_min", "value_max", "currency", "plant_capacity_kwp", "note"];
      return file(`helio-months-${year}.csv`, toCsv(header, rows));
    }

    let to = ISO.test(q.get("to") || "") ? q.get("to")! : today;
    if (to > today) to = today;
    let from = ISO.test(q.get("from") || "") ? q.get("from")! : shift(to, -29);
    if (from > to) from = to;
    if (shift(from, MAX_DAYS - 1) < to) from = shift(to, -(MAX_DAYS - 1));

    const monthsNeeded: string[] = [];
    for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = shift(m + "-28", 7).slice(0, 7)) monthsNeeded.push(m);
    const byDate = new Map<string, number>();
    for (const list of await pool(monthsNeeded, 4, (m) => (demo ? Promise.resolve(mockMonthDays(m)) : getMonthDays(m)))) for (const d of list) byDate.set(d.date, d.kwh);
    for (const d of o.daily) if (!byDate.has(d.date) || d.date === today) byDate.set(d.date, d.kwh); // today's counter is freshest

    const dates: string[] = [];
    for (let d = from; d <= to; d = shift(d, 1)) dates.push(d);
    const days = dates.map((date) => ({ date, kwh: byDate.get(date) ?? 0 }));

    const details: (DayDetail | null)[] = dates.length <= CURVE_DAYS
      ? await pool(dates, 6, (d) => (demo ? Promise.resolve(mockDay(d)) : getDay(d).catch(() => null)))
      : dates.map(() => null);

    let inv: (InverterDay | null)[] = dates.map(() => null);
    if (dates.length <= INVERTER_DAYS) {
      if (demo) inv = dates.map(mockInverterDay);
      else {
        const k = await getDeviceKey().catch(() => null);
        if (k?.key) inv = await pool(dates, 4, (d) => getDeviceDay(k.key!, d).catch(() => null));
      }
    }

    const loc = locationFor(o, q, demo);
    let weather: Weather[] | null = null;
    if (demo) weather = mockWeather(dates);
    else if (loc && weatherOn() && to >= shift(today, -WEATHER_DAYS)) weather = await fetchWeather(loc.lat, loc.lon, WEATHER_DAYS, config.timezone).catch(() => null);
    const wx = new Map((weather ?? []).map((w) => [w.date, w]));

    // Baseline from the same 30-day window the dashboard uses, so the file and the screen agree.
    const base = computeHealth({ days: o.daily, today, capacityKw: cap, weather: demo ? mockWeather(o.daily.map((d) => d.date)) : weather, cleanedOn: null });
    const hDays = computeHealth({ days: [...days, { date: shift(to, 1), kwh: 0 }], today: shift(to, 1), capacityKw: cap, weather, cleanedOn: null });
    const hByDate = new Map(hDays.days.map((h) => [h.date, h]));

    const rows = days.map((d, i) => {
      const det = details[i], iv = inv[i], w = wx.get(d.date), h = hByDate.get(d.date);
      const p = h?.irradiation && cap && base.baseline ? (d.kwh / cap / h.irradiation) / base.baseline : null;
      const judged = d.date !== today && h?.status !== "no-data" && h?.status !== "too-cloudy";
      const status = d.date === today ? "in progress"
        : !h ? "" : h.status === "no-data" ? "no data" : h.status === "too-cloudy" ? "too cloudy to judge" : h.status === "no-generation" ? "no generation"
        : p === null ? "" : p >= 0.9 ? "good" : p >= 0.75 ? "slightly low" : "low";
      const gh = hoursBetween(det?.firstAt ?? null, det?.lastAt ?? null);
      return [
        d.date, new Date(d.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
        r(d.kwh, 2), cap ? r(d.kwh / cap, 2) : null,
        det?.peak ? r(det.peak.kw, 2) : null, det?.peak?.t ?? null, det?.firstAt ?? null, det?.lastAt ?? null, gh !== null ? r(gh, 2) : null,
        w ? r(w.radiationKwhM2, 2) : null, w ? r(w.rainMm, 1) : null,
        p !== null && judged ? r(p * 100, 0) : null, status,
        iv?.grid.min ? r(iv.grid.min.v, 1) : null, iv?.grid.max ? r(iv.grid.max.v, 1) : null, iv?.grid.max?.t ?? null,
        iv?.grid.hzMin ?? null, iv?.grid.hzMax ?? null, iv?.tempMax ? r(iv.tempMax.c, 1) : null, iv?.pvVMax ? r(iv.pvVMax, 1) : null,
        iv ? iv.events.filter((e) => e.kind === "stopped").length : null, iv ? iv.events.filter((e) => e.kind === "over-voltage").length : null,
        r(d.kwh * exportRate, 2), r(d.kwh * tariff, 2), currency, cap || null,
      ];
    });
    const header = ["date", "weekday", "energy_kwh", "specific_yield_kwh_per_kwp", "peak_power_kw", "peak_time", "first_generation", "last_generation",
      "generation_span_hours", "solar_irradiation_kwh_m2", "rain_mm", "performance_vs_best_pct", "status",
      "grid_voltage_min_v", "grid_voltage_max_v", "grid_voltage_max_time", "grid_frequency_min_hz", "grid_frequency_max_hz", "inverter_temp_max_c", "pv_voltage_max_v",
      "output_stops", "over_voltage_events", "value_min", "value_max", "currency", "plant_capacity_kwp"];
    return file(`helio-days-${from}_to_${to}.csv`, toCsv(header, rows));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/* ---------- Daily alert ---------- */
export async function report(demo: boolean) {
  const o = await overview(demo);
  const today = ymd(new Date());
  const loc = locationFor(o, new URLSearchParams(), demo);
  let weather: Weather[] | null = null;
  if (demo) weather = mockWeather(o.daily.map((d) => d.date));
  else if (loc) weather = await fetchWeather(loc.lat, loc.lon, 35, config.timezone).catch(() => null);
  const h = computeHealth({ days: o.daily, today, capacityKw: kwpOf(o), weather, cleanedOn: null });
  let day: InverterDay | null = null, live = null, collector = null, alarms: Alarm[] = [];
  if (demo) { day = mockInverterDay(today); live = mockLive(); collector = mockCollector; }
  else {
    const k = await getDeviceKey().catch(() => null);
    if (k?.key) {
      [collector, live, day] = await Promise.all([getCollector(k.key.pn, k.collectorStatus).catch(() => null), getLive(k.key).catch(() => null), getDeviceDay(k.key, today).catch(() => null)]);
      alarms = (await getAlarms(k.key, 2).catch(() => ({ items: [] as Alarm[] }))).items;
    }
  }
  return buildReport({ overview: o, kwp: kwpOf(o), today, timezone: config.timezone, locale: config.locale, health: h, day, live, collector, alarms, limits: GRID });
}

const dashboardUrl = () => process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

/** GET: what the next alert would say and which channels are set. POST: send it now (a test). */
export async function alerts(req: Request, demo: boolean) {
  try {
    if (req.method === "POST") {
      if (demo) return NextResponse.json({ error: "The demo can't send alerts. Set one up on your own copy." }, { status: 403 });
      if (!anyChannel()) return NextResponse.json({ error: "Telegram isn't connected yet. Tap Connect Telegram, then add the code as TELEGRAM_LINK." }, { status: 400 });
      const rep = await report(false);
      return NextResponse.json({ sent: await send({ ...rep, title: `Test: ${rep.title}` }, dashboardUrl()) }, { headers: noStore });
    }
    const rep = await report(demo);
    return NextResponse.json({ channels: demo ? { helioBot: false, ownBot: false, onlyIssues: false } : channels(), preview: rep }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** Called by Vercel Cron once a day. With CRON_SECRET set, Vercel sends "Authorization: Bearer $CRON_SECRET"
 *  and nothing else gets in. Without it, only requests that identify as Vercel Cron are accepted, at most once
 *  every 20 hours per server instance. The worst a spoofed call can do is send you your own summary early. */
let lastRun = 0;
export async function cronDaily(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) { if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  else {
    if (!/vercel-cron/i.test(req.headers.get("user-agent") ?? "")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (Date.now() - lastRun < 20 * 3600_000) return NextResponse.json({ skipped: "already ran today" });
  }
  if (!anyChannel()) return NextResponse.json({ skipped: "Telegram not connected" });
  try {
    lastRun = Date.now();
    const rep = await report(false);
    if (channels().onlyIssues && !rep.issues.length) return NextResponse.json({ skipped: "nothing to report (ALERT_ONLY_ISSUES)" });
    return NextResponse.json({ sent: await send(rep, dashboardUrl()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
