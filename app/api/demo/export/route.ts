import { exportCsv } from "@/lib/handlers";

export const dynamic = "force-dynamic";

// Public sample data for the demo. Never touches a real account.
export async function GET(req: Request) {
  return exportCsv(req, true);
}
