import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockUpdates, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const limit = Math.min(
    100,
    parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10)
  );

  const history = await db
    .select({
      id: stockUpdates.id,
      updateType: stockUpdates.updateType,
      quantity: stockUpdates.quantity,
      previousStock: stockUpdates.previousStock,
      newStock: stockUpdates.newStock,
      note: stockUpdates.note,
      userName: users.name,
      createdAt: stockUpdates.createdAt,
    })
    .from(stockUpdates)
    .leftJoin(users, eq(stockUpdates.userId, users.id))
    .where(eq(stockUpdates.productId, id))
    .orderBy(desc(stockUpdates.createdAt))
    .limit(limit);

  return NextResponse.json(history);
}
