import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { anomalies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

// PATCH — acknowledge an anomaly
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [existing] = await db
    .select({ id: anomalies.id })
    .from(anomalies)
    .where(eq(anomalies.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Anomaly not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(anomalies)
    .set({
      isAcknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedBy: session.user.id,
    })
    .where(eq(anomalies.id, id))
    .returning();

  return NextResponse.json(updated);
}
