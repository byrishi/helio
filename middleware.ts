import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "@/lib/auth";

// Anyone can open the demo (sample data only). Everything else needs a session.
const PUBLIC = [/^\/demo(\/|$)/, /^\/api\/demo(\/|$)/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();

  const ok = await verifySession(req.cookies.get(COOKIE)?.value);
  if (pathname === "/login") return ok ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (ok) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|webp|gif)$).*)"],
};
