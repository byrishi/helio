import { requireSession } from "@/lib/guard";
import { report } from "@/lib/handlers";
import { renderCard } from "@/lib/alert-card";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Today's alert card as a PNG, for the preview on the dashboard.
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  const rep = await report(false);
  return new Response(await renderCard(rep.card), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
}
