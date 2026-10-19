"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

export const fmt = (n: number, d = 1) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
const to12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

function Tip({ active, payload, title, value }: { active?: boolean; payload?: any[]; title: (p: any) => string; value: (p: any) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="text-muted-foreground">{title(p)}</div>
      <div className="mt-0.5 font-mono text-sm font-medium tabular text-foreground">{value(p)}</div>
    </div>
  );
}

const powerConfig = { kw: { label: "Power", color: "var(--chart-1)" } } satisfies ChartConfig;

export function PowerChart({ points, capacity }: { points: { t: string; kw: number }[]; capacity: number }) {
  if (!points.length) return <div className="grid h-[280px] place-items-center text-sm text-muted-foreground">No generation recorded for this day</div>;
  // Trim overnight zero readings some loggers send, then fit the axis to the day (long summer days
  // at high latitudes run well past 6 am – 7 pm).
  const all = points.map((p) => ({ ...p, m: +p.t.slice(0, 2) * 60 + +p.t.slice(3, 5) }));
  const lit = all.filter((p) => p.kw > 0);
  const lo = lit.length ? lit[0].m - 30 : 330, hi = lit.length ? lit[lit.length - 1].m + 30 : 1140;
  const data = all.filter((p) => p.m >= lo && p.m <= hi);
  const d0 = Math.min(330, Math.floor(lo / 60) * 60), d1 = Math.max(1140, Math.ceil(hi / 60) * 60);
  const xTicks: number[] = []; for (let m = Math.ceil(d0 / 120) * 120; m <= d1; m += 120) xTicks.push(m);
  const top = Math.max(capacity, ...points.map((p) => p.kw));
  const step = top <= 2 ? 0.5 : top <= 5 ? 1 : top <= 10 ? 2 : 5;
  const yMax = Math.ceil((top * 1.08) / step) * step;
  const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => +(i * step).toFixed(2));
  return (
    <ChartContainer config={powerConfig} className="aspect-auto h-[280px] w-full">
      <AreaChart data={data} margin={{ left: -12, right: 8, top: 12 }}>
        <defs>
          <linearGradient id="kwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-kw)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--color-kw)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="m" type="number" domain={[d0, d1]} ticks={xTicks} tickLine={false} axisLine={false} tickMargin={10}
          tickFormatter={(m: number) => { const h = m / 60; return h === 0 || h === 24 ? "12 am" : h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`; }} />
        <YAxis tickLine={false} axisLine={false} width={44} tickMargin={6} domain={[0, yMax]} ticks={yTicks} tickFormatter={(v: number) => fmt(v, step < 1 ? 1 : 0)} />
        {capacity > 0 && <ReferenceLine y={capacity} stroke="var(--muted-foreground)" strokeOpacity={0.4} strokeDasharray="3 4" label={{ value: `${fmt(capacity, 2)} kWp panels`, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }} />}
        <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<Tip title={(p) => to12(p.t)} value={(p) => `${fmt(p.kw, 2)} kW`} />} />
        <Area dataKey="kw" type="monotone" stroke="var(--color-kw)" strokeWidth={2} fill="url(#kwFill)" isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, fill: "var(--card)" }} />
      </AreaChart>
    </ChartContainer>
  );
}

const unitsConfig = { kwh: { label: "Units", color: "var(--chart-1)" } } satisfies ChartConfig;

export function UnitsChart({ items, active, avg, onSelect }: {
  items: { key: string; label: string; title: string; kwh: number }[]; active?: string; avg?: number; onSelect?: (key: string) => void;
}) {
  return (
    <ChartContainer config={unitsConfig} className="aspect-auto h-[280px] w-full">
      <BarChart data={items} margin={{ left: -12, right: 8, top: 12 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval="preserveStartEnd" minTickGap={14} />
        <YAxis tickLine={false} axisLine={false} width={44} tickMargin={6} />
        <ChartTooltip cursor={{ fill: "var(--muted)", radius: 6 }} content={<Tip title={(p) => p.title} value={(p) => `${fmt(p.kwh)} units`} />} />
        {avg ? <ReferenceLine y={avg} stroke="var(--chart-1)" strokeDasharray="3 4" strokeOpacity={0.7} label={{ value: `avg ${fmt(avg)}`, position: "insideTopLeft", fill: "var(--chart-1)", fontSize: 11 }} /> : null}
        <Bar dataKey="kwh" radius={[5, 5, 2, 2]} maxBarSize={36} isAnimationActive={false} onClick={(d: any) => onSelect?.(d.key)} className={onSelect ? "cursor-pointer" : undefined}>
          {items.map((it) => <Cell key={it.key} fill={it.key === active ? "var(--chart-1)" : "var(--chart-muted)"} />)}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 84, h = 28, step = w / Math.max(values.length - 1, 1);
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join("");
  return <svg width={w} height={h} aria-hidden><path d={d} fill="none" stroke="var(--chart-1)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const gridConfig = { v: { label: "Grid voltage", theme: { light: "#2563eb", dark: "#7cb4ff" } } } satisfies ChartConfig;

/** Grid voltage across the day, with the inverter's trip limits marked. */
export function GridChart({ samples, high, low }: { samples: { t: string; gridV: number | null }[]; high: number; low: number }) {
  const data = samples.filter((s) => s.gridV && s.gridV > 0).map((s) => ({ t: s.t, v: s.gridV!, m: +s.t.slice(0, 2) * 60 + +s.t.slice(3, 5) }));
  if (data.length < 2) return <div className="grid h-[180px] place-items-center text-sm text-muted-foreground">No grid readings for this day</div>;
  const lo = Math.min(low - 5, ...data.map((d) => d.v)), hi = Math.max(high + 5, ...data.map((d) => d.v));
  const yMin = Math.floor(lo / 10) * 10, yMax = Math.ceil(hi / 10) * 10;
  const yStep = yMax - yMin > 80 ? 20 : 10;
  const yTicks: number[] = []; for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);
  const m0 = Math.floor(data[0].m / 60) * 60, m1 = Math.ceil(data[data.length - 1].m / 60) * 60;
  const ticks: number[] = []; for (let m = m0; m <= m1; m += m1 - m0 > 600 ? 180 : 120) ticks.push(m);
  return (
    <ChartContainer config={gridConfig} className="aspect-auto h-[180px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <ReferenceArea y1={high} y2={yMax} fill="var(--destructive)" fillOpacity={0.06} ifOverflow="hidden" />
        <ReferenceArea y1={yMin} y2={low} fill="var(--destructive)" fillOpacity={0.06} ifOverflow="hidden" />
        <ReferenceLine y={high} stroke="var(--destructive)" strokeOpacity={0.5} strokeDasharray="3 4" label={{ value: `${high} V`, position: "insideBottomLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />
        <XAxis dataKey="m" type="number" domain={[m0, m1]} ticks={ticks} tickLine={false} axisLine={false} tickMargin={8}
          tickFormatter={(m: number) => { const h = Math.round(m / 60); return h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`; }} />
        <YAxis tickLine={false} axisLine={false} width={44} tickMargin={6} domain={[yMin, yMax]} ticks={yTicks} tickFormatter={(v: number) => fmt(v, 0)} />
        <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<Tip title={(p) => to12(p.t)} value={(p) => `${fmt(p.v, 1)} V`} />} />
        <Line dataKey="v" type="monotone" stroke="var(--color-v)" strokeWidth={1.75} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  );
}
