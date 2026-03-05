import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, stockUpdates } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Category summary: product count, total stock, total value, avg stock
  const categorySummary = await db
    .select({
      categoryId: products.categoryId,
      categoryName: categories.name,
      productCount: sql<number>`count(*)::int`,
      totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)::int`,
      totalValue: sql<number>`coalesce(sum(${products.currentStock} * ${products.unitCostPrice}), 0)::numeric(12,2)`,
      avgStock: sql<number>`coalesce(avg(${products.currentStock}), 0)::int`,
      lowStockCount: sql<number>`count(case when ${products.currentStock} <= ${products.minStockLevel} then 1 end)::int`,
      outOfStockCount: sql<number>`count(case when ${products.currentStock} = 0 then 1 end)::int`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .groupBy(products.categoryId, categories.name);

  // Monthly demand by category (last 6 months)
  const monthlyByCategory = await db
    .select({
      categoryId: products.categoryId,
      categoryName: categories.name,
      month: sql<string>`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
      totalIn: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'RESTOCK' then ${stockUpdates.quantity} else 0 end), 0)::int`,
    })
    .from(stockUpdates)
    .innerJoin(products, eq(stockUpdates.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(sql`${stockUpdates.createdAt} >= now() - interval '6 months'`)
    .groupBy(products.categoryId, categories.name, sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`);

  // Organize monthly data by category
  const monthlyMap: Record<string, { month: string; demand: number; supply: number }[]> = {};
  for (const row of monthlyByCategory) {
    const key = row.categoryName ?? "Uncategorized";
    if (!monthlyMap[key]) monthlyMap[key] = [];
    monthlyMap[key].push({ month: row.month, demand: row.totalOut, supply: row.totalIn });
  }

  // Build chart-friendly data: months as rows, categories as columns
  const allMonths = [...new Set(monthlyByCategory.map((r) => r.month))].sort();
  const categoryNames = [...new Set(categorySummary.map((c) => c.categoryName ?? "Uncategorized"))];

  const chartData = allMonths.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const cat of categoryNames) {
      const entry = monthlyMap[cat]?.find((e) => e.month === month);
      row[cat] = entry?.demand ?? 0;
    }
    return row;
  });

  return NextResponse.json({
    categories: categorySummary.map((c) => ({
      ...c,
      categoryName: c.categoryName ?? "Uncategorized",
      totalValue: Number(c.totalValue),
    })),
    monthlyData: monthlyMap,
    chartData,
    categoryNames,
  });
}
