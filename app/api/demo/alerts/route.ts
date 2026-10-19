import { alerts } from "@/lib/handlers";

export const dynamic = "force-dynamic";

// Public sample data for the demo. Never sends anything.
export async function GET(req: Request) { return alerts(req, true); }
export async function POST(req: Request) { return alerts(req, true); }
