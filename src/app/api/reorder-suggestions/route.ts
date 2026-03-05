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

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryName: categories.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      maxStockLevel: products.maxStockLevel,
      leadTimeDays: products.leadTimeDays,
      unitCostPrice: products.unitCostPrice,
      supplierName: products.supplierName,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true));

  // Average daily consumption over last 90 days
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

  const suggestions = allProducts
    .map((product) => {
      const usage = consumptionMap.get(product.id);
      const dailyRate = usage?.dailyRate ?? 0;
      const leadTime = product.leadTimeDays ?? 7;

      // Safety stock = 1.5x lead time demand
      const leadTimeDemand = Math.ceil(dailyRate * leadTime);
      const safetyStock = Math.ceil(leadTimeDemand * 1.5);

      // Reorder point = lead time demand + safety stock buffer
      const reorderPoint = leadTimeDemand + Math.ceil(safetyStock * 0.5);

      // Economic order quantity approximation (target max stock level)
      const targetStock = product.maxStockLevel;
      const suggestedQuantity = Math.max(0, targetStock - product.currentStock + leadTimeDemand);

      // Estimated cost
      const estimatedCost = suggestedQuantity * (product.unitCostPrice ?? 0);

      // Urgency
      const daysUntilStockout = dailyRate > 0 ? product.currentStock / dailyRate : null;
      let urgency: "ORDER_NOW" | "ORDER_SOON" | "PLAN_AHEAD" | "ADEQUATE" = "ADEQUATE";
      if (product.currentStock === 0) urgency = "ORDER_NOW";
      else if (product.currentStock <= product.minStockLevel) urgency = "ORDER_NOW";
      else if (daysUntilStockout != null && daysUntilStockout <= leadTime) urgency = "ORDER_NOW";
      else if (daysUntilStockout != null && daysUntilStockout <= leadTime * 2) urgency = "ORDER_SOON";
      else if (product.currentStock <= reorderPoint) urgency = "PLAN_AHEAD";

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryName: product.categoryName,
        supplierName: product.supplierName,
        currentStock: product.currentStock,
        minStockLevel: product.minStockLevel,
        maxStockLevel: product.maxStockLevel,
        leadTimeDays: leadTime,
        dailyConsumption: Math.round(dailyRate * 100) / 100,
        reorderPoint,
        suggestedQuantity,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        urgency,
        daysUntilStockout: daysUntilStockout != null ? Math.round(daysUntilStockout) : null,
      };
    })
    .filter((s) => s.urgency !== "ADEQUATE")
    .sort((a, b) => {
      const order = { ORDER_NOW: 0, ORDER_SOON: 1, PLAN_AHEAD: 2, ADEQUATE: 3 };
      return order[a.urgency] - order[b.urgency];
    });

  return NextResponse.json({ data: suggestions });
}
