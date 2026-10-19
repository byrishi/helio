import { requireSession } from "@/lib/guard";
import { exportCsv } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  return exportCsv(req, false);
}
