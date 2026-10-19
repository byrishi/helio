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
export type Report = { title: string; body: string; issues: string[]; priority: "default" | "high" };

const t12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const f = (n: number, d = 1) => n.toFixed(d);

export function buildReport(r: ReportInput): Report {
  const o = r.overview, issues: string[] = [], lines: string[] = [];
  const dateLabel = new Date(r.today + "T12:00:00Z").toLocaleDateString(r.locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  // Units
  const est = r.health?.today.expectedKwh != null && r.health.today.low != null && r.health.today.high != null
    ? ` · expected ${f(r.health.today.low, 0)}–${f(r.health.today.high, 0)} for a clean system` : "";
  lines.push(`${f(o.todayKwh)} kWh today${r.kwp ? ` (${f(o.todayKwh / r.kwp, 2)} kWh/kWp)` : ""}${est}`);
  if (o.yesterdayKwh) lines.push(`Yesterday ${f(o.yesterdayKwh)} kWh · this month ${f(o.monthKwh, 0)} kWh`);

  // WiFi stick and inverter state
  if (r.collector && !r.collector.online) issues.push("WiFi stick is offline, so no new data is reaching ShineMonitor. Check its NET light and your 2.4 GHz WiFi.");
  if (r.live?.status && !/normal|generat|run|on.?grid|standby|wait/i.test(r.live.status)) issues.push(`Inverter status: ${r.live.status}.`);
  if (o.todayKwh === 0 && r.health?.today.forecastIrradiation && r.health.today.forecastIrradiation >= 1.5) issues.push("No units recorded today, though it was forecast to be sunny.");

  // Health and cleaning
  const latest = r.health?.latest;
  if (latest && latest.score !== null && (latest.status === "low" || latest.status === "slightly-low")) {
    const msg = `Yesterday was ${latest.status === "low" ? "low" : "slightly low"}: ${f(latest.score * 100, 0)}% of a good day for its sunshine.`;
    (latest.status === "low" ? issues : lines).push(msg);
  } else if (latest?.status === "good" && latest.score !== null) lines.push(`Yesterday: good (${f(latest.score * 100, 0)}% of a good day).`);
  const s = r.health?.soiling;
  if (s?.advice === "clean" && s.lossPct !== null) issues.push(`Cleaning recommended: recent sunny days are about ${f(s.lossPct * 100, 0)}% below ${s.reference === "after-wash" ? "how the panels did after the last rain or cleaning" : "your best days"}.`);
  else if (s?.advice === "watch" && s.lossPct !== null) lines.push(`Dust may be building (about ${f(s.lossPct * 100, 0)}% below). No need to clean yet.`);

  // Grid: one line per kind of event, so a day of high voltage doesn't become a wall of bullets.
  const events = r.day?.events ?? [];
  const label = { stopped: "Output stopped", "over-voltage": "High grid voltage", "under-voltage": "Low grid voltage", frequency: "Grid frequency out of range" } as const;
  for (const kind of ["stopped", "over-voltage", "under-voltage", "frequency"] as const) {
    const list = events.filter((e) => e.kind === kind);
    if (!list.length) continue;
    const span = (e: (typeof list)[0]) => `${t12(e.t)}${e.until ? `–${t12(e.until)}` : ""}`;
    if (list.length === 1) { issues.push(`${label[kind]} ${span(list[0])}. ${list[0].detail}`); continue; }
    const times = list.map(span).join(", ");
    if (kind === "over-voltage" && r.day?.grid.max) {
      const ran = list.every((e) => /kept running/.test(e.detail));
      issues.push(`High grid voltage ${list.length} times (${times}), peaking at ${f(r.day.grid.max.v)} V at ${t12(r.day.grid.max.t)}, above ${r.limits.highV} V.${ran ? " The inverter kept running each time." : ""}`);
    } else if (kind === "under-voltage" && r.day?.grid.min) {
      issues.push(`Low grid voltage ${list.length} times (${times}), lowest ${f(r.day.grid.min.v)} V, below ${r.limits.lowV} V.`);
    } else issues.push(`${label[kind]} ${list.length} times: ${times}.`);
  }
  if (r.day?.grid.max && r.day.grid.min && !(r.day.events ?? []).some((e) => e.kind !== "stopped")) lines.push(`Grid ${f(r.day.grid.min!.v, 0)}–${f(r.day.grid.max.v, 0)} V, within limits.`);

  // Alarms raised today
  const todays = r.alarms.filter((a) => a.start.slice(0, 10) === r.today);
  for (const a of todays.slice(0, 3)) issues.push(`Inverter ${a.level}: ${a.desc}${a.code ? ` (${a.code})` : ""} at ${t12(a.start.slice(11, 16))}${a.cleared ? `, cleared ${t12(a.cleared.slice(11, 16))}` : ", not cleared"}.`);
  if (todays.length > 3) issues.push(`${todays.length - 3} more inverter alarms today.`);

  const name = o.plant.name || "Helio";
  const title = `${name}: ${f(o.todayKwh)} kWh today${issues.length ? ` · ${issues.length} to check` : ""}`;
  const body = [`${name} · ${dateLabel}`, "", ...lines, ...(issues.length ? ["", "Needs a look:", ...issues.map((i) => `• ${i}`)] : ["", "Nothing needs a look today."])].join("\n");
  const urgent = issues.some((i) => /offline|stopped|No units|fault|error/i.test(i));
  return { title, body, issues, priority: urgent ? "high" : "default" };
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
export async function send(rep: Report, dashboardUrl?: string): Promise<{ channel: string; ok: boolean; error?: string }[]> {
  const out: { channel: string; ok: boolean; error?: string }[] = [];
  const text = `${rep.title}\n\n${rep.body}${dashboardUrl ? `\n\n${dashboardUrl}` : ""}`;
  if (process.env.TELEGRAM_LINK) {
    try {
      const r = await fetch(RELAY_URL(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ link: process.env.TELEGRAM_LINK, text }) });
      const j = await r.json().catch(() => ({}));
      out.push(r.ok && j.ok ? { channel: "Helio Solar bot", ok: true } : { channel: "Helio Solar bot", ok: false, error: j.error || `HTTP ${r.status}` });
    } catch (e) { out.push({ channel: "Helio Solar bot", ok: false, error: (e as Error).message }); }
  }
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      });
      const j = await r.json().catch(() => ({}));
      out.push(r.ok && j.ok ? { channel: "your bot", ok: true } : { channel: "your bot", ok: false, error: j.description || `HTTP ${r.status}` });
    } catch (e) { out.push({ channel: "your bot", ok: false, error: (e as Error).message }); }
  }
  return out;
}
