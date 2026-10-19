"use client";
import { useEffect, useState } from "react";
import { BellRing, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Data = {
  channels: { helioBot: boolean; ownBot: boolean; onlyIssues: boolean };
  preview: { title: string; body: string; issues: string[]; priority: string };
};

// Opens the Helio Solar bot; forks can point this at their own relay.
const CONNECT_URL = process.env.NEXT_PUBLIC_TELEGRAM_CONNECT_URL || "https://helio.rishishah.in/telegram";

export function AlertsCard({ api = "/api/solar", demo = false, docsUrl }: { api?: string; demo?: boolean; docsUrl: string }) {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${api}/alerts`, { cache: "no-store" }).then((r) => r.json()).then((j) => { if (j.error) throw new Error(j.error); setD(j); }).catch((e) => setErr(e.message));
  }, [api]);

  const test = async () => {
    setSending(true); setResult(null);
    try {
      const j = await fetch(`${api}/alerts`, { method: "POST" }).then((r) => r.json());
      if (j.error) throw new Error(j.error);
      const sent = j.sent as { channel: string; ok: boolean; error?: string }[];
      setResult(sent.map((s) => (s.ok ? `Sent. Check Telegram.` : `Couldn't send (${s.error})`)).join(" "));
    } catch (e) { setResult((e as Error).message); }
    setSending(false);
  };

  const connected = d && (d.channels.helioBot || d.channels.ownBot);
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4 sm:px-6 [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium"><BellRing className="size-4 text-muted-foreground" />Daily alert</CardTitle>
        <CardDescription>Today&apos;s units and anything to check, on Telegram every evening</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5 sm:px-6">
        {!d ? (err ? <p className="text-sm text-destructive">Couldn&apos;t load alerts: {err}</p> : <Skeleton className="h-24 w-full" />) : (
          <>
            {demo ? (
              <p className="text-sm text-muted-foreground">On your own copy this arrives from the Helio Solar bot on Telegram. Here&apos;s what today&apos;s message would say for the demo roof.</p>
            ) : connected ? (
              <p className="flex items-center gap-2 text-sm"><Check className="size-4 text-success" />Connected to {d.channels.helioBot ? "the Helio Solar bot" : "your Telegram bot"}{d.channels.onlyIssues ? ", only on days with something to check" : ""}</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground marker:text-muted-foreground/70">
                <li>Tap <span className="font-medium text-foreground">Connect Telegram</span> and press Start.</li>
                <li>Add the code the bot sends as <code className="rounded bg-muted px-1 font-mono text-[12px] text-foreground">TELEGRAM_LINK</code> in Vercel, then redeploy.</li>
              </ol>
            )}

            <div className="flex flex-wrap gap-2">
              {!demo && !connected && (
                <Button asChild size="sm"><a href={CONNECT_URL} target="_blank" rel="noopener"><Send />Connect Telegram</a></Button>
              )}
              {!demo && connected && (
                <Button size="sm" variant="outline" onClick={test} disabled={sending}><Send />{sending ? "Sending…" : "Send a test alert"}</Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>{open ? "Hide preview" : "Preview today's message"}</Button>
            </div>

            {open && (
              <div className="overflow-hidden rounded-lg border bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${api}/alert-card`} alt={`Today's alert: ${d.preview.title}`} width={1080} height={1440} className="block h-auto w-full" />
                <div className="px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">Sent as this image, with the &ldquo;to check&rdquo; list as its caption.</div>
              </div>
            )}
            {result && <p className="text-xs text-muted-foreground">{result}</p>}
            {!demo && !connected && <p className="text-xs text-muted-foreground">Prefer your own bot? <a href={docsUrl} target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-foreground">See the options</a>.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
