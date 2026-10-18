"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, Infinity as InfinityIcon, LogOut, Moon, Pencil, Sun, SunMedium, Zap } from "lucide-react";
import type { DayDetail, Overview } from "@/lib/shinemonitor";
import type { Settings } from "@/lib/config";
import { DOCS_URL, PROJECT_URL, REPO_URL } from "@/lib/links";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PowerChart, Sparkline, UnitsChart, fmt } from "@/components/charts";
import { Logo, Signature } from "@/components/brand";
import { cn } from "@/lib/utils";

type Data = Overview & { settings: Settings };

// Display settings come from the server (env vars); these defaults apply until the first response.
let TZ = "Asia/Kolkata";
let CUR = "₹";
let LOC = "en-IN";
// Whole units for big amounts, cents/paise for small ones so $0.18 rates still read correctly.
const inr = (n: number) => CUR + (Math.abs(n) < 100 && n % 1 !== 0 ? n.toLocaleString(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : Math.round(n).toLocaleString(LOC));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const shiftDate = (d: string, n: number) => new Date(new Date(d + "T12:00:00+05:30").getTime() + n * 86400000).toLocaleDateString("en-CA", { timeZone: TZ });
const niceDate = (d: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(d + "T12:00:00+05:30").toLocaleDateString(LOC, { weekday: "short", day: "numeric", month: "short", timeZone: TZ, ...opts });
const t12 = (t?: string | null) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (r.status === 401) { location.href = "/login"; throw new Error("Signed out"); }
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j;
}

export function Dashboard({ mode = "live" }: { mode?: "live" | "demo" }) {
  const api = mode === "demo" ? "/api/demo" : "/api/solar";
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState("day");
  const [date, setDate] = useState(todayIST());
  const [day, setDay] = useState<DayDetail | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const ratesKey = mode === "demo" ? "helio.demo.rates" : "helio.rates";
  const [rates, setRates] = useState<Rates | null>(null);
  useEffect(() => { setRates(readRates(ratesKey)); }, [ratesKey]);
  const saveRates = (r: Rates | null) => { setRates(r); try { r ? localStorage.setItem(ratesKey, JSON.stringify(r)) : localStorage.removeItem(ratesKey); } catch {} };

  const loadOverview = useCallback(() => getJSON<Data>(api).then((d) => { TZ = d.settings.timezone; CUR = d.settings.currency; LOC = d.settings.locale; setData(d); setErr(null); }).catch((e) => setErr(e.message)), [api]);
  const loadDay = useCallback((d: string) => {
    setDayLoading(true);
    return getJSON<DayDetail>(`${api}/day?date=${d}`).then(setDay).catch((e) => setErr(e.message)).finally(() => setDayLoading(false));
  }, [api]);

  useEffect(() => { loadOverview(); const id = setInterval(loadOverview, 5 * 60_000); return () => clearInterval(id); }, [loadOverview]);
  useEffect(() => {
    loadDay(date);
    if (date !== todayIST()) return;
    const id = setInterval(() => loadDay(date), 5 * 60_000);
    return () => clearInterval(id);
  }, [date, loadDay]);

  const openDay = (d: string) => { setDate(d); setTab("day"); document.getElementById("generation")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; };

  const stats = useMemo(() => {
    if (!data) return null;
    const today = todayIST();
    const past = data.daily.filter((d) => d.date !== today && d.kwh > 0);
    const avg = past.length ? past.reduce((s, d) => s + d.kwh, 0) / past.length : 0;
    const best = past.reduce((m, d) => (d.kwh > m.kwh ? d : m), { date: "", kwh: 0 });
    const minutesSince = data.lastReadingAt ? (Date.now() - new Date(data.lastReadingAt.replace(" ", "T") + ":00+05:30").getTime()) / 60000 : Infinity;
    const hour = Number(new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }));
    const daylight = hour >= 7 && hour < 18;
    const status: "live" | "warn" | "idle" = data.nowKw > 0 && minutesSince < 20 ? "live" : daylight && minutesSince > 30 ? "warn" : "idle";
    return { avg, best, status };
  }, [data]);

  if (!data || !stats) {
    return (
      <Shell mode={mode} onLogout={logout}>
        {err && <ErrorBanner msg={`Couldn't load your solar data: ${err}`} />}
        <Skeleton className="mb-8 h-14 w-72" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
        <Skeleton className="mt-4 h-[440px] rounded-xl" />
      </Shell>
    );
  }

  // Rates set on this device win over the server defaults, so anyone can use their own tariff and currency.
  const set: Settings = { ...data.settings, ...(rates ?? {}) };
  CUR = set.currency;
  const cap = data.plant.capacityKw;
  const diff = data.yesterdayKwh ? ((data.todayKwh - data.yesterdayKwh) / data.yesterdayKwh) * 100 : null;
  const isToday = date === todayIST();
  const last7 = data.daily.slice(-7).map((d) => d.kwh);
  const pct = cap ? Math.min(100, (data.nowKw / cap) * 100) : 0;
  const rows = [...data.daily].reverse();
  const maxDay = Math.max(1, ...data.daily.map((d) => d.kwh));
  const since = data.plant.installed ? new Date(data.plant.installed.slice(0, 10) + "T00:00:00+05:30").toLocaleDateString(LOC, { month: "short", year: "numeric" }) : null;

  return (
    <Shell mode={mode} name={data.plant.name} meta={cap ? `${fmt(cap, 2)} kW` : undefined} status={stats.status} onLogout={logout}>
      {err && <ErrorBanner msg={`Last refresh failed: ${err}. Showing the most recent data.`} />}

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">Overview</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">Solar generation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {niceDate(todayIST(), { weekday: "long", month: "long" })}
          {data.lastReadingAt && <> · Last reading {t12(data.lastReadingAt.slice(11))}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icon={SunMedium} label="Generated today" value={fmt(data.todayKwh)} unit="kWh" accent
          footer={
            <div className="flex items-center justify-between gap-2">
              {diff !== null && isFinite(diff) ? (
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium", diff >= 0 ? "text-success" : "text-destructive")}>
                  {diff >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{fmt(Math.abs(diff), 0)}%<span className="hidden sm:inline">&nbsp;vs yesterday</span>
                </span>
              ) : <span className="text-xs text-muted-foreground">No data for yesterday</span>}
              <span className="hidden sm:block"><Sparkline values={last7} /></span>
            </div>
          } />
        <Kpi icon={Zap} label="Live power" value={fmt(data.nowKw, 2)} unit="kW"
          footer={
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} /></div>
              <div className="mt-2 text-xs text-muted-foreground">{cap ? `${fmt(pct, 0)}% of ${fmt(cap, 2)} kW capacity` : "Current output"}</div>
            </div>
          } />
        <Kpi icon={CalendarDays} label={`This month · ${MONTHS[Number(todayIST().slice(5, 7)) - 1]}`} value={fmt(data.monthKwh, 0)} unit="kWh"
          footer={<span className="text-xs text-muted-foreground">Worth up to <b className="font-medium text-foreground">{inr(data.monthKwh * set.tariff)}</b></span>} />
        <Kpi icon={InfinityIcon} label="Lifetime" value={fmt(data.totalKwh, 0)} unit="kWh"
          footer={<span className="text-xs text-muted-foreground">{since ? `Since ${since} · ` : ""}up to <b className="font-medium text-foreground">{inr(data.totalKwh * set.tariff)}</b></span>} />
      </div>

      <Card id="generation" className="mt-4 scroll-mt-24 gap-0 py-0">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-medium">Generation</h2>
              <p className="text-sm text-muted-foreground">From the inverter&apos;s own energy counter</p>
            </div>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="30d">30 days</TabsTrigger>
              <TabsTrigger value="year">{todayIST().slice(0, 4)}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="day" className="px-5 pb-5 pt-5 sm:px-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon-sm" aria-label="Previous day" onClick={() => setDate((d) => shiftDate(d, -1))}><ChevronLeft /></Button>
                <div className="min-w-[150px] text-center text-sm font-medium">{isToday ? "Today" : niceDate(date, { year: "numeric" })}</div>
                <Button variant="outline" size="icon-sm" aria-label="Next day" disabled={isToday} onClick={() => setDate((d) => shiftDate(d, 1))}><ChevronRight /></Button>
              </div>
              {!isToday && <Button variant="ghost" size="sm" onClick={() => setDate(todayIST())}>Back to today</Button>}
            </div>
            <div className={cn("grid grid-cols-2 overflow-hidden rounded-lg border sm:grid-cols-4", dayLoading && "opacity-60")}>
              <MiniStat label="Units" value={day ? fmt(day.kwh) : "—"} unit="kWh" />
              <MiniStat label="Worth" value={day ? inr(day.kwh * set.tariff) : "—"} unit={day && set.exportTariff ? `${inr(day.kwh * set.exportTariff)} if exported` : ""} />
              <MiniStat label="Peak" value={day?.peak ? fmt(day.peak.kw, 2) : "—"} unit={day?.peak ? `kW at ${t12(day.peak.t)}` : ""} />
              <MiniStat label="Producing" value={day?.firstAt ? `${t12(day.firstAt)} – ${t12(day.lastAt)}` : "—"} small />
            </div>
            <div className={cn("mt-5 transition-opacity", dayLoading && "opacity-50")}>
              <PowerChart points={day?.curve ?? []} capacity={cap} />
            </div>
          </TabsContent>

          <TabsContent value="30d" className="px-5 pb-5 pt-5 sm:px-6">
            <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>Total <b className="font-mono font-medium tabular text-foreground">{fmt(data.daily.reduce((s, d) => s + d.kwh, 0), 0)}</b> kWh</span>
              <span>Average <b className="font-mono font-medium tabular text-foreground">{fmt(stats.avg)}</b> / day</span>
              {stats.best.date && <span>Best <b className="font-mono font-medium tabular text-foreground">{fmt(stats.best.kwh)}</b> on {niceDate(stats.best.date)}</span>}
            </div>
            <UnitsChart items={data.daily.map((d) => ({ key: d.date, label: String(+d.date.slice(8)), title: niceDate(d.date), kwh: d.kwh }))} active={date} avg={stats.avg} onSelect={openDay} />
            <p className="mt-2 text-xs text-muted-foreground">Click a bar to open that day.</p>
          </TabsContent>

          <TabsContent value="year" className="px-5 pb-5 pt-5 sm:px-6">
            <div className="mb-4 text-sm text-muted-foreground">
              Total <b className="font-mono font-medium tabular text-foreground">{fmt(data.yearKwh, 0)}</b> kWh · worth up to <b className="font-medium text-foreground">{inr(data.yearKwh * set.tariff)}</b>
            </div>
            <UnitsChart items={data.months.map((m) => ({ key: String(m.m), label: MONTHS[m.m - 1], title: MONTHS[m.m - 1], kwh: m.kwh }))} active={String(Number(todayIST().slice(5, 7)))} />
          </TabsContent>
        </Tabs>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b px-5 py-4 sm:px-6 [.border-b]:pb-4">
            <CardTitle className="text-base font-medium">Daily log</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden w-[40%] sm:table-cell" />
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Worth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, showAll ? 30 : 10).map((d) => (
                  <TableRow key={d.date} onClick={() => openDay(d.date)} className={cn("cursor-pointer", d.date === date && "bg-primary/[0.06] hover:bg-primary/10")}>
                    <TableCell className="font-medium">{d.date === todayIST() ? "Today" : niceDate(d.date)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary/80" style={{ width: `${(d.kwh / maxDay) * 100}%` }} /></div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular">{fmt(d.kwh)}</TableCell>
                    <TableCell className="text-right font-mono tabular text-muted-foreground">{inr(d.kwh * set.tariff)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-2 py-2"><Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show less" : "Show all 30 days"}</Button></div>
          </CardContent>
        </Card>

        <WorthCard set={set} defaults={data.settings} custom={!!rates} onSave={saveRates} todayKwh={data.todayKwh} monthKwh={data.monthKwh} yearKwh={data.yearKwh} />
      </div>
    </Shell>
  );
}

function Shell({ children, mode, name = "Helio", meta, status, onLogout }: { children: React.ReactNode; mode: "live" | "demo"; name?: string; meta?: string; status?: "live" | "warn" | "idle"; onLogout: () => void }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="truncate font-medium">{name}</span>
            {meta && <><Separator orientation="vertical" className="hidden h-5 sm:block" /><span className="hidden text-sm text-muted-foreground sm:inline">{meta}</span></>}
          </div>
          <div className="flex items-center gap-2">
            {status && <StatusBadge status={status} />}
            <ThemeToggle />
            {mode === "demo"
              ? <Button asChild size="sm"><a href={REPO_URL} target="_blank" rel="noopener">Get your own</a></Button>
              : <Button variant="outline" size="sm" onClick={onLogout}><LogOut /><span className="hidden sm:inline">Sign out</span></Button>}
          </div>
        </div>
      </header>
      {mode === "demo" && (
        <div className="border-b bg-primary/[0.07] px-4 py-2.5 text-center text-sm">
          <span className="font-medium text-primary">Live demo</span>
          <span className="text-muted-foreground"> · sample data from a fictional 5.4 kW rooftop. </span>
          <a href={PROJECT_URL} className="font-medium underline underline-offset-4">About Helio</a>
          <span className="text-muted-foreground"> · </span>
          <a href={DOCS_URL} className="font-medium underline underline-offset-4">Docs</a>
        </div>
      )}
      <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10">
        {children}
        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-xs text-muted-foreground">
          <span>{mode === "demo" ? "Sample data · " : "Data from your inverter via the ShineMonitor cloud · "}refreshes every 5 minutes · <a href={DOCS_URL} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-foreground">Docs</a></span>
          <Signature />
        </footer>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: "live" | "warn" | "idle" }) {
  const map = {
    live: { text: "Generating", dot: "bg-success" },
    warn: { text: "No recent data", dot: "bg-destructive" },
    idle: { text: "Idle", dot: "bg-muted-foreground" },
  }[status];
  return (
    <Badge variant="outline" className="h-8 gap-2 px-3 font-normal text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", map.dot, status === "live" && "animate-pulse")} />
      <span className="hidden sm:inline">{map.text}</span>
    </Badge>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };
  return <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme">{dark ? <Sun /> : <Moon />}</Button>;
}

function Kpi({ icon: Icon, label, value, unit, footer, accent }: { icon: React.ElementType; label: string; value: string; unit: string; footer: React.ReactNode; accent?: boolean }) {
  return (
    <Card className="gap-0 px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center justify-between">
        <span className="truncate text-xs text-muted-foreground sm:text-sm">{label}</span>
        <span className={cn("hidden size-8 shrink-0 place-items-center rounded-lg sm:grid", accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><Icon className="size-4" /></span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-medium sm:text-[32px] leading-none tracking-tight tabular">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-4">{footer}</div>
    </Card>
  );
}

function MiniStat({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <div className="border-b border-r px-4 py-3 even:border-r-0 sm:border-b-0 sm:even:border-r sm:last:border-r-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono font-medium tabular", small ? "pt-1 text-sm" : "text-xl")}>{value}</div>
      {unit && <div className="mt-0.5 text-xs text-muted-foreground">{unit}</div>}
    </div>
  );
}

type Rates = Pick<Settings, "tariff" | "exportTariff" | "currency">;

function readRates(key: string): Rates | null {
  try {
    const r = JSON.parse(localStorage.getItem(key) || "null");
    if (r && typeof r.tariff === "number" && typeof r.exportTariff === "number" && typeof r.currency === "string") return r;
  } catch {}
  return null;
}

const CURRENCIES = ["₹", "$", "€", "£", "A$", "C$", "¥", "R", "AED ", "SAR ", "Rs ", "৳", "₱", "₦", "R$", "kr ", "zł ", "₺"];

function WorthCard({ set, defaults, custom, onSave, todayKwh, monthKwh, yearKwh }: { set: Settings; defaults: Settings; custom: boolean; onSave: (r: Rates | null) => void; todayKwh: number; monthKwh: number; yearKwh: number }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ tariff: "", exportTariff: "", currency: "" });
  const open = () => { setForm({ tariff: String(set.tariff), exportTariff: set.exportTariff ? String(set.exportTariff) : "", currency: set.currency }); setEditing(true); };
  const t = Number(form.tariff), e = form.exportTariff === "" ? 0 : Number(form.exportTariff);
  const valid = form.tariff !== "" && isFinite(t) && t >= 0 && t < 10000 && isFinite(e) && e >= 0 && e < 10000 && form.currency.trim().length > 0 && form.currency.length <= 5;
  const save = (ev: React.FormEvent) => { ev.preventDefault(); if (!valid) return; onSave({ tariff: t, exportTariff: e, currency: form.currency }); setEditing(false); };

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b px-5 py-4 sm:px-6 [.border-b]:pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-base font-medium">What it&apos;s worth</CardTitle>
          <CardDescription>{editing ? "Set the rates on your electricity bill" : set.exportTariff ? "Your two electricity rates" : "Your electricity rate"}</CardDescription>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={open} className="-mt-0.5 shrink-0"><Pencil /> Edit rates</Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-5 sm:px-6">
        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-[5.5rem_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cur">Currency</Label>
                <Input id="cur" list="helio-currencies" value={form.currency} maxLength={5} onChange={(x) => setForm({ ...form, currency: x.target.value })} className="font-mono" />
                <datalist id="helio-currencies">{CURRENCIES.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tariff">Price of a unit from the grid</Label>
                <Input id="tariff" inputMode="decimal" type="number" step="any" min="0" value={form.tariff} onChange={(x) => setForm({ ...form, tariff: x.target.value })} className="font-mono" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export">Paid for each unit you export</Label>
              <Input id="export" inputMode="decimal" type="number" step="any" min="0" placeholder="Leave empty if you aren't paid for exports" value={form.exportTariff} onChange={(x) => setForm({ ...form, exportTariff: x.target.value })} className="font-mono" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Saved in this browser only. A unit is one kWh, the number your bill counts.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={!valid}><Check /> Save rates</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              {custom && (
                <Button type="button" size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => { onSave(null); setEditing(false); }}>
                  Reset to {defaults.currency}{defaults.tariff}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <>
            <Rate label="Used at home" rate={set.tariff} note="saves what you'd pay the grid" />
            {set.exportTariff > 0 && <Rate label="Exported to grid" rate={set.exportTariff} note="credited per unit" />}
            <Separator />
            <div className="space-y-3 text-sm">
              <ValueRow label="Today" lo={todayKwh * set.exportTariff} hi={todayKwh * set.tariff} />
              <ValueRow label="This month" lo={monthKwh * set.exportTariff} hi={monthKwh * set.tariff} />
              <ValueRow label="This year" lo={yearKwh * set.exportTariff} hi={yearKwh * set.tariff} />
            </div>
            {set.exportTariff > 0 && <p className="text-xs leading-relaxed text-muted-foreground">The real figure sits in this range depending on how much you use while the sun is up. Use more in the daytime and you get closer to the higher number.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Rate({ label, rate, note }: { label: string; rate: number; note: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
      <div className="font-mono text-sm font-medium tabular">{CUR}{rate}<span className="text-muted-foreground">/unit</span></div>
    </div>
  );
}

function ValueRow({ label, lo, hi }: { label: string; lo: number; hi: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular">{lo > 0 && lo !== hi && <>{inr(lo)} – </>}<b className="font-medium">{inr(hi)}</b></span>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{msg}</div>;
}
