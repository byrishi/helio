// Inverter-level data from ShineMonitor: live readings, 5-minute history, alarms and the WiFi datalogger.
// Field names differ between inverter protocols, so readings are matched by title and anything the
// inverter doesn't report is left out rather than guessed.
import { rawCall, getPlantId, ymd, mockDay } from "@/lib/shinemonitor";
import { config } from "@/lib/config";

export type DeviceKey = { pn: string; devcode: number; devaddr: number; sn: string };
export type Reading = { title: string; unit: string; val: string };
export type Pv = { n: number; v: number; a: number; w: number };
export type Live = {
  at: string | null;                 // inverter timestamp (plant time)
  status: string | null;             // e.g. "Normal"
  standard: string | null;           // grid safety standard, e.g. "IEC 61727"
  powerW: number | null;
  pv: Pv[];                          // only strings that report a voltage
  grid: { v: number | null; hz: number | null; phases: { name: string; v: number }[] };
  temps: { name: string; c: number }[];
};
export type DaySample = { t: string; w: number | null; pvV: number | null; pvA: number | null; gridV: number | null; hz: number | null; temp: number | null };
export type DayEvent = { kind: "stopped" | "over-voltage" | "under-voltage" | "frequency"; t: string; until: string | null; detail: string };
export type InverterDay = {
  date: string;
  samples: DaySample[];
  grid: { min: { v: number; t: string } | null; max: { v: number; t: string } | null; hzMin: number | null; hzMax: number | null };
  tempMax: { c: number; t: string; name: string } | null;
  pvVMax: number | null;
  events: DayEvent[];
};
export type Alarm = { level: "warning" | "error" | "fault" | "offline" | "unknown"; code: string | null; desc: string; start: string; cleared: string | null; handled: boolean };
export type Collector = { online: boolean; status: number; firmware: string | null; intervalSec: number | null; panels: { count: number; watt: number; kwp: number } | null };

export const DEVICE_STATUS: Record<number, string> = { 0: "Online", 1: "Offline", 2: "Fault", 3: "Standby", 4: "Warning", 5: "Error", 6: "Protocol error" };
const LEVEL: Record<number, Alarm["level"]> = { 0: "warning", 1: "error", 2: "fault", 3: "offline" };

// IEC 61727 (the utility-interface standard many inverters ship with): disconnect when the grid leaves
// 85–110% of nominal voltage or ±1 Hz of nominal frequency. Nominal comes from GRID_VOLTAGE / GRID_FREQUENCY
// (default 230 V / 50 Hz).
export const GRID = (() => {
  const v = config.gridVoltage, hz = config.gridFrequency;
  return { nominalV: v, highV: +(v * 1.1).toFixed(1), lowV: +(v * 0.85).toFixed(1), nominalHz: hz, hzBand: 1 };
})();

// "Internal radiator temperature" → "Heatsink", "Internal ambient temperature" → "Internal".
export const tempName = (t: string) => /radiator|heat\s?sink/i.test(t) ? "Heatsink" : /ambient|internal|inner/i.test(t) ? "Internal" : /module|igbt/i.test(t) ? "Module" : t.replace(/temperature/i, "").trim() || "Inverter";
const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : null; };

let keyCache: { at: number; key: DeviceKey | null; collectorStatus: number; deviceStatus: number } | null = null;
export async function getDeviceKey() {
  if (keyCache && Date.now() - keyCache.at < 30 * 60_000) return keyCache;
  const plantid = await getPlantId();
  const r = await rawCall({ action: "queryPlantDeviceStatus", plantid });
  const c = r.ok ? r.dat?.collector?.[0] : null;
  const d = c?.device?.[0];
  keyCache = { at: Date.now(), key: c && d ? { pn: c.pn, devcode: d.devcode, devaddr: d.devaddr, sn: d.sn } : null, collectorStatus: Number(c?.status ?? 1), deviceStatus: Number(d?.status ?? 1) };
  return keyCache;
}

export async function getCollector(pn: string, status: number): Promise<Collector> {
  const r = await rawCall({ action: "queryCollectorInfo", pn });
  const c = r.ok ? r.dat?.collector?.[0] : null;
  const count = n(c?.panelCount), watt = n(c?.panelWatt);
  return {
    online: status === 0,
    status,
    firmware: c?.fireware ?? c?.firmware ?? null,           // ShineMonitor spells it "fireware"
    intervalSec: n(c?.datFetch),
    panels: count && watt ? { count, watt, kwp: (count * watt) / 1000 } : null,
  };
}

/** Parse a list of titled readings into the fields we use. */
export function parseLive(fields: Reading[]): Live {
  const find = (re: RegExp) => fields.find((f) => re.test(f.title.trim()));
  const pv: Pv[] = [];
  for (const f of fields) {
    const m = /^PV\s?(\d+)\s*(input\s*)?voltage/i.exec(f.title.trim());
    if (!m) continue;
    const v = n(f.val) ?? 0;
    const a = n(fields.find((g) => new RegExp(`^PV\\s?${m[1]}\\s*(input\\s*)?current`, "i").test(g.title.trim()))?.val) ?? 0;
    if (v > 0 || a > 0) pv.push({ n: Number(m[1]), v, a, w: v * a });
  }
  const phases = ["R", "S", "T"].map((p) => ({ name: p, v: n(find(new RegExp(`^Grid ${p} voltage`, "i"))?.val) ?? 0 })).filter((p) => p.v > 0);
  const single = n(find(/^(Grid|AC)( output)? voltage$/i)?.val);
  return {
    at: find(/^(timestamp|时间戳)$/i)?.val ?? null,
    status: find(/inverter status|^status$/i)?.val ?? null,
    standard: find(/security type|safety|country/i)?.val ?? null,
    powerW: n(find(/^output power$/i)?.val),
    pv,
    grid: { v: phases[0]?.v ?? single ?? null, hz: n(find(/grid frequency|ac frequency/i)?.val), phases },
    temps: fields.filter((f) => /temperature/i.test(f.title) && n(f.val) !== null && n(f.val)! > -40).map((f) => ({ name: tempName(f.title), c: n(f.val)! })),
  };
}

export async function getLive(key: DeviceKey): Promise<Live | null> {
  const r = await rawCall({ action: "queryDeviceLastData", i18n: "en_US", ...key });
  return r.ok && Array.isArray(r.dat) ? parseLive(r.dat.map((f: any) => ({ title: String(f.title ?? ""), unit: String(f.unit ?? ""), val: String(f.val ?? "") }))) : null;
}

/** All 5-minute rows for a day (the API pages at 50 rows). */
export async function getDeviceDay(key: DeviceKey, date: string): Promise<InverterDay> {
  let titles: string[] = []; const rows: string[][] = [];
  for (let page = 0; page < 8; page++) {
    const r = await rawCall({ action: "queryDeviceDataOneDayPaging", i18n: "en_US", ...key, date, page, pagesize: 50 });
    if (!r.ok) break;
    titles = (r.dat?.title ?? []).map((t: any) => String(t.title ?? ""));
    const got: string[][] = (r.dat?.row ?? []).map((x: any) => x.field ?? x.filed ?? []);
    rows.push(...got);
    if (rows.length >= Number(r.dat?.total ?? 0) || got.length < 50) break;
  }
  return summariseDay(date, titles, rows);
}

export function summariseDay(date: string, titles: string[], rows: string[][]): InverterDay {
  const idx = (re: RegExp) => titles.findIndex((t) => re.test(t.trim()));
  const iT = idx(/^(timestamp|时间戳)$/i), iW = idx(/^output power$/i), iV = idx(/^PV\s?1\s*(input\s*)?voltage/i), iA = idx(/^PV\s?1\s*(input\s*)?current/i);
  const iG = (() => { const r = idx(/^Grid R voltage/i); return r >= 0 ? r : idx(/^(Grid|AC)( output)? voltage$/i); })();
  const iHz = idx(/grid frequency|ac frequency/i);
  const tempIdx = titles.map((t, i) => (/temperature/i.test(t) ? i : -1)).filter((i) => i >= 0);
  const val = (r: string[], i: number) => (i >= 0 ? n(r[i]) : null);
  const samples: DaySample[] = rows
    .map((r) => ({
      t: String(r[iT >= 0 ? iT : 1] ?? "").slice(11, 16),
      w: val(r, iW), pvV: val(r, iV), pvA: val(r, iA), gridV: val(r, iG), hz: val(r, iHz),
      temp: tempIdx.length ? Math.max(...tempIdx.map((i) => val(r, i) ?? -99)) : null,
    }))
    .filter((s) => /^\d\d:\d\d$/.test(s.t))
    .sort((a, b) => a.t.localeCompare(b.t));
  for (const s of samples) if (s.temp !== null && s.temp < -40) s.temp = null;

  const withV = samples.filter((s) => s.gridV !== null && s.gridV > 0);
  const withHz = samples.filter((s) => s.hz !== null && s.hz > 0);
  const minV = withV.reduce<DaySample | null>((m, s) => (!m || s.gridV! < m.gridV! ? s : m), null);
  const maxV = withV.reduce<DaySample | null>((m, s) => (!m || s.gridV! > m.gridV! ? s : m), null);
  let tempMax: InverterDay["tempMax"] = null;
  for (const r of rows) for (const i of tempIdx) { const c = n(r[i]); if (c !== null && c > -40 && (!tempMax || c > tempMax.c)) tempMax = { c, t: String(r[iT >= 0 ? iT : 1]).slice(11, 16), name: tempName(titles[i]) }; }

  // Events. A stop is a run of zero-output samples between producing samples, at least 10 minutes long.
  const events: DayEvent[] = [];
  const producing = samples.map((s) => (s.w ?? 0) > 0);
  const first = producing.indexOf(true), last = producing.lastIndexOf(true);
  if (first >= 0) {
    for (let i = first + 1; i < last; i++) {
      if (producing[i]) continue;
      let j = i; while (j < last && !producing[j]) j++;
      const start = samples[i].t, end = samples[j].t;
      const mins = (+end.slice(0, 2) * 60 + +end.slice(3)) - (+start.slice(0, 2) * 60 + +start.slice(3));
      if (mins >= 10) {
        const before = samples.slice(Math.max(0, i - 3), i + 1).map((s) => s.gridV ?? 0);
        const peak = Math.max(...before);
        events.push({ kind: "stopped", t: start, until: end, detail: peak >= GRID.highV - 3
          ? `Output dropped to zero for ${mins} min. Grid was ${peak.toFixed(1)} V just before, ${peak > GRID.highV ? "above" : "close to"} the ${GRID.highV} V limit, so a high-voltage trip is likely.`
          : `Output dropped to zero for ${mins} min. Heavy cloud or rain can do this; so can a grid outage or an inverter fault.` });
      }
      i = j;
    }
  }
  const runs = (test: (s: DaySample) => boolean, kind: DayEvent["kind"], label: (s: DaySample) => string) => {
    for (let i = 0; i < samples.length; i++) {
      if (!test(samples[i])) continue;
      let j = i; let worst = samples[i];
      while (j + 1 < samples.length && test(samples[j + 1])) { j++; if (kind === "under-voltage" ? samples[j].gridV! < worst.gridV! : (samples[j].gridV ?? 0) > (worst.gridV ?? 0)) worst = samples[j]; }
      events.push({ kind, t: samples[i].t, until: j > i ? samples[j].t : null, detail: label(worst) });
      i = j;
    }
  };
  runs((s) => (s.gridV ?? 0) > GRID.highV, "over-voltage", (s) => `Peaked at ${s.gridV!.toFixed(1)} V, above ${GRID.highV} V (${GRID.nominalV} V + 10%).`);
  runs((s) => s.gridV !== null && s.gridV > 0 && s.gridV < GRID.lowV && (s.w ?? 0) > 0, "under-voltage", (s) => `Fell to ${s.gridV!.toFixed(1)} V, below ${GRID.lowV} V (${GRID.nominalV} V − 15%).`);
  runs((s) => s.hz !== null && s.hz > 0 && Math.abs(s.hz - GRID.nominalHz) > GRID.hzBand, "frequency", (s) => `Grid frequency was ${s.hz!.toFixed(2)} Hz, outside ${GRID.nominalHz - GRID.hzBand}–${GRID.nominalHz + GRID.hzBand} Hz.`);
  // Whether the inverter kept producing through each voltage/frequency event tells you its real trip setting.
  for (const e of events) {
    if (e.kind === "stopped") continue;
    const span = samples.filter((s) => s.t >= e.t && s.t <= (e.until ?? e.t));
    if (span.length && span.every((s) => (s.w ?? 0) > 0)) e.detail += " The inverter kept running, so its trip setting is above this.";
  }
  events.sort((a, b) => a.t.localeCompare(b.t));

  return {
    date,
    samples,
    grid: {
      min: minV ? { v: minV.gridV!, t: minV.t } : null,
      max: maxV ? { v: maxV.gridV!, t: maxV.t } : null,
      hzMin: withHz.length ? Math.min(...withHz.map((s) => s.hz!)) : null,
      hzMax: withHz.length ? Math.max(...withHz.map((s) => s.hz!)) : null,
    },
    tempMax,
    pvVMax: samples.some((s) => s.pvV !== null) ? Math.max(...samples.map((s) => s.pvV ?? 0)) : null,
    events,
  };
}

/** Alarms raised in the last `days` days, newest first. */
export async function getAlarms(key: DeviceKey, days = 180): Promise<{ items: Alarm[]; error: string | null }> {
  const fmt = (d: Date) => d.toLocaleString("sv-SE", { timeZone: config.timezone }).slice(0, 19); // device time zone
  const now = new Date(), from = new Date(now.getTime() - days * 86400000);
  const items: Alarm[] = [];
  for (let page = 0; page < 4; page++) {
    const r = await rawCall({ action: "queryDeviceWarning", i18n: "en_US", ...key, sdate: fmt(from), edate: fmt(new Date(now.getTime() + 60_000)), page, pagesize: 50 });
    if (!r.ok) {
      // "No alarms" comes back as an error code; that's a normal, empty result.
      if (/0x0108|0x000c|NO_RECORD|NOT_FOUND_DEVICE_WARNING/i.test(r.error)) break;
      return { items, error: r.error };
    }
    const list: any[] = r.dat?.warning ?? [];
    for (const w of list) items.push({ level: LEVEL[Number(w.level)] ?? "unknown", code: w.code != null && w.code !== "" ? String(w.code) : null, desc: String(w.desc ?? "Alarm"), start: String(w.gts ?? ""), cleared: w.cts ? String(w.cts) : null, handled: !!w.handle });
    if (items.length >= Number(r.dat?.total ?? 0) || list.length < 50) break;
  }
  items.sort((a, b) => b.start.localeCompare(a.start));
  return { items, error: null };
}

export const todayPlant = () => ymd(new Date());

/* ---------- Demo data (SHINE_MOCK=1), derived from the same mock power curve ---------- */
const MOCK_TITLES = ["id", "Timestamp", "Output Power", "PV1 voltage", "PV1 current", "Grid R voltage", "Grid frequency", "Internal ambient temperature", "Internal radiator temperature"];
function mockRows(date: string): string[][] {
  return mockDay(date).curve.map((p, i) => {
    const m = +p.t.slice(0, 2) * 60 + +p.t.slice(3);
    const w = p.kw * 1000;
    const gridV = 238 + 7 * Math.sin((m - 600) / 140) + (w / 5400) * 6 + ((i * 7) % 5) * 0.3;
    const pvV = w > 0 ? 380 + 90 * Math.min(1, w / 1500) : 0;
    const amb = 31 + 22 * (w / 5400) + Math.max(0, (m - 720) / 120);
    return [String(i), `${date} ${p.t}:00`, w.toFixed(0), pvV.toFixed(1), (pvV ? w / pvV : 0).toFixed(1), gridV.toFixed(1), (50 + (((i * 13) % 7) - 3) * 0.01).toFixed(2), amb.toFixed(1), (amb - 3).toFixed(1)];
  });
}
export function mockInverterDay(date: string) { return summariseDay(date, MOCK_TITLES, mockRows(date)); }
export function mockLive(): Live {
  const rows = mockRows(ymd(new Date())); const r = rows.at(-1);
  const fields: Reading[] = r ? MOCK_TITLES.map((t, i) => ({ title: t, unit: "", val: r[i] })) : [];
  return { ...parseLive(fields), status: "Normal", standard: "IEC 61727" };
}
export const mockCollector: Collector = { online: true, status: 0, firmware: "8.4.4.11", intervalSec: 300, panels: { count: 12, watt: 450, kwp: 5.4 } };
