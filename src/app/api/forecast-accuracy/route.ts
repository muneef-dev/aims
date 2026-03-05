import { NextResponse } from "next/server";
import { db } from "@/db";
import { forecastAccuracy, products, stockUpdates } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateForecastFromData } from "@/lib/forecasting/engine";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all accuracy records with product info
  const records = await db
    .select({
      id: forecastAccuracy.id,
      productId: forecastAccuracy.productId,
      productName: products.name,
      productSku: products.sku,
      forecastMonth: forecastAccuracy.forecastMonth,
      predictedDemand: forecastAccuracy.predictedDemand,
      actualDemand: forecastAccuracy.actualDemand,
      accuracy: forecastAccuracy.accuracy,
      absoluteError: forecastAccuracy.absoluteError,
      createdAt: forecastAccuracy.createdAt,
    })
    .from(forecastAccuracy)
    .innerJoin(products, eq(forecastAccuracy.productId, products.id))
    .orderBy(desc(forecastAccuracy.createdAt))
    .limit(200);

  // Compute summary stats
  const totalRecords = records.length;
  const avgAccuracy = totalRecords > 0
    ? Math.round(records.reduce((s, r) => s + r.accuracy, 0) / totalRecords * 100) / 100
    : 0;
  const avgError = totalRecords > 0
    ? Math.round(records.reduce((s, r) => s + r.absoluteError, 0) / totalRecords * 100) / 100
    : 0;
  const highAccuracy = records.filter((r) => r.accuracy >= 80).length;

  return NextResponse.json({
    data: records,
    summary: { totalRecords, avgAccuracy, avgError, highAccuracy },
  });
}

// POST — run forecast accuracy evaluation for completed months
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all active products
  const allProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.isActive, true));

  // For each product, get monthly OUT data and compare forecast vs actual for last completed month
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const targetMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

  let evaluated = 0;

  for (const product of allProducts) {
    // Get monthly stock OUT for this product (for forecasting)
    const monthlyData = await db
      .select({
        month: sql<string>`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`,
        totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
      })
      .from(stockUpdates)
      .where(eq(stockUpdates.productId, product.id))
      .groupBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`);

    if (monthlyData.length < 4) continue; // Need enough history

    // Find last completed month's actual
    const actualRow = monthlyData.find((m) => m.month === targetMonth);
    if (!actualRow) continue;

    // Build forecast from months BEFORE the target month
    const historyBeforeTarget = monthlyData.filter((m) => m.month < targetMonth);
    if (historyBeforeTarget.length < 3) continue;

    const dataPoints = historyBeforeTarget.map((m) => {
      const [y, mo] = m.month.split("-").map(Number);
      return { year: y, month: mo, totalQuantity: m.totalOut };
    });

    let forecast;
    try {
      forecast = generateForecastFromData(dataPoints);
    } catch {
      continue;
    }

    const predicted = forecast.predictedDemand;
    const actual = actualRow.totalOut;
    const error = Math.abs(predicted - actual);
    const accuracy = actual > 0 ? Math.max(0, 100 - (error / actual) * 100) : predicted === 0 ? 100 : 0;

    // Upsert into forecast_accuracy
    await db
      .insert(forecastAccuracy)
      .values({
        productId: product.id,
        forecastMonth: targetMonth,
        predictedDemand: predicted,
        actualDemand: actual,
        accuracy: Math.round(accuracy * 100) / 100,
        absoluteError: error,
      })
      .onConflictDoUpdate({
        target: [forecastAccuracy.productId, forecastAccuracy.forecastMonth],
        set: {
          predictedDemand: predicted,
          actualDemand: actual,
          accuracy: Math.round(accuracy * 100) / 100,
          absoluteError: error,
        },
      });

    evaluated++;
  }

  return NextResponse.json({
    message: `Evaluated ${evaluated} products for ${targetMonth}`,
    count: evaluated,
    month: targetMonth,
  });
}
