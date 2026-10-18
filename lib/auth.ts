// Session = "user.expiry.hmac" in an httpOnly cookie. Web Crypto only, so it runs in middleware (edge) and node.
export const COOKIE = "solar_session";
export const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

function secret() {
  const s = process.env.AUTH_SECRET || `${process.env.DASH_PASSWORD ?? ""}::solar-dash`;
  return s;
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSession(user: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const body = `${encodeURIComponent(user)}.${exp}`;
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(token?: string) {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const body = token.slice(0, i);
  const exp = Number(body.split(".")[1]);
  if (!exp || exp < Date.now() / 1000) return false;
  return safeEqual(token.slice(i + 1), await hmac(body));
}

export function checkCredentials(user: string, pass: string) {
  const U = process.env.DASH_USER, P = process.env.DASH_PASSWORD;
  if (!U || !P) return false;
  return safeEqual(user.trim().toLowerCase(), U.trim().toLowerCase()) && safeEqual(pass, P);
}
