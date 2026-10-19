import { NextResponse } from "next/server";
import { noStore, requireSession } from "@/lib/guard";
import { publicSettings } from "@/lib/config";
import { overview } from "@/lib/handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    return NextResponse.json({ ...(await overview(false)), settings: publicSettings() }, { headers: noStore });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
