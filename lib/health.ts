// System health, cleaning advice and an expected-output estimate.
//
// Method (kept deliberately simple and explainable):
//   specific yield   = day's units ÷ system size            (kWh per kWp)
//   irradiation      = Open-Meteo daily shortwave radiation (MJ/m² ÷ 3.6 → kWh/m², horizontal)
//   performance      = specific yield ÷ irradiation          (unitless, like a performance ratio)
//   baseline         = 90th percentile of performance over the last 30 finished days
//                      → "how this system performs on a good, clean day"
//   day score        = performance ÷ baseline                (100% = as good as your best days)
// Weather is what separates a cloudy day from a dirty or faulty system, so without a location
// we fall back to comparing raw yield and say so in the result.

export type DayInput = { date: string; kwh: number };
export type Weather = { date: string; radiationKwhM2: number; rainMm: number };

export type DayHealth = {
  date: string;
  kwh: number;
  specificYield: number | null;  // kWh/kWp
  irradiation: number | null;    // kWh/m²
  rainMm: number | null;
  score: number | null;          // 0..~1.1, vs your best days
  status: "good" | "slightly-low" | "low" | "no-generation" | "too-cloudy" | "no-data" | "unknown";
};

export type Health = {
  method: "weather" | "yield-only";
  baseline: number | null;       // performance (or yield) on a good day
  days: DayHealth[];             // finished days, oldest first
  latest: DayHealth | null;      // most recent finished day
  soiling: {
    lossPct: number | null;      // how far the last sunny days sit below the clean reference
    reference: "after-wash" | "best-days" | null; // what "clean" means for this estimate
    sunnyDays: number;           // days the estimate is based on
    lastRain: { date: string; mm: number } | null;
    advice: "clean" | "watch" | "fine" | "not-enough-data";
  };
  today: { expectedKwh: number | null; low: number | null; high: number | null; forecastIrradiation: number | null };
};

export const RAIN_WASH_MM = 5;     // daily rain that usually washes light dust off tilted panels
const MIN_IRRADIATION = 1.5;       // kWh/m²; below this a day is too cloudy to judge panels by
// Thresholds. Measured against output right after a wash they can be tight; measured against your
// best days (P90) they allow for normal day-to-day scatter, so a clean system isn't flagged.
const LIMITS = { "after-wash": { clean: 0.08, watch: 0.04 }, "best-days": { clean: 0.12, watch: 0.07 } } as const;

const pct = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const median = (xs: number[]) => pct(xs, 0.5);

export function computeHealth(opts: {
  days: DayInput[];              // last 30+ days incl. today, oldest first
  today: string;
  capacityKw: number;
  weather: Weather[] | null;     // includes today's forecast when available
  cleanedOn?: string | null;     // user marked panels cleaned on this date
}): Health {
  const { days, today, capacityKw, weather, cleanedOn } = opts;
  const w = new Map((weather ?? []).map((x) => [x.date, x]));
  const useWeather = !!weather && weather.length > 0 && capacityKw > 0;

  // Days before the first day with any generation are "no data" (the logger wasn't uploading yet),
  // not zero-generation days.
  const firstData = days.find((d) => d.kwh > 0)?.date ?? today;
  const finished = days.filter((d) => d.date < today);
  const perf = (d: DayInput) => {
    if (!capacityKw) return null;
    const sy = d.kwh / capacityKw;
    if (!useWeather) return sy;
    const irr = w.get(d.date)?.radiationKwhM2;
    return irr && irr >= MIN_IRRADIATION ? sy / irr : null;
  };

  const perfs = finished.filter((d) => d.kwh > 0).map(perf).filter((x): x is number => x !== null);
  const baseline = perfs.length >= 7 ? pct(perfs, 0.9) : null;

  const out: DayHealth[] = finished.map((d) => {
    const wx = w.get(d.date);
    const irr = wx?.radiationKwhM2 ?? null;
    const sy = capacityKw ? d.kwh / capacityKw : null;
    const p = perf(d);
    const score = p !== null && baseline ? p / baseline : null;
    let status: DayHealth["status"] = "unknown";
    if (d.date < firstData) status = "no-data";
    else if (d.kwh === 0 && (!useWeather || (irr ?? 0) >= MIN_IRRADIATION)) status = "no-generation";
    else if (useWeather && irr !== null && irr < MIN_IRRADIATION) status = "too-cloudy";
    else if (score !== null) status = score >= 0.9 ? "good" : score >= 0.75 ? "slightly-low" : "low";
    return { date: d.date, kwh: d.kwh, specificYield: sy, irradiation: irr, rainMm: wx?.rainMm ?? null, score, status };
  });

  // Soiling: compare recent sunny days with how the panels ran when clean. "Clean" is the first sunny
  // days after the previous wash (rain or cleaning) when we can see them, otherwise your best days.
  const washes = out.filter((d) => (d.rainMm ?? 0) >= RAIN_WASH_MM).map((d) => d.date);
  if (cleanedOn) washes.push(cleanedOn);
  washes.sort();
  const lastRainDay = [...out].reverse().find((d) => (d.rainMm ?? 0) >= RAIN_WASH_MM);
  const sinceWash = washes.at(-1) ?? null;
  const judged = (d: DayHealth) => d.score !== null && d.status !== "too-cloudy" && d.status !== "no-generation";
  const sunny = out.slice(-7).filter((d) => judged(d) && (!sinceWash || d.date > sinceWash));
  const recentScore = median(sunny.map((d) => d.score!));
  // Reference: up to 3 judged days right after the previous wash, if there was one in the window.
  const prevWash = washes.filter((w) => !sunny.length || w < sunny[0].date).at(-1);
  const afterWash = prevWash ? out.filter((d) => d.date > prevWash && judged(d)).slice(0, 3) : [];
  const reference: Health["soiling"]["reference"] = afterWash.length >= 2 ? "after-wash" : recentScore !== null ? "best-days" : null;
  const refScore = reference === "after-wash" ? median(afterWash.map((d) => d.score!)) : 1;
  const lossPct = recentScore !== null && refScore ? Math.max(0, 1 - recentScore / refScore) : null;
  let advice: Health["soiling"]["advice"] = "not-enough-data";
  if (useWeather && sunny.length >= 4 && lossPct !== null && reference) {
    const L = LIMITS[reference];
    advice = lossPct >= L.clean ? "clean" : lossPct >= L.watch ? "watch" : "fine";
  }

  // Today's expectation from the forecast: good-day performance × forecast sunshine × system size.
  const f = w.get(today)?.radiationKwhM2 ?? null;
  const goodPerfs = perfs.length >= 7 ? [pct(perfs, 0.6)!, pct(perfs, 0.95)!] : null;
  const expected = useWeather && f && baseline && capacityKw ? baseline * f * capacityKw : null;

  return {
    method: useWeather ? "weather" : "yield-only",
    baseline,
    days: out,
    latest: out.at(-1) ?? null,
    soiling: { lossPct, reference, sunnyDays: sunny.length, lastRain: lastRainDay ? { date: lastRainDay.date, mm: lastRainDay.rainMm! } : null, advice },
    today: {
      expectedKwh: expected,
      low: useWeather && f && goodPerfs && capacityKw ? goodPerfs[0] * f * capacityKw : null,
      high: useWeather && f && goodPerfs && capacityKw ? goodPerfs[1] * f * capacityKw : null,
      forecastIrradiation: f,
    },
  };
}

/** Daily radiation and rain for the last `pastDays` days plus today (forecast), from Open-Meteo (free, no key).
 *  Only the coordinates are sent, rounded to 2 decimals (about 1 km). Set WEATHER=off to never call it. */
export async function fetchWeather(lat: number, lon: number, pastDays = 35, timezone = "auto"): Promise<Weather[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&daily=shortwave_radiation_sum,precipitation_sum&past_days=${pastDays}&forecast_days=1&timezone=${encodeURIComponent(timezone)}`;
  if (/^(off|false|0|no)$/i.test(process.env.WEATHER ?? "")) throw new Error("Weather is turned off (WEATHER=off)");
  const r = await fetch(url, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
  const j = await r.json();
  const t: string[] = j?.daily?.time ?? [];
  return t.map((date, i) => ({
    date,
    radiationKwhM2: Number(j.daily.shortwave_radiation_sum?.[i] ?? 0) / 3.6,
    rainMm: Number(j.daily.precipitation_sum?.[i] ?? 0),
  })).filter((x) => Number.isFinite(x.radiationKwhM2));
}
