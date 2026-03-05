import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { monthlySales, forecasts } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateForecastFromData } from "@/lib/forecasting/engine";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  // Check for cached forecast first
  const [cached] = await db
    .select()
    .from(forecasts)
    .where(eq(forecasts.productId, productId))
    .limit(1);

  if (cached) {
    // Return cached forecast with historical data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const salesData = await db
      .select()
      .from(monthlySales)
      .where(
        and(
          eq(monthlySales.productId, productId),
          gte(monthlySales.year, twelveMonthsAgo.getFullYear())
        )
      );

    const sorted = salesData
      .filter((d) => {
        const dataDate = new Date(d.year, d.month - 1);
        return dataDate >= twelveMonthsAgo;
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    return NextResponse.json({
      predictedDemand: cached.predictedDemand,
      forecastMonth: cached.forecastMonth,
      confidence: cached.confidence,
      confidenceLabel: cached.confidenceLabel,
      modelUsed: cached.modelUsed,
      historicalData: sorted.map((d) => ({
        month: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
        quantity: d.totalQuantity,
      })),
      generatedAt: cached.generatedAt,
    });
  }

  // Generate fresh forecast
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const salesData = await db
    .select()
    .from(monthlySales)
    .where(
      and(
        eq(monthlySales.productId, productId),
        gte(monthlySales.year, twelveMonthsAgo.getFullYear())
      )
    );

  const filtered = salesData.filter((d) => {
    const dataDate = new Date(d.year, d.month - 1);
    return dataDate >= twelveMonthsAgo;
  });

  if (filtered.length === 0) {
    return NextResponse.json({ error: "NO_DATA" }, { status: 404 });
  }

  try {
    const result = generateForecastFromData(filtered);

    // Cache the forecast
    await db
      .insert(forecasts)
      .values({
        productId,
        predictedDemand: result.predictedDemand,
        forecastMonth: result.forecastMonth,
        confidence: result.confidence,
        confidenceLabel: result.confidenceLabel,
        modelUsed: result.modelUsed,
        generatedAt: result.generatedAt,
      })
      .onConflictDoUpdate({
        target: forecasts.productId,
        set: {
          predictedDemand: result.predictedDemand,
          forecastMonth: result.forecastMonth,
          confidence: result.confidence,
          confidenceLabel: result.confidenceLabel,
          modelUsed: result.modelUsed,
          generatedAt: result.generatedAt,
        },
      });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "NO_DATA" }, { status: 404 });
  }
}
