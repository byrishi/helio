// Minimal ShineMonitor (Eybond) client — the cloud behind the SmartClient app.
// Auth flow per https://api.shinemonitor.com/chapter1/apiHelp.html
import { createHash } from "crypto";

const BASE = process.env.SHINE_BASE_URL || "https://web.shinemonitor.com/public/";
// Company key used by the ShineMonitor web portal. Override in .env if auth fails.
const COMPANY_KEY = process.env.SHINE_COMPANY_KEY || "bnrl_frRFjEz8Mkn";
// Match the ShineMonitor web portal exactly: no extra params. (source=1 would mean the storage platform → ERR_NOT_FOUND_USR for PV accounts.)
const SUFFIX = process.env.SHINE_SUFFIX ?? "";

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");

type Session = { token: string; secret: string; expiresAt: number };
let session: Session | null = null;

export class ShineError extends Error {
  constructor(public code: number, desc: string) {
    super(`ShineMonitor err 0x${code.toString(16).padStart(4, "0")}: ${desc}`);
  }
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ShineMonitor`);
  const j = await res.json();
  if (j.err !== 0) throw new ShineError(j.err, j.desc);
  return j.dat;
}

async function login(): Promise<Session> {
  const usr = process.env.SHINE_USER;
  const pwd = process.env.SHINE_PASS;
  if (!usr || !pwd) throw new Error("Set SHINE_USER and SHINE_PASS in .env.local");
  const salt = Date.now().toString();
  const action = `&action=auth&usr=${encodeURIComponent(usr)}&company-key=${COMPANY_KEY}${SUFFIX}`;
  const sign = sha1(salt + sha1(pwd) + action);
  const dat = await getJson(`${BASE}?sign=${sign}&salt=${salt}${action}`);
  return { token: dat.token, secret: dat.secret, expiresAt: Date.now() + (dat.expire - 300) * 1000 };
}

async function call(params: Record<string, string | number>, retry = true): Promise<any> {
  if (!session || Date.now() > session.expiresAt) session = await login();
  const qs = Object.entries(params).map(([k, v]) => `&${k}=${encodeURIComponent(String(v))}`).join("");
  const action = qs + SUFFIX; // must start with &action=
  const salt = Date.now().toString();
  const sign = sha1(salt + session.secret + session.token + action);
  try {
    return await getJson(`${BASE}?sign=${sign}&salt=${salt}&token=${session.token}${action}`);
  } catch (e) {
    // token expired / invalid → re-login once
    if (retry && e instanceof ShineError && [0x0002, 0x0005, 0x000f, 0x0010].includes(e.code)) {
      session = null;
      return call(params, false);
    }
    throw e;
  }
}

/** Raw signed call, for the diagnostics route. Errors come back as values, not throws. */
export async function rawCall(params: Record<string, string | number>) {
  try { return { ok: true as const, dat: await call(params) }; }
  catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

const num = (v: unknown) => (v == null || v === "" ? 0 : Number(v));

// Resolve the plant from the account itself (cached per server instance).
// SHINE_PLANT_ID only picks between plants if the account has several; a wrong value can't break it.
let plantIdCache: number | null = null;
export async function getPlantId(): Promise<number> {
  if (plantIdCache) return plantIdCache;
  const dat = await call({ action: "queryPlants", page: 0, pagesize: 50 });
  const plants: { pid: number }[] = dat?.plant ?? [];
  if (!plants.length) throw new Error("No plant found on this ShineMonitor account");
  const want = Number(process.env.SHINE_PLANT_ID);
  plantIdCache = (plants.find((p) => p.pid === want) ?? plants[0]).pid;
  return plantIdCache;
}


const TZ = process.env.TIMEZONE || "Asia/Kolkata";
export const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // yyyy-mm-dd
// Pure calendar arithmetic on yyyy-mm-dd, independent of the server and plant time zones.
const shift = (date: string, days: number) => new Date(Date.parse(date + "T12:00:00Z") + days * 86400000).toISOString().slice(0, 10);

// "No record" (0x000C) just means the inverter hasn't reported for that period yet
async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch (e) { if (e instanceof ShineError && e.code === 0x000c) return fallback; throw e; }
}

export type Point = { t: string; kw: number };
export type DayUnits = { date: string; kwh: number };

export type Overview = {
  plant: { id: number; name: string; capacityKw: number; installed: string | null; panelKwp?: number | null; panels?: { count: number; watt: number } | null };
  location: { lat: number; lon: number; source: "plant" | "settings" } | null; // for weather-based health
  nowKw: number;
  todayKwh: number;
  yesterdayKwh: number;
  monthKwh: number;
  yearKwh: number;
  totalKwh: number;
  daily: DayUnits[];               // last 30 days, oldest first, includes today
  months: { m: number; kwh: number }[]; // this year, Jan..Dec
  lastReadingAt: string | null;    // timestamp of the most recent inverter sample (plant tz)
  fetchedAt: string;
};

export type DayDetail = {
  date: string;
  kwh: number;
  curve: Point[];
  peak: Point | null;
  firstAt: string | null;
  lastAt: string | null;
};

const capKw = (v: unknown) => { const n = num(v); return n > 100 ? n / 1000 : n; };
// The API returns all 288 five-minute slots for a day, including ones still in the future.
// Keep only real samples: drop slots after "now" for today, and drop empty (null/"") values.
const nowHHMM = () => new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const curveOf = (dat: any, date?: string): Point[] => {
  const isToday = date === ymd(new Date());
  const cutoff = nowHHMM();
  return (dat?.outputPower ?? [])
    .filter((p: any) => p.val !== null && p.val !== undefined && p.val !== "")
    .map((p: any) => ({ t: String(p.ts).slice(11, 16), kw: num(p.val) }))
    .filter((p: Point) => !isToday || p.t <= cutoff);
};
// Last moment the inverter actually produced: the last non-zero sample, or null.
const lastLive = (pts: Point[]) => { for (let i = pts.length - 1; i >= 0; i--) if (pts[i].kw > 0) return pts[i].t; return null; };

export async function getOverview(): Promise<Overview> {
  const plantid = await getPlantId();
  const today = ymd(new Date());
  const yesterday = shift(today, -1);
  const month = today.slice(0, 7);
  const prevMonth = shift(month + "-01", -1).slice(0, 7);
  const year = today.slice(0, 4);

  const [info, power, eToday, eYesterday, eTotal, perDay, perDayPrev, perMonth, curve] = await Promise.all([
    safe(call({ action: "queryPlantInfo", plantid }), null as any),
    safe(call({ action: "queryPlantActiveOuputPowerCurrent", plantid }), { outputPower: 0 }),
    safe(call({ action: "queryPlantEnergyDay", plantid, date: today }), { energy: 0 }),
    safe(call({ action: "queryPlantEnergyDay", plantid, date: yesterday }), { energy: 0 }),
    safe(call({ action: "queryPlantEnergyTotal", plantid }), { energy: 0 }),
    safe(call({ action: "queryPlantEnergyMonthPerDay", plantid, date: month }), { perday: [] }),
    safe(call({ action: "queryPlantEnergyMonthPerDay", plantid, date: prevMonth }), { perday: [] }),
    safe(call({ action: "queryPlantEnergyYearPerMonth", plantid, date: year }), { permonth: [] }),
    safe(call({ action: "queryPlantActiveOuputPowerOneDay", plantid, date: today }), { outputPower: [] }),
  ]);

  const todayKwh = num(eToday.energy);
  const byDate = new Map<string, number>();
  for (const p of [...(perDayPrev.perday ?? []), ...(perDay.perday ?? [])]) byDate.set(String(p.ts).slice(0, 10), num(p.val));
  byDate.set(today, todayKwh);                       // the day counter is the freshest figure for today
  byDate.set(yesterday, num(eYesterday.energy) || byDate.get(yesterday) || 0);

  const daily: DayUnits[] = [];
  for (let i = 29; i >= 0; i--) { const d = shift(today, -i); daily.push({ date: d, kwh: byDate.get(d) ?? 0 }); }

  const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, kwh: 0 }));
  for (const p of perMonth.permonth ?? []) { const m = Number(String(p.ts).slice(5, 7)); if (m) months[m - 1].kwh = num(p.val); }
  const monthKwh = [...byDate].filter(([d]) => d.startsWith(month)).reduce((s, [, v]) => s + v, 0);
  months[Number(month.slice(5)) - 1].kwh = Math.max(months[Number(month.slice(5)) - 1].kwh, monthKwh);

  const pts = curveOf(curve, today);
  return {
    plant: { id: plantid, name: info?.name || "Home Solar", capacityKw: capKw(info?.nominalPower), installed: info?.install ?? null },
    location: locationOf(info),
    nowKw: num(power.outputPower),
    todayKwh,
    yesterdayKwh: byDate.get(yesterday) ?? 0,
    monthKwh,
    yearKwh: months.reduce((s, m) => s + m.kwh, 0),
    totalKwh: num(eTotal.energy),
    daily,
    months,
    lastReadingAt: lastLive(pts) ? `${today} ${lastLive(pts)}` : null,
    fetchedAt: new Date().toISOString(),
  };
}

// Site coordinates, most specific first: SITE_LAT / SITE_LON if you set them, otherwise the location
// saved on your ShineMonitor plant (most installers fill it in), otherwise none.
export const validLatLon = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && !(a === 0 && b === 0) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
function locationOf(info: any): Overview["location"] {
  const ea = Number(process.env.SITE_LAT), eo = Number(process.env.SITE_LON);
  if (process.env.SITE_LAT && process.env.SITE_LON && validLatLon(ea, eo)) return { lat: ea, lon: eo, source: "settings" };
  const pa = Number(info?.address?.lat ?? info?.lat), po = Number(info?.address?.lon ?? info?.lon);
  return validLatLon(pa, po) ? { lat: pa, lon: po, source: "plant" } : null;
}

export async function getDay(date: string): Promise<DayDetail> {
  const plantid = await getPlantId();
  const [e, c] = await Promise.all([
    safe(call({ action: "queryPlantEnergyDay", plantid, date }), { energy: 0 }),
    safe(call({ action: "queryPlantActiveOuputPowerOneDay", plantid, date }), { outputPower: [] }),
  ]);
  return dayFrom(date, num(e.energy), curveOf(c, date));
}

/** Daily units for one month (yyyy-mm) from the inverter's day counters. */
export async function getMonthDays(month: string): Promise<DayUnits[]> {
  const plantid = await getPlantId();
  const dat = await call({ action: "queryPlantEnergyMonthPerDay", plantid, date: month });
  return (dat?.perday ?? []).map((p: any) => ({ date: String(p.ts).slice(0, 10), kwh: num(p.val) }));
}

/** Monthly units for one year (yyyy). */
export async function getYearMonths(year: string): Promise<{ m: number; kwh: number }[]> {
  const out = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, kwh: 0 }));
  const plantid = await getPlantId();
  const dat = await call({ action: "queryPlantEnergyYearPerMonth", plantid, date: year });
  for (const p of dat?.permonth ?? []) { const m = Number(String(p.ts).slice(5, 7)); if (m) out[m - 1].kwh = num(p.val); }
  return out;
}

export function mockMonthDays(month: string): DayUnits[] {
  const today = ymd(new Date()); const out: DayUnits[] = [];
  for (let d = month + "-01"; d.startsWith(month) && d <= today; d = shift(d, 1)) out.push({ date: d, kwh: mockDay(d).kwh });
  return out;
}

export { shift };

export function mockYearMonths(year: string) {
  return Array.from({ length: 12 }, (_, i) => ({ m: i + 1, kwh: +mockMonthDays(`${year}-${String(i + 1).padStart(2, "0")}`).reduce((s, d) => s + d.kwh, 0).toFixed(1) }));
}

function dayFrom(date: string, kwh: number, curve: Point[]): DayDetail {
  const live = curve.filter((p) => p.kw > 0);
  const peak = curve.reduce<Point | null>((m, p) => (!m || p.kw > m.kw ? p : m), null);
  return { date, kwh, curve, peak: peak && peak.kw > 0 ? peak : null, firstAt: live[0]?.t ?? null, lastAt: live[live.length - 1]?.t ?? null };
}

/** Mock weather that matches the mock curves: the same seeded "cloud" factor drives both. */
export function mockWeather(dates: string[]) {
  return dates.map((date) => { const r = seeded(date); const cloud = 0.75 + r() * 0.25; return { date, radiationKwhM2: +(6.4 * cloud).toFixed(2), rainMm: mockDaysSinceWash(date) === 0 ? 14 : 0 }; });
}
// Demo soiling: a wash every 21 days, then output drifts down ~0.7% a day as dust builds up.
const mockDaysSinceWash = (date: string) => Math.floor(Date.parse(date + "T00:00:00Z") / 86_400_000) % 21;

/* ---------- Mock data (SHINE_MOCK=1) for previewing without an account ---------- */
function seeded(seed: string) { let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0; return () => ((h = (h * 1103515245 + 12345) | 0) >>> 0) / 2 ** 32; }

function mockCurve(date: string, upTo?: number): Point[] {
  const r = seeded(date); const cloud = 0.75 + r() * 0.25; const dust = 1 - 0.007 * mockDaysSinceWash(date); const out: Point[] = [];
  for (let m = 6 * 60 + 25; m <= 18 * 60 + 5; m += 5) {
    if (upTo !== undefined && m > upTo) break;
    const x = (m - 12.6 * 60) / 175; const dip = r() < 0.04 ? 0.88 : 1;
    out.push({ t: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, kw: +Math.max(0, 4.95 * cloud * dust * Math.exp(-x * x) * dip * (0.95 + r() * 0.05)).toFixed(3) });
  }
  return out;
}
const kwhOf = (c: Point[]) => +(c.reduce((s, p) => s + p.kw * (5 / 60), 0)).toFixed(1);
const nowMin = () => { const [h, m] = new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour12: false }).split(":").map(Number); return h * 60 + m; };

export function mockDay(date: string): DayDetail {
  const today = ymd(new Date());
  if (date > today) return dayFrom(date, 0, []);
  const c = mockCurve(date, date === today ? nowMin() : undefined);
  return dayFrom(date, kwhOf(c), c);
}

export function mockOverview(): Overview {
  const today = ymd(new Date());
  const daily = Array.from({ length: 30 }, (_, i) => { const d = shift(today, i - 29); return { date: d, kwh: mockDay(d).kwh }; });
  const t = mockDay(today);
  const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, kwh: 0 }));
  const cm = Number(today.slice(5, 7));
  for (let i = 0; i < cm - 1; i++) months[i].kwh = Math.round(560 + Math.sin((i / 11) * Math.PI) * 140 + seeded("m" + i)() * 90);
  const monthKwh = +daily.filter((d) => d.date.startsWith(today.slice(0, 7))).reduce((s, d) => s + d.kwh, 0).toFixed(1);
  months[cm - 1].kwh = monthKwh;
  const yearKwh = months.reduce((s, m) => s + m.kwh, 0);
  return {
    plant: { id: 1, name: "Demo Rooftop", capacityKw: 5.4, installed: "2023-02-14" },
    location: { lat: 0, lon: 0, source: "settings" }, // demo only; its weather is generated, never fetched
    nowKw: t.curve.at(-1)?.kw ?? 0, todayKwh: t.kwh, yesterdayKwh: daily[28].kwh, monthKwh, yearKwh,
    totalKwh: +(yearKwh + 13480).toFixed(1), daily, months,
    lastReadingAt: t.lastAt ? `${today} ${t.curve.at(-1)!.t}` : null, fetchedAt: new Date().toISOString(),
  };
}
