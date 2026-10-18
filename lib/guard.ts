import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, verifySession } from "@/lib/auth";

// Defence in depth: every data route re-checks the session even though middleware already did.
export async function requireSession() {
  const ok = await verifySession((await cookies()).get(COOKIE)?.value);
  return ok ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

export const noStore = { "Cache-Control": "private, no-store, max-age=0" };
