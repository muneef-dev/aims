import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Validate allowed fields
  const updateData: Record<string, unknown> = {};

  if (body.isRead === true) {
    updateData.isRead = true;
  }

  if (body.isResolved === true) {
    updateData.isResolved = true;
    updateData.resolvedAt = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(alerts)
    .set(updateData)
    .where(eq(alerts.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
