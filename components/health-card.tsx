"use client";
import { useCallback, useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { CheckCircle2, CloudRain, Download, Droplets, Gauge, Sparkles, TriangleAlert, X } from "lucide-react";
import type { DayHealth, Health } from "@/lib/health";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/components/charts";
import { cn } from "@/lib/utils";

export type HealthData = Health & { location: { source: "plant" | "settings" | "device" | "demo" } | null; weatherError: string | null; weatherOff?: boolean };

// Plant time zone and number locale; the dashboard sets these from the server's settings.
let TZ = "Asia/Kolkata";
let LOC = "en-IN";
export function configureHealth(o: { timezone: string; locale: string }) { TZ = o.timezone; LOC = o.locale; }
const CLEAN_KEY = "helio.cleanedOn";
const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const short = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(LOC, { day: "numeric", month: "short", timeZone: "UTC" });
const nice = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(LOC, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const shift = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);

export const STATUS: Record<DayHealth["status"], { label: string; dot: string; text: string }> = {
  good: { label: "Good", dot: "bg-success", text: "text-success" },
  "slightly-low": { label: "Slightly low", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  low: { label: "Low", dot: "bg-destructive", text: "text-destructive" },
  "no-generation": { label: "No generation", dot: "bg-destructive", text: "text-destructive" },
  "too-cloudy": { label: "Too cloudy to judge", dot: "bg-sky-400", text: "text-sky-600 dark:text-sky-400" },
  "no-data": { label: "No data", dot: "bg-muted-foreground/25", text: "text-muted-foreground" },
  unknown: { label: "Not enough history", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

const LOC_KEY = "helio.location";
type Loc = { lat: number; lon: number };
export function readLoc(): Loc | null { try { const v = JSON.parse(localStorage.getItem(LOC_KEY) || "null"); return v && Number.isFinite(v.lat) && Number.isFinite(v.lon) ? v : null; } catch { return null; } }
function writeLoc(v: Loc | null) { try { if (v) localStorage.setItem(LOC_KEY, JSON.stringify(v)); else localStorage.removeItem(LOC_KEY); } catch {} }
export const locQuery = (l: Loc | null) => (l ? `lat=${l.lat.toFixed(4)}&lon=${l.lon.toFixed(4)}` : "");

function readCleaned(): string | null { try { return localStorage.getItem(CLEAN_KEY); } catch { return null; } }
function writeCleaned(v: string | null) { try { if (v) localStorage.setItem(CLEAN_KEY, v); else localStorage.removeItem(CLEAN_KEY); } catch {} }

export function useHealth(api = "/api/solar") {
  const [cleanedOn, setCleanedOn] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loc, setLoc] = useState<Loc | null>(null);
  useEffect(() => { setCleanedOn(readCleaned()); setLoc(readLoc()); setReady(true); }, []);
  const load = useCallback(() => {
    const qs = [cleanedOn ? `cleaned=${cleanedOn}` : "", locQuery(loc)].filter(Boolean).join("&");
    fetch(`${api}/health${qs ? `?${qs}` : ""}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); setHealth(j); setError(null); })
      .catch((e) => setError(e.message));
  }, [api, cleanedOn, loc]);
  useEffect(() => { if (!ready) return; load(); const id = setInterval(load, 30 * 60_000); return () => clearInterval(id); }, [ready, load]);
  const markCleaned = (v: string | null) => { writeCleaned(v); setCleanedOn(v); };
  const saveLoc = (v: Loc | null) => { writeLoc(v); setLoc(v); };
  return { health, error, cleanedOn, markCleaned, loc, saveLoc };
}

export function HealthCard({ h, error, cleanedOn, onCleaned, todayKwh, onLocation }: { h: HealthData | null; error: string | null; cleanedOn: string | null; onCleaned: (v: string | null) => void; todayKwh: number; onLocation: (v: Loc | null) => void }) {
  if (!h) {
    return (
      <Card className="gap-0 py-0">
        <Header weather={null} />
        <CardContent className="px-5 py-5 sm:px-6">{error ? <p className="text-sm text-destructive">Couldn&apos;t run the health check: {error}</p> : <Skeleton className="h-40 w-full" />}</CardContent>
      </Card>
    );
  }
  const latest = h.latest;
  const s = h.soiling;
  const strip = h.days.slice(-14);

  return (
    <Card className="gap-0 py-0">
      <Header weather={h.method === "weather"} />
      <CardContent className="grid gap-0 px-0 py-0 sm:grid-cols-3">
        {/* Latest finished day */}
        <section className="border-b px-5 py-5 sm:border-b-0 sm:border-r sm:px-6">
          <SectionTitle icon={Gauge}>{latest ? (latest.date === shift(todayIST(), -1) ? "Yesterday" : nice(latest.date)) : "Latest day"}</SectionTitle>
          {latest ? (
            <>
              <div className={cn("mt-3 flex items-center gap-2 text-lg font-medium", STATUS[latest.status].text)}>
                <span className={cn("size-2 rounded-full", STATUS[latest.status].dot)} />{STATUS[latest.status].label}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {latest.score !== null && latest.status !== "too-cloudy"
                  ? <>{fmt(latest.score * 100, 0)}% of a good day{h.method === "weather" ? " for the sunshine it got" : ""}.</>
                  : latest.status === "too-cloudy" ? "Heavy cloud. Low output is expected, so this day isn't counted."
                  : latest.status === "no-generation" ? "No units were recorded on a sunny day. The inverter or its WiFi stick may have been off."
                  : latest.status === "no-data" ? "Your WiFi stick wasn't uploading on this day."
                  : `Needs 7 days of history to compare; ${h.days.filter((x) => x.status !== "no-data" && x.kwh > 0).length} so far.`}
              </p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <Row k="Units" v={`${fmt(latest.kwh)} kWh`} />
                {latest.specificYield !== null && <Row k="Yield" v={`${fmt(latest.specificYield, 2)} kWh/kWp`} />}
                {latest.irradiation !== null && <Row k="Sunshine" v={`${fmt(latest.irradiation, 1)} kWh/m²`} />}
              </dl>
            </>
          ) : <p className="mt-3 text-sm text-muted-foreground">No finished days yet.</p>}
          <div className="mt-5">
            <div className="mb-1.5 text-xs text-muted-foreground">Last 14 days</div>
            <div className="flex gap-1" role="list" aria-label="Daily health, last 14 days">
              {strip.map((d) => (
                <span key={d.date} role="listitem" title={`${nice(d.date)}: ${STATUS[d.status].label}${d.score !== null && d.status !== "too-cloudy" ? ` (${fmt(d.score * 100, 0)}%)` : ""}`}
                  className={cn("h-6 flex-1 rounded-sm", STATUS[d.status].dot)} />
              ))}
            </div>
          </div>
        </section>

        {/* Dust / cleaning */}
        <section className="border-b px-5 py-5 sm:border-b-0 sm:border-r sm:px-6">
          <SectionTitle icon={Droplets}>Panels</SectionTitle>
          <Advice s={s} weather={h.method === "weather"} />
          <dl className="mt-4 space-y-1.5 text-sm">
            <Row k="Last heavy rain" v={s.lastRain ? `${short(s.lastRain.date)} · ${fmt(s.lastRain.mm, 0)} mm` : h.method === "weather" ? "None in 30 days" : "—"} />
            <Row k="Last cleaned" v={cleanedOn ? short(cleanedOn) : "Not recorded"} />
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            {cleanedOn === todayIST()
              ? <Button size="sm" variant="ghost" onClick={() => onCleaned(null)}>Undo &ldquo;cleaned today&rdquo;</Button>
              : <Button size="sm" variant="outline" onClick={() => onCleaned(todayIST())}><Sparkles />I cleaned them today</Button>}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Saved on this device. The check restarts from the cleaning date.</p>
        </section>

        {/* Today's estimate */}
        <section className="px-5 py-5 sm:px-6">
          <SectionTitle icon={CloudRain}>Today&apos;s estimate</SectionTitle>
          {h.today.expectedKwh !== null ? (
            <>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl font-medium tabular">{fmt(h.today.low ?? h.today.expectedKwh, 0)}–{fmt(h.today.high ?? h.today.expectedKwh, 0)}</span>
                <span className="text-sm text-muted-foreground">kWh</span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">Expected for a clean system, from today&apos;s sunshine forecast ({fmt(h.today.forecastIrradiation ?? 0, 1)} kWh/m²) and your good days.</p>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>So far</span><span className="font-mono tabular">{fmt(todayKwh)} kWh</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (todayKwh / Math.max(0.1, h.today.expectedKwh)) * 100)}%` }} /></div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Forecasts can miss passing clouds and haze. Treat this as a guide.</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {h.method === "weather" ? "Needs at least 7 sunny days of history." : "Add the site's location (SITE_LAT, SITE_LON) to estimate today from the weather forecast."}
            </p>
          )}
        </section>
      </CardContent>
      {!h.location && !h.weatherOff && <LocationSetup onSave={onLocation} />}
      {h.weatherOff && <p className="border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">Weather is turned off (WEATHER=off), so checks compare raw output only.</p>}
      {h.location && (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">
          {h.location.source === "demo" ? "Sample sunshine and rain for the demo. Your copy uses Open-Meteo for your roof's location." : <>Sunshine and rain from Open-Meteo for {h.location.source === "settings" ? "the coordinates in your settings" : h.location.source === "plant" ? "the location saved on your ShineMonitor plant" : "this device's saved location"}.</>}
          {h.location.source === "device" && <> <button className="underline underline-offset-2 hover:text-foreground" onClick={() => onLocation(null)}>Clear</button></>}
        </p>
      )}
      {h.weatherError && <p className="border-t px-5 py-3 text-xs text-muted-foreground sm:px-6">Weather data unavailable right now ({h.weatherError}). Showing a comparison without it.</p>}
    </Card>
  );
}

function LocationSetup({ onSave }: { onSave: (v: Loc) => void }) {
  const [lat, setLat] = useState(""); const [lon, setLon] = useState("");
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const geo = () => {
    if (!("geolocation" in navigator)) { setMsg("This browser can't share its location. Enter it below."); return; }
    setBusy(true); setMsg(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onSave({ lat: p.coords.latitude, lon: p.coords.longitude }); },
      (e) => { setBusy(false); setMsg(e.code === 1 ? "Location permission was denied. Enter it below instead." : "Couldn't get a location. Enter it below instead."); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };
  const a = Number(lat), b = Number(lon);
  const ok = lat !== "" && lon !== "" && Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
  return (
    <div className="border-t px-5 py-5 sm:px-6">
      <div className="text-sm font-medium">Add your location for weather-adjusted checks</div>
      <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">Your ShineMonitor plant has no saved location. Use this device&apos;s location while you&apos;re at home, or type the coordinates. It&apos;s saved on this device only; set SITE_LAT and SITE_LON to apply it everywhere.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Button size="sm" variant="outline" onClick={geo} disabled={busy}>{busy ? "Locating…" : "Use this device's location"}</Button>
        <div className="grid gap-1.5"><Label htmlFor="loc-lat" className="text-xs">Latitude</Label><Input id="loc-lat" inputMode="decimal" placeholder="e.g. 28.6139" value={lat} onChange={(e) => setLat(e.target.value)} className="w-32" /></div>
        <div className="grid gap-1.5"><Label htmlFor="loc-lon" className="text-xs">Longitude</Label><Input id="loc-lon" inputMode="decimal" placeholder="e.g. 77.2090" value={lon} onChange={(e) => setLon(e.target.value)} className="w-32" /></div>
        <Button size="sm" disabled={!ok} onClick={() => onSave({ lat: a, lon: b })}>Save</Button>
      </div>
      {msg && <p className="mt-2 text-xs text-destructive">{msg}</p>}
    </div>
  );
}

function Header({ weather }: { weather: boolean | null }) {
  return (
    <CardHeader className="border-b px-5 py-4 sm:px-6 [.border-b]:pb-4">
      <CardTitle className="text-base font-medium">System health</CardTitle>
      <CardDescription>
        {weather === false ? "Compared with your own best days. Without weather data, cloudy days can look like problems." : "Compared with your own best days, adjusted for how sunny each day was"}
      </CardDescription>
    </CardHeader>
  );
}

function Advice({ s, weather }: { s: Health["soiling"]; weather: boolean }) {
  const loss = s.lossPct !== null ? fmt(s.lossPct * 100, 0) : null;
  const ref = s.reference === "after-wash" ? "how they ran just after the previous rain or cleaning" : "your best days";
  const map = {
    clean: { icon: TriangleAlert, cls: "text-destructive", title: "Cleaning recommended", body: `On the last ${s.sunnyDays} sunny days, output was about ${loss}% below ${ref}. Dust is the most likely cause; shade or a fault can look similar.` },
    watch: { icon: TriangleAlert, cls: "text-amber-600 dark:text-amber-400", title: "Dust may be building", body: `About ${loss}% below ${ref} on recent sunny days. Not worth a cleaning yet; check again in a few days.` },
    fine: { icon: CheckCircle2, cls: "text-success", title: "Looking clean", body: `Recent sunny days are within ${loss}% of ${ref}. No cleaning needed.` },
    "not-enough-data": { icon: Gauge, cls: "text-muted-foreground", title: weather ? "Not enough sunny days yet" : "Needs weather data", body: weather ? `Needs 4 sunny days since the last rain or cleaning (${s.sunnyDays} so far).` : "Set SITE_LAT and SITE_LON so cloudy days aren't mistaken for dust." },
  }[s.advice];
  const Icon = map.icon;
  return (
    <>
      <div className={cn("mt-3 flex items-center gap-2 text-lg font-medium", map.cls)}><Icon className="size-4" />{map.title}</div>
      <p className="mt-1.5 text-sm text-muted-foreground">{map.body}</p>
    </>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-muted-foreground" />{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="whitespace-nowrap text-right font-mono tabular">{v}</dd></div>;
}

export function ExportButton({ api = "/api/solar", rates }: { api?: string; rates?: { tariff: number; exportTariff: number; currency: string } }) {
  const [lq, setLq] = useState("");
  useEffect(() => setLq(locQuery(readLoc())), []);
  const rq = rates ? `&tariff=${rates.tariff}&export=${rates.exportTariff}&currency=${encodeURIComponent(rates.currency)}` : "";
  const L = (lq ? `&${lq}` : "") + rq;
  const today = todayIST();
  const [from, setFrom] = useState(shift(today, -29));
  const [to, setTo] = useState(today);
  const year = today.slice(0, 4);
  const valid = from <= to && to <= today;
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" aria-label="Export data" className="max-sm:px-2"><Download /><span className="hidden sm:inline">Export</span></Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-xl outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-medium">Export data</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">CSV for Excel, Google Sheets or Numbers</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon-sm" aria-label="Close"><X /></Button></Dialog.Close>
          </div>
          <div className="mt-5 grid gap-2">
            <DownloadLink href={`${api}/export?from=${shift(today, -29)}&to=${today}${L}`}>Last 30 days, daily</DownloadLink>
            <DownloadLink href={`${api}/export?scope=months&year=${year}${L}`}>{year}, monthly</DownloadLink>
          </div>
          <Separator className="my-5" />
          <div className="text-sm font-medium">Custom range, daily</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="ex-from" className="text-xs">From</Label><Input id="ex-from" type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="ex-to" className="text-xs">To</Label><Input id="ex-to" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <Button asChild={valid} size="sm" className="mt-3 w-full" disabled={!valid}>
            {valid ? <a href={`${api}/export?from=${from}&to=${to}${L}`} download><Download />Download range</a> : <span>Pick a valid range</span>}
          </Button>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Daily files include units, kWh per kWp, peak power and time, first and last generation, sunshine, rain, performance
            against your best days, grid voltage and frequency range, inverter temperature, output stops and value range.
            Peak and timing columns cover ranges up to 93 days, grid and temperature up to 31 days, and weather the last 92 days.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DownloadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} download className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
      <span>{children}</span><Download className="size-4 text-muted-foreground" />
    </a>
  );
}
