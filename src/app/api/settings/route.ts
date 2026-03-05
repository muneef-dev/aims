import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [settings] = await db.select().from(systemSettings).limit(1);

  return NextResponse.json({
    lastWeeklyReportAt: settings?.lastWeeklyReportAt ?? null,
  });
}
