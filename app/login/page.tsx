"use client";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo, Signature } from "@/components/brand";

export default function Login() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user, pass }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.href = "/";
    else { setErr(j.error || "Sign in failed"); setBusy(false); }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand band — always dark, Cloudflare-style */}
      <aside className="relative hidden overflow-hidden bg-[#141414] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,94,31,0.35),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative flex items-center gap-3"><Logo animate /><span className="font-medium">Helio</span></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-medium leading-[1.1] tracking-tight">Every unit your roof makes, counted.</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">Straight from the inverter&apos;s energy counter, refreshed every five minutes. Today, yesterday, any day.</p>
        </div>
        <div className="relative text-xs text-white/40">Private dashboard · authorised access only</div>
      </aside>

      {/* Form */}
      <main className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center gap-3 lg:hidden"><Logo animate /><span className="font-medium">Helio</span></div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-medium tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your details to view the dashboard.</p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="user">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="user" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" autoCapitalize="none" autoFocus required className="h-11 rounded-lg bg-card pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="pass" type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="current-password" required className="h-11 rounded-lg bg-card px-9" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {err && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{err}</p>}
            <Button type="submit" size="lg" disabled={busy} className="h-11 w-full">
              {busy ? "Signing in…" : <>Continue <ArrowRight /></>}
            </Button>
          </form>
        </div>
        <div className="flex justify-center lg:justify-start"><Signature /></div>
      </main>
    </div>
  );
}
