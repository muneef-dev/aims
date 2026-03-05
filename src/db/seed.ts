import "dotenv/config";
import { db } from "./index";
import {
  users,
  categories,
  products,
  stockUpdates,
  monthlySales,
  alerts,
  systemSettings,
} from "./schema";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // ─── Clean existing data (reverse FK order) ─────────
  await db.execute(sql`TRUNCATE TABLE forecast_accuracy, anomalies, monthly_sales, stock_updates, alerts, notification_preferences, products, categories, system_settings, users CASCADE`);
  console.log("🗑️  Cleared existing data");

  // ─── Users ──────────────────────────────────────────
  const ownerHash = await bcrypt.hash("Owner@123", 12);
  const staffHash = await bcrypt.hash("Staff@123", 12);

  const ownerId = createId();
  const staffId = createId();

  await db.insert(users).values([
    { id: ownerId, name: "Admin Owner", email: "owner@aims.com", passwordHash: ownerHash, role: "OWNER" },
    { id: staffId, name: "Staff User", email: "staff@aims.com", passwordHash: staffHash, role: "STAFF" },
  ]);
  console.log("✅ Users created");

  // ─── Categories ─────────────────────────────────────
  const catElec = createId();
  const catStat = createId();
  const catFood = createId();

  await db.insert(categories).values([
    { id: catElec, name: "Electronics", description: "Electronic devices and accessories" },
    { id: catStat, name: "Stationery", description: "Office and school stationery supplies" },
    { id: catFood, name: "Food & Beverages", description: "Consumable food and drink items" },
  ]);
  console.log("✅ Categories created");

  // ─── Products ───────────────────────────────────────
  const productData = [
    { id: createId(), name: "USB Charging Cable", sku: "ELC-001", categoryId: catElec, unit: "pcs", currentStock: 0, minStockLevel: 10, maxStockLevel: 200, unitCostPrice: 150, unitSellingPrice: 350, supplierName: "TechSupply Lanka" },
    { id: createId(), name: "Wireless Mouse", sku: "ELC-002", categoryId: catElec, unit: "pcs", currentStock: 8, minStockLevel: 15, maxStockLevel: 150, unitCostPrice: 450, unitSellingPrice: 950, supplierName: "TechSupply Lanka" },
    { id: createId(), name: "Bluetooth Speaker", sku: "ELC-003", categoryId: catElec, unit: "pcs", currentStock: 45, minStockLevel: 10, maxStockLevel: 100, unitCostPrice: 1200, unitSellingPrice: 2500, supplierName: "AudioWorld" },
    { id: createId(), name: "A4 Printing Paper (Ream)", sku: "STN-001", categoryId: catStat, unit: "reams", currentStock: 5, minStockLevel: 20, maxStockLevel: 500, unitCostPrice: 350, unitSellingPrice: 550, supplierName: "PaperHouse" },
    { id: createId(), name: "Blue Ballpoint Pen (Box)", sku: "STN-002", categoryId: catStat, unit: "boxes", currentStock: 80, minStockLevel: 15, maxStockLevel: 300, unitCostPrice: 120, unitSellingPrice: 250, supplierName: "PenMart" },
    { id: createId(), name: "Spiral Notebook A5", sku: "STN-003", categoryId: catStat, unit: "pcs", currentStock: 120, minStockLevel: 25, maxStockLevel: 400, unitCostPrice: 75, unitSellingPrice: 150, supplierName: "PaperHouse" },
    { id: createId(), name: "Stapler", sku: "STN-004", categoryId: catStat, unit: "pcs", currentStock: 30, minStockLevel: 10, maxStockLevel: 100, unitCostPrice: 200, unitSellingPrice: 450, supplierName: "PenMart" },
    { id: createId(), name: "Instant Coffee 200g", sku: "FNB-001", categoryId: catFood, unit: "pcs", currentStock: 12, minStockLevel: 10, maxStockLevel: 150, unitCostPrice: 380, unitSellingPrice: 650, supplierName: "FreshFoods" },
    { id: createId(), name: "Mineral Water 500ml (Pack)", sku: "FNB-002", categoryId: catFood, unit: "packs", currentStock: 200, minStockLevel: 50, maxStockLevel: 500, unitCostPrice: 180, unitSellingPrice: 320, supplierName: "AquaPure" },
    { id: createId(), name: "Biscuit Variety Pack", sku: "FNB-003", categoryId: catFood, unit: "packs", currentStock: 65, minStockLevel: 20, maxStockLevel: 200, unitCostPrice: 250, unitSellingPrice: 450, supplierName: "FreshFoods" },
  ];

  await db.insert(products).values(productData);
  console.log("✅ Products created");

  // ─── Alerts for products below stock levels ─────────
  // Product 1: Out of stock (USB Charging Cable)
  await db.insert(alerts).values({
    productId: productData[0].id,
    type: "OUT_OF_STOCK",
    message: `${productData[0].name} is out of stock.`,
  });
  // Product 2: Low stock (Wireless Mouse)
  await db.insert(alerts).values({
    productId: productData[1].id,
    type: "LOW_STOCK",
    message: `${productData[1].name} stock is low (8 remaining, minimum is 15).`,
  });
  // Product 4: Low stock (A4 Printing Paper)
  await db.insert(alerts).values({
    productId: productData[3].id,
    type: "LOW_STOCK",
    message: `${productData[3].name} stock is low (5 remaining, minimum is 20).`,
  });
  console.log("✅ Alerts created");

  // ─── Historical Data: 24 months (Mar 2024 — Feb 2026) for all products ──
  // Monthly sales quantities per product (index 0..9 matches productData)
  const monthlySalesData: number[][] = [
    // 0: USB Charging Cable (ELC-001) — growing demand
    [10, 12, 14, 13, 16, 18, 15, 20, 22, 19, 24, 26, 22, 25, 28, 26, 30, 32, 28, 34, 36, 33, 38, 40],
    // 1: Wireless Mouse (ELC-002) — upward trend
    [8, 10, 12, 10, 14, 15, 12, 16, 18, 15, 20, 22, 18, 22, 25, 20, 26, 28, 24, 30, 32, 28, 35, 38],
    // 2: Bluetooth Speaker (ELC-003) — holiday seasonal peaks (Nov-Dec)
    [8, 6, 5, 4, 3, 5, 8, 15, 20, 25, 30, 10, 9, 7, 5, 4, 4, 6, 10, 18, 25, 30, 35, 12],
    // 3: A4 Printing Paper (STN-001) — school-year seasonal (Jan-Mar, Sep-Nov peaks)
    [40, 35, 30, 15, 10, 8, 15, 35, 45, 50, 40, 25, 45, 40, 35, 18, 12, 10, 18, 40, 50, 55, 45, 30],
    // 4: Blue Ballpoint Pen (STN-002) — school-year seasonal
    [35, 30, 25, 15, 10, 12, 20, 38, 45, 42, 35, 20, 40, 35, 30, 20, 15, 15, 25, 42, 50, 48, 40, 25],
    // 5: Spiral Notebook A5 (STN-003) — school-year seasonal
    [30, 25, 20, 10, 8, 10, 18, 35, 40, 38, 30, 15, 35, 30, 25, 12, 10, 12, 20, 38, 45, 42, 35, 18],
    // 6: Stapler (STN-004) — steady low demand
    [5, 4, 6, 5, 3, 4, 5, 8, 7, 6, 5, 4, 6, 5, 7, 5, 4, 5, 6, 9, 8, 7, 6, 5],
    // 7: Instant Coffee 200g (FNB-001) — steady with slight growth
    [15, 16, 14, 17, 15, 18, 16, 19, 17, 20, 18, 21, 19, 22, 20, 23, 21, 24, 22, 25, 23, 26, 24, 27],
    // 8: Mineral Water 500ml (FNB-002) — summer seasonal peaks
    [50, 55, 65, 80, 95, 100, 90, 75, 60, 50, 45, 40, 55, 60, 70, 85, 100, 105, 95, 80, 65, 55, 48, 45],
    // 9: Biscuit Variety Pack (FNB-003) — steady with noise
    [20, 22, 18, 25, 19, 23, 21, 24, 20, 26, 22, 28, 23, 25, 19, 27, 21, 24, 22, 26, 20, 28, 24, 30],
  ];

  // 24-month timeline: March 2024 to February 2026
  const startYear = 2024;
  const startMonth = 3; // March

  for (let pi = 0; pi < productData.length; pi++) {
    const product = productData[pi];
    const quantities = monthlySalesData[pi];

    for (let mi = 0; mi < quantities.length; mi++) {
      const saleQty = quantities[mi];
      const year = startYear + Math.floor((startMonth - 1 + mi) / 12);
      const month = ((startMonth - 1 + mi) % 12) + 1;
      const revenue = saleQty * product.unitSellingPrice;

      // Monthly sales record
      await db.insert(monthlySales).values({
        productId: product.id,
        year,
        month,
        totalQuantity: saleQty,
        totalRevenue: revenue,
      });

      // SALE stock update (mid-month)
      await db.insert(stockUpdates).values({
        productId: product.id,
        updateType: "SALE",
        quantity: saleQty,
        previousStock: product.currentStock + saleQty,
        newStock: product.currentStock,
        note: `Historical sale — ${year}-${String(month).padStart(2, "0")}`,
        userId: ownerId,
        createdAt: new Date(year, month - 1, 15),
      });

      // RESTOCK stock update (start of month — supply slightly exceeds demand)
      const restockQty = saleQty + Math.floor(saleQty * 0.15) + 3;
      await db.insert(stockUpdates).values({
        productId: product.id,
        updateType: "RESTOCK",
        quantity: restockQty,
        previousStock: product.currentStock,
        newStock: product.currentStock + restockQty,
        note: `Restock — ${year}-${String(month).padStart(2, "0")}`,
        userId: ownerId,
        createdAt: new Date(year, month - 1, 3),
      });
    }
  }
  console.log("✅ Historical data created (24 months × 10 products)");

  // ─── System Settings ────────────────────────────────
  await db.insert(systemSettings).values({});
  console.log("✅ System settings initialized");

  console.log("\n🎉 Seed complete!");
  console.log("   Owner: owner@aims.com / Owner@123");
  console.log("   Staff: staff@aims.com / Staff@123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
