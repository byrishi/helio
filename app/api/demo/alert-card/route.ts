import { report } from "@/lib/handlers";
import { renderCard } from "@/lib/alert-card";

export const dynamic = "force-dynamic";

// The demo's alert card as a PNG: what the daily Telegram image looks like.
export async function GET() {
  const rep = await report(true);
  return new Response(await renderCard(rep.card), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=600" } });
}
