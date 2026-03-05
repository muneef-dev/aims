import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, stockUpdates } from "@/db/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [stats] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      lowStockCount: sql<number>`count(*) filter (where ${products.currentStock} > 0 and ${products.currentStock} <= ${products.minStockLevel})::int`,
      outOfStockCount: sql<number>`count(*) filter (where ${products.currentStock} = 0)::int`,
      totalUnits: sql<number>`coalesce(sum(${products.currentStock}), 0)::int`,
    })
    .from(products)
    .where(eq(products.isActive, true));

  const topProducts = await db
    .select({
      name: products.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(sql`${products.currentStock} desc`)
    .limit(10);

  const categoryDistribution = await db
    .select({
      name: categories.name,
      totalUnits: sql<number>`coalesce(sum(${products.currentStock}), 0)::int`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .groupBy(categories.name);

  // Period metrics: stock movements within the date range
  let periodMetrics = null;
  if (fromParam && toParam) {
    const from = new Date(fromParam);
    const to = new Date(toParam);
    to.setHours(23, 59, 59, 999);

    const dateConditions = and(
      gte(stockUpdates.createdAt, from),
      lte(stockUpdates.createdAt, to)
    );

    const [movements] = await db
      .select({
        totalMovements: sql<number>`count(*)::int`,
        totalIn: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} in ('RESTOCK', 'ADJUSTMENT', 'RETURN') then ${stockUpdates.quantity} else 0 end), 0)::int`,
        totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} in ('SALE', 'DAMAGE_WRITEOFF') then ${stockUpdates.quantity} else 0 end), 0)::int`,
      })
      .from(stockUpdates)
      .where(dateConditions);

    periodMetrics = {
      from: fromParam,
      to: toParam,
      totalMovements: movements.totalMovements,
      totalIn: movements.totalIn,
      totalOut: movements.totalOut,
    };
  }

  return NextResponse.json({
    totalProducts: stats.totalProducts,
    lowStockCount: stats.lowStockCount,
    outOfStockCount: stats.outOfStockCount,
    totalUnits: stats.totalUnits,
    topProducts,
    categoryDistribution,
    periodMetrics,
  });
}
