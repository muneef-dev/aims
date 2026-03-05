import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, stockUpdates, categories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all active products with their categories
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryName: categories.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      leadTimeDays: products.leadTimeDays,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true));

  // Get average daily consumption over last 90 days per product
  const consumption = await db
    .select({
      productId: stockUpdates.productId,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
      daySpan: sql<number>`greatest(extract(day from now() - min(${stockUpdates.createdAt})), 1)::int`,
    })
    .from(stockUpdates)
    .where(sql`${stockUpdates.createdAt} >= now() - interval '90 days'`)
    .groupBy(stockUpdates.productId);

  const consumptionMap = new Map(
    consumption.map((c) => [
      c.productId,
      { totalOut: c.totalOut, dailyRate: c.totalOut / Math.max(c.daySpan, 1) },
    ])
  );

  const timeline = allProducts.map((product) => {
    const usage = consumptionMap.get(product.id);
    const dailyRate = usage?.dailyRate ?? 0;
    const daysUntilStockout = dailyRate > 0 ? Math.round(product.currentStock / dailyRate) : null;
    const daysUntilMinLevel =
      dailyRate > 0 && product.currentStock > product.minStockLevel
        ? Math.round((product.currentStock - product.minStockLevel) / dailyRate)
        : product.currentStock <= product.minStockLevel
          ? 0
          : null;

    const stockoutDate = daysUntilStockout != null
      ? new Date(Date.now() + daysUntilStockout * 86400000).toISOString()
      : null;

    let risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE" = "NONE";
    if (product.currentStock === 0) risk = "CRITICAL";
    else if (daysUntilStockout != null && daysUntilStockout <= (product.leadTimeDays ?? 7)) risk = "CRITICAL";
    else if (daysUntilStockout != null && daysUntilStockout <= (product.leadTimeDays ?? 7) * 2) risk = "HIGH";
    else if (daysUntilMinLevel != null && daysUntilMinLevel <= 14) risk = "MEDIUM";
    else if (dailyRate > 0) risk = "LOW";

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      categoryName: product.categoryName,
      currentStock: product.currentStock,
      minStockLevel: product.minStockLevel,
      leadTimeDays: product.leadTimeDays ?? 7,
      dailyConsumption: Math.round(dailyRate * 100) / 100,
      daysUntilStockout,
      daysUntilMinLevel,
      stockoutDate,
      risk,
    };
  });

  // Sort by risk (CRITICAL first) then by daysUntilStockout
  const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  timeline.sort((a, b) => {
    const riskDiff = riskOrder[a.risk] - riskOrder[b.risk];
    if (riskDiff !== 0) return riskDiff;
    if (a.daysUntilStockout == null) return 1;
    if (b.daysUntilStockout == null) return -1;
    return a.daysUntilStockout - b.daysUntilStockout;
  });

  return NextResponse.json({ data: timeline });
}
