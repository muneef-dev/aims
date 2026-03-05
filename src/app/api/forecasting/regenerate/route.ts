import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, monthlySales, forecasts } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateForecastFromData } from "@/lib/forecasting/engine";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activeProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.isActive, true));

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  let generated = 0;
  let skipped = 0;

  for (const product of activeProducts) {
    const salesData = await db
      .select()
      .from(monthlySales)
      .where(
        and(
          eq(monthlySales.productId, product.id),
          gte(monthlySales.year, twelveMonthsAgo.getFullYear())
        )
      );

    const filtered = salesData.filter((d) => {
      const dataDate = new Date(d.year, d.month - 1);
      return dataDate >= twelveMonthsAgo;
    });

    if (filtered.length === 0) {
      skipped++;
      continue;
    }

    try {
      const result = generateForecastFromData(filtered);

      await db
        .insert(forecasts)
        .values({
          productId: product.id,
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

      generated++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    message: "All forecasts have been regenerated successfully",
    generated,
    skipped,
    total: activeProducts.length,
  });
}
