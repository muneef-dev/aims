import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { anomalies, products, stockUpdates } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { detectAnomalies } from "@/lib/forecasting/anomaly-detection";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get("severity");
  const acknowledged = searchParams.get("acknowledged");

  const conditions = [];
  if (severity) {
    conditions.push(eq(anomalies.severity, severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"));
  }
  if (acknowledged === "true") {
    conditions.push(eq(anomalies.isAcknowledged, true));
  } else if (acknowledged === "false") {
    conditions.push(eq(anomalies.isAcknowledged, false));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: anomalies.id,
      productId: anomalies.productId,
      productName: products.name,
      productSku: products.sku,
      type: anomalies.type,
      severity: anomalies.severity,
      description: anomalies.description,
      expectedValue: anomalies.expectedValue,
      actualValue: anomalies.actualValue,
      deviation: anomalies.deviation,
      isAcknowledged: anomalies.isAcknowledged,
      acknowledgedAt: anomalies.acknowledgedAt,
      detectedAt: anomalies.detectedAt,
    })
    .from(anomalies)
    .innerJoin(products, eq(anomalies.productId, products.id))
    .where(where)
    .orderBy(desc(anomalies.detectedAt))
    .limit(200);

  return NextResponse.json({ data });
}

// POST — run anomaly detection scan across all active products
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all active products
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      maxStockLevel: products.maxStockLevel,
    })
    .from(products)
    .where(eq(products.isActive, true));

  // Get monthly stock movements for each product (last 12 months)
  const monthlyMovements = await db
    .select({
      productId: stockUpdates.productId,
      month: sql<string>`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`,
      totalOut: sql<number>`coalesce(sum(case when ${stockUpdates.updateType} = 'SALE' then ${stockUpdates.quantity} else 0 end), 0)::int`,
    })
    .from(stockUpdates)
    .where(
      sql`${stockUpdates.createdAt} >= now() - interval '12 months'`
    )
    .groupBy(stockUpdates.productId, sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${stockUpdates.createdAt}, 'YYYY-MM')`);

  // Group movements by product
  const movementsByProduct = new Map<string, { month: string; quantity: number }[]>();
  for (const row of monthlyMovements) {
    const list = movementsByProduct.get(row.productId) ?? [];
    list.push({ month: row.month, quantity: row.totalOut });
    movementsByProduct.set(row.productId, list);
  }

  // Run detection for each product
  let newCount = 0;
  for (const product of allProducts) {
    const movements = movementsByProduct.get(product.id) ?? [];
    const results = detectAnomalies(
      product.name,
      product.currentStock,
      product.minStockLevel,
      product.maxStockLevel,
      movements
    );

    for (const result of results) {
      await db.insert(anomalies).values({
        productId: product.id,
        type: result.type,
        severity: result.severity,
        description: result.description,
        expectedValue: result.expectedValue,
        actualValue: result.actualValue,
        deviation: result.deviation,
      });
      newCount++;
    }
  }

  return NextResponse.json({ message: `Scan complete. ${newCount} anomalies detected.`, count: newCount });
}
