// Personal branding. Override with NEXT_PUBLIC_BRAND_NAME / NEXT_PUBLIC_BRAND_URL.
const NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "Rishi Shah";
const URL = process.env.NEXT_PUBLIC_BRAND_URL || "https://rishishah.in";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path d="M8.5 19a7.5 7.5 0 0 1 15 0Z" fill="#f59e0b" />
      <path d="M5 19h22" strokeWidth="2.2" strokeLinecap="round" className="stroke-background" />
      <path d="M9 23.5h14" strokeWidth="2.2" strokeLinecap="round" opacity=".5" className="stroke-background" />
    </svg>
  );
}

export function Signature() {
  return (
    <a href={URL} target="_blank" rel="noopener" className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
      Designed &amp; built by <span className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors group-hover:decoration-primary">{NAME}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50 transition-opacity group-hover:opacity-100" aria-hidden><path d="M7 17 17 7M7 7h10v10" /></svg>
    </a>
  );
}

export function GithubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}
