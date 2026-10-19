"use client";
import { useEffect, useState } from "react";
import { BellRing, Cpu, PlugZap, Wifi, WifiOff } from "lucide-react";
import type { Alarm, Collector, InverterDay, Live } from "@/lib/inverter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GridChart, fmt } from "@/components/charts";
import { cn } from "@/lib/utils";

type Data = {
  device: { status: number; label: string };
  collector: Collector;
  live: Live | null;
  day: InverterDay;
  alarms: { items: Alarm[]; error: string | null; days: number };
  limits: { nominalV: number; highV: number; lowV: number; nominalHz: number; hzBand: number };
};

let TZ = "Asia/Kolkata";
let LOC = "en-IN";
export function configureInverter(o: { timezone: string; locale: string }) { TZ = o.timezone; LOC = o.locale; }
const t12 = (t?: string | null) => { if (!t) return "—"; const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
const when = (ts: string) => {
  const d = ts.slice(0, 10), today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const day = d === today ? "Today" : new Date(d + "T12:00:00Z").toLocaleDateString(LOC, { day: "numeric", month: "short", year: d.slice(0, 4) === today.slice(0, 4) ? undefined : "numeric", timeZone: "UTC" });
  return `${day}, ${t12(ts.slice(11, 16))}`;
};
// "yyyy-mm-dd hh:mm:ss" in the plant's time zone → minutes before now.
const zoneOffsetMs = (at: Date) => { const p = new Date(at.toLocaleString("en-US", { timeZone: TZ })); const u = new Date(at.toLocaleString("en-US", { timeZone: "UTC" })); return p.getTime() - u.getTime(); };
const minutesAgo = (ts: string | null) => {
  if (!ts) return null;
  const naive = Date.parse(ts.replace(" ", "T") + "Z");
  return Number.isFinite(naive) ? Math.max(0, Math.round((Date.now() - (naive - zoneOffsetMs(new Date(naive)))) / 60000)) : null;
};
const ago = (m: number | null) => (m === null ? "—" : m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`);

export function InverterCard({ date, dateLabel, api = "/api/solar" }: { date: string; dateLabel: string; api?: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    const load = () => {
      setLoading(true);
      fetch(`${api}/inverter?date=${date}`, { cache: "no-store" }).then((r) => r.json())
        .then((j) => { if (!live) return; if (j.error) throw new Error(j.error); setD(j); setErr(null); })
        .catch((e) => live && setErr(e.message)).finally(() => live && setLoading(false));
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => { live = false; clearInterval(id); };
  }, [api, date]);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4 sm:px-6 [.border-b]:pb-4">
        <CardTitle className="text-base font-medium">Inverter &amp; grid</CardTitle>
        <CardDescription>Live readings from the inverter, and a grid check for {dateLabel.toLowerCase() === "today" ? "today" : dateLabel}</CardDescription>
      </CardHeader>
      {!d ? (
        <CardContent className="px-5 py-5 sm:px-6">{err ? <p className="text-sm text-destructive">Couldn&apos;t read the inverter: {err}</p> : <Skeleton className="h-48 w-full" />}</CardContent>
      ) : (
        <CardContent className={cn("grid min-w-0 gap-0 px-0 py-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]", loading && "opacity-70")}>
          <Now d={d} />
          <Grid d={d} dateLabel={dateLabel} />
          <Side d={d} />
        </CardContent>
      )}
    </Card>
  );
}

function Now({ d }: { d: Data }) {
  const l = d.live;
  const age = minutesAgo(l?.at ?? null);
  const normal = d.device.status === 0 && (!l?.status || /normal|generat|run|on.?grid/i.test(l.status));
  return (
    <section className="min-w-0 border-b px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r">
      <Title icon={Cpu}>Now</Title>
      <div className={cn("mt-3 flex items-center gap-2 text-lg font-medium", normal ? "text-success" : d.device.status === 3 ? "text-muted-foreground" : "text-destructive")}>
        <span className={cn("size-2 rounded-full", normal ? "bg-success" : d.device.status === 3 ? "bg-muted-foreground" : "bg-destructive")} />
        {l?.status && d.device.status === 0 ? l.status : d.device.label}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{l?.at ? `Reading from ${t12(l.at.slice(11, 16))} (${ago(age)})` : "No live reading"}</p>
      {l && (
        <dl className="mt-4 space-y-1.5 text-sm">
          {l.powerW !== null && <Row k="Output" v={`${fmt(l.powerW, 0)} W`} />}
          {l.pv.map((p) => <Row key={p.n} k={`Panels${l.pv.length > 1 ? ` (PV${p.n})` : ""}`} v={`${fmt(p.v, 0)} V · ${fmt(p.a, 1)} A`} />)}
          {l.grid.phases.length > 1
            ? l.grid.phases.map((p) => <Row key={p.name} k={`Grid ${p.name}`} v={`${fmt(p.v, 1)} V`} />)
            : l.grid.v !== null && <Row k="Grid" v={`${fmt(l.grid.v, 1)} V${l.grid.hz ? ` · ${fmt(l.grid.hz, 2)} Hz` : ""}`} />}
          {l.temps.map((t) => <Row key={t.name} k={`${t.name} temp`} v={`${fmt(t.c, 1)} °C`} />)}
        </dl>
      )}
      {!l?.pv.length && l && <p className="mt-3 text-xs text-muted-foreground">No panel voltage at the moment. Normal after sunset.</p>}
    </section>
  );
}

function Grid({ d, dateLabel }: { d: Data; dateLabel: string }) {
  const g = d.day.grid, L = d.limits;
  const out = (g.max && g.max.v > L.highV) || (g.min && g.min.v < L.lowV);
  const near = !out && g.max && g.max.v >= L.highV - 5;
  const tripped = d.day.events.some((e) => e.kind === "stopped" && /trip/.test(e.detail));
  return (
    <section className="min-w-0 border-b px-5 py-5 sm:px-6 lg:border-b-0 lg:border-r">
      <Title icon={PlugZap}>Grid, {dateLabel}</Title>
      {g.max && g.min ? (
        <>
          <div className={cn("mt-3 text-lg font-medium", tripped ? "text-destructive" : out || near ? "text-amber-600 dark:text-amber-400" : "text-success")}>
            {tripped ? "Likely high-voltage trip" : out ? (g.max && g.max.v > L.highV ? "High grid voltage" : "Low grid voltage") : near ? "Close to the high limit" : "Within the standard range"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(g.min.v, 1)}–{fmt(g.max.v, 1)} V (high at {t12(g.max.t)}){g.hzMin !== null && g.hzMax !== null ? ` · ${fmt(g.hzMin, 2)}–${fmt(g.hzMax, 2)} Hz` : ""}
          </p>
          <div className="mt-4"><GridChart samples={d.day.samples} high={L.highV} low={L.lowV} /></div>
          <p className="mt-2 text-xs text-muted-foreground">
            Shaded: outside the IEC 61727 range ({L.lowV}–{L.highV} V, {L.nominalHz - L.hzBand}–{L.nominalHz + L.hzBand} Hz on a {L.nominalV} V / {L.nominalHz} Hz grid), where a default inverter disconnects. Installers often set wider limits, so the inverter may keep running. High voltage often comes from the local transformer setting, or from voltage rise on a long or thin cable while exporting. Your electricity company can check the supply; an electrician can check the cable.
          </p>
        </>
      ) : <p className="mt-3 text-sm text-muted-foreground">No grid readings for this day.</p>}
      {d.day.events.length > 0 && (
        <ul className="mt-4 space-y-2">
          {d.day.events.slice(0, 6).map((e, i) => (
            <li key={i} className="rounded-lg border px-3 py-2 text-sm">
              <div className="font-medium">{t12(e.t)}{e.until ? `–${t12(e.until)}` : ""} · {e.kind === "stopped" ? "Output stopped" : e.kind === "over-voltage" ? "High grid voltage" : e.kind === "under-voltage" ? "Low grid voltage" : "Grid frequency"}</div>
              <div className="mt-0.5 text-muted-foreground">{e.detail}</div>
            </li>
          ))}
          {d.day.events.length > 6 && <li className="text-xs text-muted-foreground">+{d.day.events.length - 6} more in the export</li>}
        </ul>
      )}
      {d.day.tempMax && <p className="mt-3 text-sm text-muted-foreground">Hottest inside the inverter: <span className="font-mono text-foreground tabular">{fmt(d.day.tempMax.c, 1)} °C</span> at {t12(d.day.tempMax.t)}</p>}
    </section>
  );
}

function Side({ d }: { d: Data }) {
  const c = d.collector, a = d.alarms;
  return (
    <section className="min-w-0 px-5 py-5 sm:px-6">
      <Title icon={c.online ? Wifi : WifiOff}>WiFi stick</Title>
      <div className={cn("mt-3 flex items-center gap-2 text-lg font-medium", c.online ? "text-success" : "text-destructive")}>
        <span className={cn("size-2 rounded-full", c.online ? "bg-success" : "bg-destructive")} />{c.online ? "Online" : "Offline"}
      </div>
      {!c.online && <p className="mt-1 text-sm text-muted-foreground">The stick isn&apos;t reaching the cloud. Check its NET light and your 2.4 GHz WiFi.</p>}
      <dl className="mt-3 space-y-1.5 text-sm">
        {c.intervalSec && <Row k="Uploads every" v={`${fmt(c.intervalSec / 60, 0)} min`} />}
        {c.firmware && <Row k="Firmware" v={c.firmware} />}
        {c.panels && <Row k="Panels" v={`${c.panels.count} × ${fmt(c.panels.watt, 0)} W = ${fmt(c.panels.kwp, 2)} kWp`} />}
      </dl>

      <div className="mt-6"><Title icon={BellRing}>Inverter alarms</Title></div>
      {a.error ? <p className="mt-3 text-sm text-muted-foreground">Couldn&apos;t load alarms ({a.error}).</p>
        : a.items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-success">None</span> in the last {a.days} days.</p>
        : (
          <ul className="mt-3 space-y-2">
            {a.items.slice(0, 5).map((x, i) => (
              <li key={i} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 break-words font-medium">{x.desc}{x.code ? ` (${x.code})` : ""}</span>
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize", x.level === "fault" || x.level === "error" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground")}>{x.level}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{when(x.start)}{x.cleared ? ` · cleared ${when(x.cleared)}` : " · not cleared"}</div>
              </li>
            ))}
            {a.items.length > 5 && <li className="text-xs text-muted-foreground">{a.items.length - 5} older alarms not shown</li>}
          </ul>
        )}
    </section>
  );
}

function Title({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 shrink-0 text-muted-foreground" /><span className="truncate">{children}</span></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="min-w-0 text-muted-foreground">{k}</dt><dd className="text-right font-mono tabular">{v}</dd></div>;
}
