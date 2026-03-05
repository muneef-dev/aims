import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, stockUpdates } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { linearRegression, linearRegressionLine } from "simple-statistics";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");
  const periods = Math.min(12, Math.max(1, parseInt(req.nextUrl.searchParams.get("periods") ?? "6", 10)));

  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const [product] = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Get monthly OUT data
  const monthlyData = await db
    .select({
      month: sql<string>`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
    })
    .from(stockUpdates)
    .where(eq(stockUpdates.productId, productId))
    .groupBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`);

  const quantities = monthlyData.map((m) => m.totalOut);
  const months = monthlyData.map((m) => m.month);

  // Generate forecasts for N future periods
  const forecasts: { month: string; predicted: number; lower: number; upper: number }[] = [];

  if (quantities.length >= 3) {
    const pairs: [number, number][] = quantities.map((v, i) => [i, v]);
    const regression = linearRegression(pairs);
    const line = linearRegressionLine(regression);

    // Calculate standard error for confidence interval
    const residuals = quantities.map((v, i) => v - line(i));
    const se = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(residuals.length - 2, 1));

    const now = new Date();
    for (let p = 0; p < periods; p++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + p + 1, 1);
      const label = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;
      const idx = quantities.length + p;
      const predicted = Math.max(0, Math.round(line(idx)));
      const margin = Math.round(se * 1.96); // 95% CI

      forecasts.push({
        month: label,
        predicted,
        lower: Math.max(0, predicted - margin),
        upper: predicted + margin,
      });
    }
  }

  // Combine historical + forecast for chart
  const chartData = [
    ...months.map((m, i) => ({
      month: m,
      actual: quantities[i],
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    })),
    ...forecasts.map((f) => ({
      month: f.month,
      actual: null as number | null,
      predicted: f.predicted,
      lower: f.lower,
      upper: f.upper,
    })),
  ];

  return NextResponse.json({
    product: { id: product.id, name: product.name },
    historical: monthlyData,
    forecasts,
    chartData,
    periods,
  });
}
