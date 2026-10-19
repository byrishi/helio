// The daily alert as a branded image (1080×1440, 3:4 portrait so it fills a phone screen in Telegram).
// Rendered on your own server with next/og; nothing leaves it except the finished PNG.
import { ImageResponse } from "next/og";
import type { Card } from "@/lib/alerts";
import { instrument400, instrument500 } from "@/lib/card-fonts";

const W = 1080, H = 1440;
const C = { paper: "#f6f7f8", card: "#ffffff", ink: "#101418", ink2: "#47515c", ink3: "#7d8792", line: "#e2e6ea", sun: "#ff5e1f", ok: "#1f8a5b", warn: "#b45309", warnBg: "#fff7e8", warnLine: "#f1d08a" };
const fonts = () => [
  { name: "Instrument", data: Buffer.from(instrument400, "base64"), weight: 400 as const, style: "normal" as const },
  { name: "Instrument", data: Buffer.from(instrument500, "base64"), weight: 500 as const, style: "normal" as const },
];
const t12 = (m: number) => { const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`; };

function Curve({ pts, w, h }: { pts: { t: string; kw: number }[]; w: number; h: number }) {
  const data = pts.map((p) => ({ m: +p.t.slice(0, 2) * 60 + +p.t.slice(3, 5), kw: p.kw }));
  const lit = data.filter((d) => d.kw > 0);
  if (lit.length < 3) return <div style={{ display: "flex", width: w, height: h, alignItems: "center", justifyContent: "center", color: C.ink3, fontSize: 26 }}>No power curve today</div>;
  const m0 = Math.floor((lit[0].m - 30) / 60) * 60, m1 = Math.ceil((lit[lit.length - 1].m + 30) / 60) * 60;
  const top = Math.max(...lit.map((d) => d.kw)) * 1.12;
  const x = (m: number) => ((m - m0) / (m1 - m0)) * w, y = (kw: number) => h - (kw / top) * h;
  const inRange = data.filter((d) => d.m >= m0 && d.m <= m1);
  const line = inRange.map((d, i) => `${i ? "L" : "M"}${x(d.m).toFixed(1)},${y(d.kw).toFixed(1)}`).join(" ");
  const area = `${line} L${x(inRange[inRange.length - 1].m).toFixed(1)},${h} L${x(inRange[0].m).toFixed(1)},${h} Z`;
  const ticks: number[] = []; for (let m = m0; m <= m1; m += (m1 - m0) > 600 ? 180 : 120) ticks.push(m);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.sun} stopOpacity="0.28" /><stop offset="100%" stopColor={C.sun} stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#g)" />
        <path d={line} fill="none" stroke={C.sun} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{ display: "flex", position: "relative", width: w, height: 34, marginTop: 10 }}>
        {ticks.map((m) => <div key={m} style={{ position: "absolute", left: Math.max(0, Math.min(w - 70, x(m) - 30)), fontSize: 22, color: C.ink3 }}>{t12(m)}</div>)}
      </div>
    </div>
  );
}

function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="9" fill={C.sun} />
      <circle cx="16" cy="16" r="5" fill="#fff" />
      <g stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M16 5.5v2.4M16 24.1v2.4M5.5 16h2.4M24.1 16h2.4M8.6 8.6l1.7 1.7M21.7 21.7l1.7 1.7M8.6 23.4l1.7-1.7M21.7 10.3l1.7-1.7" /></g>
    </svg>
  );
}

export async function renderCard(c: Card): Promise<ArrayBuffer> {
  const tone = (t: string) => (t === "warn" ? C.warn : t === "ok" ? C.ok : C.ink3);
  const issues = c.issues.slice(0, 2);
  const more = c.issues.length - issues.length;
  const res = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: C.paper, padding: "56px 64px 48px", fontFamily: "Instrument", color: C.ink }}>
        {/* Brand and date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}><Logo size={52} /><div style={{ fontSize: 36, fontWeight: 500, letterSpacing: -1.2 }}>Helio</div></div>
          <div style={{ fontSize: 28, color: C.ink2 }}>{c.date}</div>
        </div>

        {/* The number */}
        <div style={{ display: "flex", marginTop: 48, fontSize: 30, color: C.ink2 }}>{c.name}</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 18 }}>
          <div style={{ display: "flex", fontSize: 160, fontWeight: 500, letterSpacing: -8, lineHeight: 0.9 }}>{c.kwh.toFixed(1)}</div>
          <div style={{ display: "flex", fontSize: 40, color: C.ink2, marginBottom: 8 }}>kWh today</div>
        </div>
        <div style={{ display: "flex", marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 999, background: c.ok ? "#e8f5ee" : C.warnBg, border: `2px solid ${c.ok ? "#bfe3cf" : C.warnLine}`, color: c.ok ? C.ok : C.warn, fontSize: 28, fontWeight: 500 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: c.ok ? C.ok : C.warn }} />{c.verdict}
          </div>
        </div>

        {/* Today's curve */}
        <div style={{ display: "flex", marginTop: 36 }}><Curve pts={c.curve} w={W - 128} h={170} /></div>

        {/* Three figures */}
        <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
          {c.stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, background: C.card, border: `2px solid ${C.line}`, borderRadius: 24, padding: "22px 26px" }}>
              <div style={{ fontSize: 46, fontWeight: 500, letterSpacing: -1.6 }}>{s.value}</div>
              <div style={{ fontSize: 24, color: C.ink3, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Checks */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 16, background: C.card, border: `2px solid ${C.line}`, borderRadius: 24, padding: "8px 28px" }}>
          {c.rows.map((r, i) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "15px 0", borderTop: i ? `2px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 27, color: C.ink2 }}><div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, background: tone(r.tone) }} />{r.label}</div>
              <div style={{ display: "flex", fontSize: 27, fontWeight: 500, textAlign: "right", maxWidth: 640 }}>{r.value}</div>
            </div>
          ))}
        </div>

        {/* What to do */}
        {issues.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 16, background: C.warnBg, border: `2px solid ${C.warnLine}`, borderRadius: 24, padding: "22px 28px", gap: 12 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: C.warn }}>To check</div>
            {issues.map((s) => <div key={s} style={{ display: "flex", fontSize: 26, lineHeight: 1.35, color: "#3d2a08" }}>{s}</div>)}
            {more > 0 && <div style={{ display: "flex", fontSize: 23, color: C.warn }}>+{more} more in the message</div>}
          </div>
        )}

        <div style={{ display: "flex", marginTop: "auto", paddingTop: 24, justifyContent: "space-between", fontSize: 22, color: C.ink3 }}>
          <div style={{ display: "flex" }}>Helio · free, open-source solar dashboard</div>
          <div style={{ display: "flex" }}>helio.rishishah.in</div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fonts() },
  );
  return res.arrayBuffer();
}
