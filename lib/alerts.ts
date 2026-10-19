// Daily alert: one short message with today's units and anything that needs a look.
// Delivered on Telegram, either through the Helio Solar bot (TELEGRAM_LINK, the code the bot gives you) or
// through a bot of your own (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID).
import type { Health } from "@/lib/health";
import type { Alarm, Collector, InverterDay, Live } from "@/lib/inverter";
import type { Overview } from "@/lib/shinemonitor";

export type ReportInput = {
  overview: Overview;
  kwp: number;
  today: string;               // yyyy-mm-dd, plant time
  timezone: string;
  locale: string;
  health: Health | null;
  day: InverterDay | null;      // today's inverter rows
  live: Live | null;
  collector: Collector | null;
  alarms: Alarm[];              // recent alarms; today's are reported
  limits: { highV: number; lowV: number };
};
export type Card = {
  name: string; date: string; kwh: number; kwp: number; verdict: string; ok: boolean;
  stats: { value: string; label: string }[];
  rows: { label: string; value: string; tone: "ok" | "warn" | "muted" }[];
  curve: { t: string; kw: number }[];
  issues: string[];
};
export type Report = { title: string; body: string; html: string; caption: string; issues: string[]; priority: "default" | "high"; card: Card };

const t12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const f = (n: number, d = 1) => n.toFixed(d);
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const dur = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`);

/** The message, in a fixed order so it reads the same every day:
 *  headline → Generation → Health → Grid → System → To check. Sections only show lines that have data. */
export function buildReport(r: ReportInput): Report {
  const o = r.overview, issues: string[] = [];
  const dateLabel = new Date(r.today + "T12:00:00Z").toLocaleDateString(r.locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const sections: { name: string; lines: string[] }[] = [];

  /* Generation */
  const gen: string[] = [];
  if (r.kwp) gen.push(`${f(o.todayKwh / r.kwp, 2)} kWh per kWp of panels`);
  const t = r.health?.today;
  if (t?.low != null && t.high != null) gen.push(`Expected ${f(t.low, 0)}–${f(t.high, 0)} kWh for clean panels in today's sunshine`);
  if (o.yesterdayKwh) {
    const d = ((o.todayKwh - o.yesterdayKwh) / o.yesterdayKwh) * 100;
    gen.push(`Yesterday ${f(o.yesterdayKwh)} kWh, today ${Math.abs(d) < 0.5 ? "about the same" : `${f(Math.abs(d), 0)}% ${d > 0 ? "higher" : "lower"}`}`);
  }
  gen.push(`This month ${f(o.monthKwh, 0)} kWh so far`);
  sections.push({ name: "Generation", lines: gen });

  /* Health */
  const hl: string[] = [];
  const latest = r.health?.latest;
  const withData = (r.health?.days ?? []).filter((d) => d.status !== "no-data" && d.kwh > 0).length;
  if (latest?.score != null && ["good", "slightly-low", "low"].includes(latest.status)) {
    const word = latest.status === "good" ? "good" : latest.status === "low" ? "low" : "slightly low";
    hl.push(`Yesterday was ${word}: ${f(latest.score * 100, 0)}% of a good day for its sunshine`);
    if (latest.status === "low") issues.push(`Yesterday made ${f(latest.score * 100, 0)}% of a good day for its sunshine. If it repeats on sunny days, check for shade, dirt or a fault.`);
  } else if (latest?.status === "too-cloudy") hl.push("Yesterday was too cloudy to judge");
  else if (latest?.status === "no-generation") { hl.push("Yesterday: no units recorded"); issues.push("No units were recorded yesterday although it was sunny. Check the inverter and its WiFi stick."); }
  else hl.push(`Days are scored once there are 7 days of data (${withData} so far)`);
  const s = r.health?.soiling;
  const vs = s?.reference === "after-wash" ? "how they did after the last rain or cleaning" : "your best days";
  if (s?.advice === "clean" && s.lossPct !== null) { hl.push(`Panels: cleaning recommended, about ${f(s.lossPct * 100, 0)}% below ${vs}`); issues.push(`Clean the panels: recent sunny days are about ${f(s.lossPct * 100, 0)}% below ${vs}.`); }
  else if (s?.advice === "watch" && s.lossPct !== null) hl.push(`Panels: dust may be building, about ${f(s.lossPct * 100, 0)}% below ${vs}`);
  else if (s?.advice === "fine" && s.lossPct !== null) hl.push(`Panels: looking clean, within ${f(s.lossPct * 100, 0)}% of ${vs}`);
  else if (s) hl.push(`Panels: needs 4 sunny days since the last rain or cleaning to judge (${s.sunnyDays} so far)`);
  sections.push({ name: "Health", lines: hl });

  /* Grid */
  const day = r.day, gl: string[] = [];
  if (day?.grid.min && day.grid.max) {
    gl.push(`Voltage ${f(day.grid.min.v, 0)}–${f(day.grid.max.v, 0)} V, highest at ${t12(day.grid.max.t)} (standard limit ${f(r.limits.highV, 0)} V)`);
    const over = day.events.filter((e) => e.kind === "over-voltage");
    if (over.length) {
      const total = over.reduce((m, e) => m + (e.until ? mins(e.until) - mins(e.t) + 5 : 5), 0);
      const longest = over.reduce((a, e) => ((e.until ? mins(e.until) - mins(e.t) : 0) > (a.until ? mins(a.until) - mins(a.t) : 0) ? e : a));
      const ran = over.every((e) => /kept running/.test(e.detail));
      gl.push(`Above the limit ${over.length === 1 ? "once" : `${over.length} times`}, about ${dur(total)} in all; longest ${t12(longest.t)}${longest.until ? `–${t12(longest.until)}` : ""}${ran ? ". Inverter kept running" : ""}`);
      issues.push(`Grid voltage was above ${f(r.limits.highV, 0)} V for about ${dur(total)} (peak ${f(day.grid.max.v, 0)} V). Ask your electricity company to check the supply voltage.`);
    }
    const under = day.events.filter((e) => e.kind === "under-voltage");
    if (under.length) { gl.push(`Below ${f(r.limits.lowV, 0)} V ${under.length === 1 ? "once" : `${under.length} times`}, lowest ${f(day.grid.min.v, 0)} V`); issues.push(`Grid voltage dropped below ${f(r.limits.lowV, 0)} V (lowest ${f(day.grid.min.v, 0)} V).`); }
    if (!over.length && !under.length) gl.push("Within the standard range all day");
    if (day.grid.hzMin != null && day.grid.hzMax != null) {
      const bad = day.events.some((e) => e.kind === "frequency");
      gl.push(`Frequency ${f(day.grid.hzMin, 2)}–${f(day.grid.hzMax, 2)} Hz${bad ? ", outside the normal band" : ", normal"}`);
      if (bad) issues.push("Grid frequency left the normal band today.");
    }
    const stops = day.events.filter((e) => e.kind === "stopped");
    if (stops.length) {
      gl.push(`Output stopped: ${stops.map((e) => `${t12(e.t)}${e.until ? `–${t12(e.until)}` : ""}`).join(", ")}`);
      issues.push(stops.some((e) => /trip/.test(e.detail)) ? "The inverter likely tripped on high grid voltage and stopped producing." : `Output dropped to zero ${stops.length === 1 ? "once" : `${stops.length} times`} while the sun was up.`);
    }
    sections.push({ name: "Grid", lines: gl });
  }

  /* System */
  const sl: string[] = [];
  if (r.live?.status) {
    const ok = /normal|generat|run|on.?grid|standby|wait/i.test(r.live.status);
    sl.push(`Inverter: ${r.live.status}${day?.tempMax ? `, hottest ${f(day.tempMax.c, 0)} °C at ${t12(day.tempMax.t)}` : ""}`);
    if (!ok) issues.push(`The inverter reports "${r.live.status}".`);
  }
  // The stick often goes offline after sunset when the inverter powers down, so judge it by today's data.
  const last = day?.samples.at(-1)?.t ?? null;
  const now = new Date().toLocaleTimeString("en-GB", { timeZone: r.timezone, hour: "2-digit", minute: "2-digit", hour12: false });
  if (!last) { sl.push("WiFi stick: no data received today"); issues.push("No data reached ShineMonitor today. Check the WiFi stick's NET light and your 2.4 GHz WiFi."); }
  else if (mins(last) < 16 * 60 && mins(now) - mins(last) > 90) { sl.push(`WiFi stick: data stopped at ${t12(last)}`); issues.push(`No data since ${t12(last)}. Check the WiFi stick's NET light and your 2.4 GHz WiFi.`); }
  else sl.push(`WiFi stick: reported until ${t12(last)}${r.collector?.intervalSec ? `, every ${f(r.collector.intervalSec / 60, 0)} min` : ""}`);
  const todays = r.alarms.filter((a) => a.start.slice(0, 10) === r.today);
  if (!todays.length) sl.push("Alarms today: none");
  else {
    sl.push(`Alarms today: ${todays.length}`);
    for (const a of todays.slice(0, 3)) issues.push(`Inverter ${a.level} at ${t12(a.start.slice(11, 16))}: ${a.desc}${a.code ? ` (${a.code})` : ""}${a.cleared ? `, cleared ${t12(a.cleared.slice(11, 16))}` : ", not cleared"}.`);
  }
  sections.push({ name: "System", lines: sl });

  const name = o.plant.name || "Helio";
  const verdict = issues.length ? `${issues.length} ${issues.length === 1 ? "thing" : "things"} to check` : "all normal";
  const title = `${name} · ${f(o.todayKwh)} kWh · ${verdict}`;

  const plain = [
    `${name} · ${dateLabel}`,
    `${f(o.todayKwh)} kWh today · ${verdict}`,
    ...sections.flatMap((x) => ["", x.name, ...x.lines.map((l) => `• ${l}`)]),
    ...(issues.length ? ["", "To check", ...issues.map((i) => `• ${i}`)] : []),
  ].join("\n");
  const html = [
    `☀️ <b>${esc(name)}</b> · ${esc(dateLabel)}`,
    `<b>${f(o.todayKwh)} kWh</b> today · ${issues.length ? `⚠️ ${esc(verdict)}` : `✅ ${esc(verdict)}`}`,
    ...sections.flatMap((x) => ["", `<b>${esc(x.name)}</b>`, ...x.lines.map((l) => `• ${esc(l)}`)]),
    ...(issues.length ? ["", "<b>To check</b>", ...issues.map((i) => `• ${esc(i)}`)] : []),
  ].join("\n");

  const urgent = issues.some((i) => /No data|No units|tripped|fault|error/i.test(i));
  // The image card: the same facts, distilled to what reads at a glance on a phone.
  const st = (x: string, sw: string[]) => sections.find((y) => y.name === x)?.lines.find((l) => sw.some((w) => l.startsWith(w))) ?? null;
  const stats: Card["stats"] = [];
  if (r.kwp) stats.push({ value: f(o.todayKwh / r.kwp, 2), label: "kWh per kWp" });
  if (o.yesterdayKwh) { const d = ((o.todayKwh - o.yesterdayKwh) / o.yesterdayKwh) * 100; stats.push({ value: `${d >= 0 ? "+" : "−"}${f(Math.abs(d), 0)}%`, label: "vs yesterday" }); }
  stats.push({ value: f(o.monthKwh, 0), label: "kWh this month" });
  const rows: Card["rows"] = [];
  const yl = st("Health", ["Yesterday", "Days are scored"]);
  if (yl) rows.push({ label: "Yesterday", value: yl.replace(/^Yesterday( was)?:? ?/, "").replace(/^Days are scored once there are 7 days of data/, "Scored after 7 days of data"), tone: /low|no units/i.test(yl) ? "warn" : /good/.test(yl) ? "ok" : "muted" });
  const pl = st("Health", ["Panels"]);
  if (pl) rows.push({ label: "Panels", value: pl.replace(/^Panels: /, "").replace(/, (about|within).*$/, ""), tone: /cleaning recommended/.test(pl) ? "warn" : /clean/.test(pl) ? "ok" : "muted" });
  if (day?.grid.min && day.grid.max) rows.push({ label: "Grid", value: `${f(day.grid.min.v, 0)}–${f(day.grid.max.v, 0)} V`, tone: day.events.some((e) => e.kind !== "stopped") ? "warn" : "ok" });
  // System folds inverter, WiFi stick and alarms into one line; it turns amber if any of them needs a look.
  const il = st("System", ["Inverter"]), wl = st("System", ["WiFi stick"]), al = st("System", ["Alarms today"]);
  const sysBits = [il ? `Inverter ${il.replace(/^Inverter: /, "").replace(/, hottest.*$/, "").toLowerCase()}` : null,
    wl ? (/stopped|no data/.test(wl) ? wl.replace(/^WiFi stick: /, "") : "WiFi stick OK") : null,
    al ? (/none/.test(al) ? "no alarms" : al.replace(/^Alarms today: (\d+)/, "$1 alarms")) : null].filter(Boolean) as string[];
  if (sysBits.length) rows.push({ label: "System", value: sysBits.join(" · "), tone: issues.some((i) => /inverter reports|No data|Inverter (warning|error|fault|offline)/.test(i)) ? "warn" : "ok" });
  for (const r0 of rows) r0.value = r0.value.charAt(0).toUpperCase() + r0.value.slice(1);
  const card: Card = {
    name, date: dateLabel, kwh: o.todayKwh, kwp: r.kwp, verdict: verdict[0].toUpperCase() + verdict.slice(1), ok: !issues.length, stats, rows,
    curve: (day?.samples ?? []).filter((x) => x.w !== null).map((x) => ({ t: x.t, kw: (x.w ?? 0) / 1000 })),
    issues: issues.map((i) => i.split(". ")[0].replace(/\.$/, "")),
  };
  // Telegram caption: the verdict and what to do, under 1024 characters. Detail is in the image.
  const caption = [`☀️ <b>${esc(name)}</b> · ${esc(dateLabel)}`, `<b>${f(o.todayKwh)} kWh</b> today · ${issues.length ? `⚠️ ${esc(verdict)}` : `✅ ${esc(verdict)}`}`,
    ...(issues.length ? ["", ...issues.map((i) => `• ${esc(i)}`)] : [])].join("\n").slice(0, 900);
  return { title, body: plain, html, caption, issues, priority: urgent ? "high" : "default", card };
}

export const RELAY_URL = () => process.env.TELEGRAM_RELAY_URL || "https://helio.rishishah.in/api/telegram/send";

export function channels() {
  return {
    helioBot: !!process.env.TELEGRAM_LINK,
    ownBot: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    onlyIssues: /^(1|true|yes|on)$/i.test(process.env.ALERT_ONLY_ISSUES ?? ""),
  };
}
export const anyChannel = () => { const c = channels(); return c.helioBot || c.ownBot; };

/** Send to Telegram. Returns one result per configured route. */
/** Send to Telegram: the branded card image with a short caption, falling back to the full text message. */
export async function send(rep: Report, dashboardUrl?: string, opts: { test?: boolean } = {}): Promise<{ channel: string; ok: boolean; error?: string }[]> {
  const out: { channel: string; ok: boolean; error?: string }[] = [];
  const link = dashboardUrl ? `\n\n<a href="${dashboardUrl}">Open your dashboard</a>` : "";
  const prefix = opts.test ? "🧪 <i>Test alert</i>\n\n" : "";
  const text = `${prefix}${rep.html}${link}`;
  const caption = `${prefix}${rep.caption}${link}`;
  let png: Buffer | null = null;
  try { const { renderCard } = await import("@/lib/alert-card"); png = Buffer.from(await renderCard(rep.card)); } catch { png = null; }

  if (process.env.TELEGRAM_LINK) {
    try {
      const r = await fetch(RELAY_URL(), { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(png ? { link: process.env.TELEGRAM_LINK, caption, photo: png.toString("base64"), format: "html" } : { link: process.env.TELEGRAM_LINK, text, format: "html" }) });
      const j = await r.json().catch(() => ({}));
      out.push(r.ok && j.ok ? { channel: "Helio Solar bot", ok: true } : { channel: "Helio Solar bot", ok: false, error: j.error || `HTTP ${r.status}` });
    } catch (e) { out.push({ channel: "Helio Solar bot", ok: false, error: (e as Error).message }); }
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const api = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
      let r: Response;
      if (png) {
        const fd = new FormData();
        fd.append("chat_id", process.env.TELEGRAM_CHAT_ID); fd.append("caption", caption); fd.append("parse_mode", "HTML");
        fd.append("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "helio.png");
        r = await fetch(`${api}/sendPhoto`, { method: "POST", body: fd });
      } else r = await fetch(`${api}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }) });
      const j = await r.json().catch(() => ({}));
      out.push(r.ok && j.ok ? { channel: "your bot", ok: true } : { channel: "your bot", ok: false, error: j.description || `HTTP ${r.status}` });
    } catch (e) { out.push({ channel: "your bot", ok: false, error: (e as Error).message }); }
  }
  return out;
}
