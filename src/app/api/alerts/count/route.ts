import { NextResponse } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [result] = await db
    .select({ unreadCount: sql<number>`count(*)::int` })
    .from(alerts)
    .where(and(eq(alerts.isRead, false), eq(alerts.isResolved, false)));

  return NextResponse.json({ unreadCount: result.unreadCount });
}
