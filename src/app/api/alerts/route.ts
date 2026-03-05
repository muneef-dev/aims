import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts, products } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const resolved = searchParams.get("resolved") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const conditions = [eq(alerts.isResolved, resolved)];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(and(...conditions));

  const data = await db
    .select({
      id: alerts.id,
      productId: alerts.productId,
      productName: products.name,
      productSku: products.sku,
      type: alerts.type,
      message: alerts.message,
      isRead: alerts.isRead,
      isResolved: alerts.isResolved,
      resolvedAt: alerts.resolvedAt,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .leftJoin(products, eq(alerts.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(alerts.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    data,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  });
}
