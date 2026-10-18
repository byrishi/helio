import { NextResponse } from "next/server";
import { mockDay, ymd } from "@/lib/shinemonitor";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") || ymd(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  return NextResponse.json(mockDay(date));
}
