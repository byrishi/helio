import { requireSession } from "@/lib/guard";
import { alerts } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = await requireSession();
  return denied ?? alerts(req, false);
}
export async function POST(req: Request) {
  const denied = await requireSession();
  return denied ?? alerts(req, false);
}
