import { NextResponse } from "next/server";
import { mockOverview } from "@/lib/shinemonitor";

export const dynamic = "force-dynamic";

// Public sample data for the demo. Never touches a real account.
export async function GET() {
  return NextResponse.json({
    ...mockOverview(),
    settings: { timezone: "Asia/Kolkata", tariff: 7.5, exportTariff: 2.25, currency: "₹", locale: "en-IN" },
  });
}
