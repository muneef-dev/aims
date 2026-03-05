import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, stockUpdates } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  // Verify product exists
  const [product] = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Get monthly OUT totals grouped by year-month
  const monthlyData = await db
    .select({
      year: sql<number>`extract(year from ${stockUpdates.createdAt})::int`,
      month: sql<number>`extract(month from ${stockUpdates.createdAt})::int`,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
      totalIn: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'RESTOCK' then ${stockUpdates.quantity} else 0 end), 0)::int`,
    })
    .from(stockUpdates)
    .where(eq(stockUpdates.productId, productId))
    .groupBy(
      sql`extract(year from ${stockUpdates.createdAt})`,
      sql`extract(month from ${stockUpdates.createdAt})`
    )
    .orderBy(
      sql`extract(year from ${stockUpdates.createdAt})`,
      sql`extract(month from ${stockUpdates.createdAt})`
    );

  // Build seasonal index (average demand per month across years)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthBuckets: Record<number, number[]> = {};
  for (let m = 1; m <= 12; m++) monthBuckets[m] = [];

  for (const row of monthlyData) {
    monthBuckets[row.month].push(row.totalOut);
  }

  const overallAvg =
    monthlyData.length > 0
      ? monthlyData.reduce((s, r) => s + r.totalOut, 0) / monthlyData.length
      : 0;

  const seasonalIndex = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const vals = monthBuckets[m];
    const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    const index = overallAvg > 0 ? avg / overallAvg : 0;
    return {
      month: m,
      monthName: monthNames[i],
      averageDemand: Math.round(avg),
      seasonalIndex: Math.round(index * 100) / 100,
      dataPoints: vals.length,
    };
  });

  // Peak / trough months
  const sorted = [...seasonalIndex].sort((a, b) => b.seasonalIndex - a.seasonalIndex);
  const peakMonths = sorted.filter((s) => s.seasonalIndex >= 1.2).map((s) => s.monthName);
  const troughMonths = sorted.filter((s) => s.seasonalIndex <= 0.8 && s.seasonalIndex > 0).map((s) => s.monthName);

  // Year-over-year data for chart
  const yearlyTrends: Record<number, { month: number; monthName: string; demand: number }[]> = {};
  for (const row of monthlyData) {
    if (!yearlyTrends[row.year]) yearlyTrends[row.year] = [];
    yearlyTrends[row.year].push({
      month: row.month,
      monthName: monthNames[row.month - 1],
      demand: row.totalOut,
    });
  }

  return NextResponse.json({
    product: { id: product.id, name: product.name },
    seasonalIndex,
    peakMonths,
    troughMonths,
    overallAverage: Math.round(overallAvg),
    yearlyTrends,
  });
}
