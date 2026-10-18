import { NextResponse } from "next/server";
import { noStore, requireSession } from "@/lib/guard";
import { publicSettings } from "@/lib/config";
import { getOverview, type Overview } from "@/lib/shinemonitor";

export const dynamic = "force-dynamic";

let cache: { at: number; data: Overview } | null = null;
const TTL = 60_000; // the inverter reports every ~5 min; no need to hit the cloud more often

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    if (!cache || Date.now() - cache.at > TTL) cache = { at: Date.now(), data: await getOverview() };
    return NextResponse.json({ ...cache.data, settings: publicSettings() }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
