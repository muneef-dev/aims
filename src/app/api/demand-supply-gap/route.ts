import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, stockUpdates, categories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const months = parseInt(req.nextUrl.searchParams.get("months") ?? "6", 10);
  const productId = req.nextUrl.searchParams.get("productId");

  // Monthly supply (IN) vs demand (OUT) for all or specific product
  const conditions = [sql`${stockUpdates.createdAt} >= now() - make_interval(months => ${months})`];
  if (productId) {
    conditions.push(sql`${stockUpdates.productId} = ${productId}`);
  }

  const monthlyGap = await db
    .select({
      month: sql<string>`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`,
      totalIn: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'RESTOCK' then ${stockUpdates.quantity} else 0 end), 0)::int`,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
    })
    .from(stockUpdates)
    .where(sql`${sql.join(conditions, sql` and `)}`)
    .groupBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`);

  const chartData = monthlyGap.map((row) => ({
    month: row.month,
    supply: row.totalIn,
    demand: row.totalOut,
    gap: row.totalIn - row.totalOut,
  }));

  // Per-product gap summary (top deficit products)
  const productGap = await db
    .select({
      productId: stockUpdates.productId,
      productName: products.name,
      productSku: products.sku,
      categoryName: categories.name,
      totalIn: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'RESTOCK' then ${stockUpdates.quantity} else 0 end), 0)::int`,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
    })
    .from(stockUpdates)
    .innerJoin(products, eq(stockUpdates.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(sql`${stockUpdates.createdAt} >= now() - make_interval(months => ${months})`)
    .groupBy(stockUpdates.productId, products.name, products.sku, categories.name)
    .orderBy(sql`sum(case when ${stockUpdates.updateType} = 'RESTOCK' then ${stockUpdates.quantity} else 0 end) - sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end) asc`)
    .limit(20);

  const productData = productGap.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    productSku: row.productSku,
    categoryName: row.categoryName,
    supply: row.totalIn,
    demand: row.totalOut,
    gap: row.totalIn - row.totalOut,
  }));

  const totalSupply = chartData.reduce((s, r) => s + r.supply, 0);
  const totalDemand = chartData.reduce((s, r) => s + r.demand, 0);

  return NextResponse.json({
    chartData,
    productData,
    summary: {
      totalSupply,
      totalDemand,
      netGap: totalSupply - totalDemand,
      deficitProducts: productData.filter((p) => p.gap < 0).length,
    },
  });
}
