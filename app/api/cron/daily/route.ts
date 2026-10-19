import { cronDaily } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Scheduled in vercel.json. Protected by CRON_SECRET, not by the dashboard session.
export async function GET(req: Request) { return cronDaily(req); }
