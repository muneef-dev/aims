import { db } from "@/db";
import { products, categories, alerts, stockUpdates, users } from "@/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export async function getInventoryContext(): Promise<string> {
  // 1. All products with category names
  const allProducts = await db
    .select({
      name: products.name,
      sku: products.sku,
      category: categories.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      maxStockLevel: products.maxStockLevel,
      unitCostPrice: products.unitCostPrice,
      unitSellingPrice: products.unitSellingPrice,
      supplierName: products.supplierName,
      unit: products.unit,
      isActive: products.isActive,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(products.name);

  // 2. Summary stats
  const [stats] = await db
    .select({
      totalProducts: sql<number>`count(*)::int`,
      totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)::int`,
      totalValue: sql<number>`coalesce(sum(${products.currentStock} * ${products.unitCostPrice}), 0)`,
      outOfStock: sql<number>`count(*) filter (where ${products.currentStock} = 0)::int`,
      lowStock: sql<number>`count(*) filter (where ${products.currentStock} > 0 and ${products.currentStock} <= ${products.minStockLevel})::int`,
      overStock: sql<number>`count(*) filter (where ${products.currentStock} > ${products.maxStockLevel})::int`,
    })
    .from(products)
    .where(eq(products.isActive, true));

  // 3. Unresolved alerts
  const unresolvedAlerts = await db
    .select({
      productName: products.name,
      type: alerts.type,
      message: alerts.message,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .leftJoin(products, eq(alerts.productId, products.id))
    .where(eq(alerts.isResolved, false))
    .orderBy(desc(alerts.createdAt))
    .limit(20);

  // 4. Recent stock updates (last 10)
  const recentUpdates = await db
    .select({
      productName: products.name,
      updateType: stockUpdates.updateType,
      quantity: stockUpdates.quantity,
      previousStock: stockUpdates.previousStock,
      newStock: stockUpdates.newStock,
      note: stockUpdates.note,
      userName: users.name,
      createdAt: stockUpdates.createdAt,
    })
    .from(stockUpdates)
    .leftJoin(products, eq(stockUpdates.productId, products.id))
    .leftJoin(users, eq(stockUpdates.userId, users.id))
    .orderBy(desc(stockUpdates.createdAt))
    .limit(10);

  // 5. Category summaries
  const categorySummary = await db
    .select({
      category: categories.name,
      productCount: sql<number>`count(${products.id})::int`,
      totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)::int`,
    })
    .from(categories)
    .leftJoin(
      products,
      and(eq(categories.id, products.categoryId), eq(products.isActive, true))
    )
    .groupBy(categories.name)
    .orderBy(categories.name);

  // Build context string
  const lines: string[] = [];

  lines.push("=== INVENTORY SUMMARY ===");
  lines.push(`Total active products: ${stats.totalProducts}`);
  lines.push(`Total stock units: ${stats.totalStock}`);
  lines.push(
    `Total inventory value (cost): LKR ${Number(stats.totalValue).toFixed(2)}`
  );
  lines.push(`Out of stock: ${stats.outOfStock} products`);
  lines.push(`Low stock: ${stats.lowStock} products`);
  lines.push(`Overstock: ${stats.overStock} products`);

  lines.push("\n=== CATEGORIES ===");
  for (const cat of categorySummary) {
    lines.push(
      `- ${cat.category}: ${cat.productCount} products, ${cat.totalStock} total units`
    );
  }

  lines.push("\n=== ALL PRODUCTS ===");
  for (const p of allProducts) {
    const status =
      p.currentStock === 0
        ? "OUT OF STOCK"
        : p.currentStock <= p.minStockLevel
          ? "LOW STOCK"
          : p.currentStock > p.maxStockLevel
            ? "OVERSTOCK"
            : "Normal";

    lines.push(
      `- ${p.name} (SKU: ${p.sku}) | Category: ${p.category} | Stock: ${p.currentStock} ${p.unit} | Min: ${p.minStockLevel} | Max: ${p.maxStockLevel} | Cost: LKR ${p.unitCostPrice} | Sell: LKR ${p.unitSellingPrice} | Supplier: ${p.supplierName ?? "N/A"} | Status: ${status}`
    );
  }

  if (unresolvedAlerts.length > 0) {
    lines.push("\n=== ACTIVE ALERTS ===");
    for (const a of unresolvedAlerts) {
      lines.push(
        `- [${a.type}] ${a.productName}: ${a.message} (${a.createdAt.toLocaleDateString()})`
      );
    }
  }

  if (recentUpdates.length > 0) {
    lines.push("\n=== RECENT STOCK UPDATES (last 10) ===");
    for (const u of recentUpdates) {
      lines.push(
        `- ${u.productName}: ${u.updateType} ${u.quantity} units (${u.previousStock} → ${u.newStock}) by ${u.userName} on ${u.createdAt.toLocaleDateString()}${u.note ? ` — "${u.note}"` : ""}`
      );
    }
  }

  return lines.join("\n");
}
