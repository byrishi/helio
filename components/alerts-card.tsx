"use client";
import { useEffect, useState } from "react";
import { BellRing, Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Data = {
  channels: { telegram: boolean; ntfy: boolean; cron: boolean; onlyIssues: boolean };
  preview: { title: string; body: string; issues: string[]; priority: string };
};

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
      setResult(sent.map((s) => `${s.channel === "ntfy" ? "ntfy" : "Telegram"}: ${s.ok ? "sent" : `failed (${s.error})`}`).join(" · "));
    } catch (e) { setResult((e as Error).message); }
    setSending(false);
  };

  const any = d && (d.channels.telegram || d.channels.ntfy);
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-5 py-4 sm:px-6 [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium"><BellRing className="size-4 text-muted-foreground" />Daily alert</CardTitle>
        <CardDescription>Today&apos;s units and anything to check, once a day in the evening</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5 sm:px-6">
        {!d ? (err ? <p className="text-sm text-destructive">Couldn&apos;t load alerts: {err}</p> : <Skeleton className="h-24 w-full" />) : (
          <>
            {demo ? (
              <p className="text-sm text-muted-foreground">On your own copy this goes to Telegram or the free ntfy app. Here&apos;s what today&apos;s message would say for the demo roof.</p>
            ) : (
              <dl className="space-y-1.5 text-sm">
                <Status k="ntfy" on={d.channels.ntfy} />
                <Status k="Telegram" on={d.channels.telegram} />
                <Status k="Daily schedule" on={d.channels.cron} off="needs CRON_SECRET" />
              </dl>
            )}
            <div>
              <button type="button" onClick={() => setOpen((v) => !v)} className="text-sm font-medium underline underline-offset-4 hover:text-primary" aria-expanded={open}>
                {open ? "Hide" : "Preview"} today&apos;s message
              </button>
              {open && (
                <div className="mt-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-[13px] leading-relaxed">
                  <div className="font-medium">{d.preview.title}</div>
                  <div className="mt-1.5 whitespace-pre-line break-words text-muted-foreground">{d.preview.body}</div>
                </div>
              )}
            </div>
            {!demo && (any
              ? <Button size="sm" variant="outline" onClick={test} disabled={sending}><Send />{sending ? "Sending…" : "Send a test alert"}</Button>
              : <p className="text-sm text-muted-foreground">No channel set yet. <a href={docsUrl} target="_blank" rel="noopener" className="font-medium text-foreground underline underline-offset-4">Set up alerts</a> in about two minutes.</p>)}
            {result && <p className="text-xs text-muted-foreground">{result}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Status({ k, on, off = "not set" }: { k: string; on: boolean; off?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn("inline-flex items-center gap-1.5", on ? "text-success" : "text-muted-foreground")}>{on ? <Check className="size-3.5" /> : <X className="size-3.5" />}{on ? "on" : off}</dd>
    </div>
  );
}
