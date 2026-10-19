import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Animated 404: the "0" is the sun, sinking behind a row of panels and rising again.
// Pure CSS, no client JS; motion stops for people who prefer reduced motion.
export default function NotFound() {
  return (
    <main className="nf relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <style>{css}</style>
      <div className="nf-sky" aria-hidden />
      <div className="relative z-10 flex w-full max-w-[560px] flex-col items-center text-center">
        <div className="nf-code" aria-hidden>
          <span>4</span>
          <span className="nf-sunbox">
            <span className="nf-rays" />
            <span className="nf-sun" />
            <span className="nf-horizon" />
          </span>
          <span>4</span>
        </div>
        <div className="nf-panels" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />)}
        </div>
        <h1 className="mt-10 text-2xl font-medium tracking-tight sm:text-3xl">Nothing generating here</h1>
        <p className="mt-3 max-w-[44ch] text-balance text-sm text-muted-foreground sm:text-base">
          This page doesn&apos;t exist. The link may have a typo, or the page has moved.
        </p>
        <Link href="/" className="mt-8 inline-flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Back to Helio
        </Link>
      </div>
    </main>
  );
}

const css = `
.nf{background:var(--background)}
.nf-sky{position:absolute;inset:0;background:radial-gradient(70% 55% at 50% 38%,color-mix(in oklab,var(--primary) 16%,transparent),transparent 70%);animation:nf-glow 9s ease-in-out infinite}
.nf-code{display:flex;align-items:center;justify-content:center;gap:clamp(6px,2vw,18px);font-family:var(--font-mono,ui-monospace),ui-monospace,monospace;font-weight:500;font-size:clamp(84px,24vw,168px);line-height:1;letter-spacing:-.04em;color:var(--foreground)}
.nf-sunbox{position:relative;display:block;width:.78em;height:1em;clip-path:inset(-60% -60% .08em -60%)}
.nf-sun{position:absolute;left:50%;top:50%;width:.56em;height:.56em;margin:-.28em 0 0 -.28em;border-radius:50%;background:radial-gradient(circle at 40% 38%,#ffd29a,var(--primary) 62%);box-shadow:0 0 .35em color-mix(in oklab,var(--primary) 55%,transparent);animation:nf-set 9s cubic-bezier(.45,0,.55,1) infinite}
.nf-rays{position:absolute;left:50%;top:50%;width:.9em;height:.9em;margin:-.45em 0 0 -.45em;border-radius:50%;background:repeating-conic-gradient(color-mix(in oklab,var(--primary) 45%,transparent) 0 6deg,transparent 6deg 30deg);mask:radial-gradient(circle,transparent 58%,#000 60%,#000 70%,transparent 72%);-webkit-mask:radial-gradient(circle,transparent 58%,#000 60%,#000 70%,transparent 72%);animation:nf-set 9s cubic-bezier(.45,0,.55,1) infinite,nf-spin 18s linear infinite}
.nf-horizon{position:absolute;left:-.04em;right:-.04em;bottom:.08em;height:.055em;border-radius:99px;background:var(--foreground);clip-path:none}
.nf-panels{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;width:min(100%,360px);margin-top:18px;perspective:400px}
.nf-panels span{height:22px;border-radius:3px;background:linear-gradient(180deg,#36589c,#1a2f5c);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);transform:rotateX(38deg);position:relative;overflow:hidden;animation:nf-shine 9s ease-in-out infinite}
.nf-panels span::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 9px,rgba(255,255,255,.14) 9px 10px),repeating-linear-gradient(0deg,transparent 0 6px,rgba(255,255,255,.14) 6px 7px)}
@keyframes nf-set{0%,8%{transform:translateY(-6%)}46%,54%{transform:translateY(125%)}92%,100%{transform:translateY(-6%)}}
@keyframes nf-spin{to{rotate:360deg}}
@keyframes nf-glow{0%,8%,92%,100%{opacity:1}46%,54%{opacity:.35}}
@keyframes nf-shine{0%,8%,92%,100%{filter:brightness(1.25)}46%,54%{filter:brightness(.7)}}
@media (prefers-reduced-motion:reduce){.nf-sky,.nf-sun,.nf-rays,.nf-panels span{animation:none}}
`;
