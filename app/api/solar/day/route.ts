import { NextResponse } from "next/server";
import { noStore, requireSession } from "@/lib/guard";
import { getDay, ymd } from "@/lib/shinemonitor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const date = new URL(req.url).searchParams.get("date") || ymd(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  try {
    return NextResponse.json(await getDay(date), { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
