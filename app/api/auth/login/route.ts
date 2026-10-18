import { NextResponse } from "next/server";
import { COOKIE, MAX_AGE, checkCredentials, createSession } from "@/lib/auth";

// Lockout after repeated failures, per IP. In-memory: resets on cold start, which is fine for a home dashboard.
const MAX_FAILS = 5, WINDOW_MS = 15 * 60_000;
const fails = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const rec = fails.get(ip);
  if (rec && rec.n >= MAX_FAILS && Date.now() < rec.until) {
    const mins = Math.ceil((rec.until - Date.now()) / 60_000);
    return NextResponse.json({ error: `Too many attempts. Try again in ${mins} min.` }, { status: 429 });
  }
  const { user = "", pass = "" } = await req.json().catch(() => ({}));
  if (!process.env.DASH_USER || !process.env.DASH_PASSWORD) {
    return NextResponse.json({ error: "Login is not configured. Set DASH_USER and DASH_PASSWORD." }, { status: 500 });
  }
  if (!checkCredentials(String(user), String(pass))) {
    const cur = fails.get(ip);
    const fresh = !cur || Date.now() > cur.until;
    fails.set(ip, { n: fresh ? 1 : cur!.n + 1, until: Date.now() + WINDOW_MS });
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
  }
  fails.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createSession(String(user)), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
  return res;
}
