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
  const catClen = createId();
  const catCare = createId();
  const catOffc = createId();

  await db.insert(categories).values([
    { id: catElec, name: "Electronics", description: "Electronic devices and accessories" },
    { id: catStat, name: "Stationery", description: "Office and school stationery supplies" },
    { id: catFood, name: "Food & Beverages", description: "Consumable food and drink items" },
    { id: catClen, name: "Cleaning Supplies", description: "Cleaning and maintenance products" },
    { id: catCare, name: "Personal Care", description: "Health and personal care items" },
    { id: catOffc, name: "Office Equipment", description: "Office furniture and equipment" },
  ]);
  console.log("✅ Categories created");

  // ─── Products ───────────────────────────────────────
  const productData = [
    // Electronics (5)
    { id: createId(), name: "USB Charging Cable", sku: "ELC-001", categoryId: catElec, unit: "pcs", currentStock: 0, minStockLevel: 10, maxStockLevel: 200, unitCostPrice: 150, unitSellingPrice: 350, supplierName: "TechSupply Lanka" },
    { id: createId(), name: "Wireless Mouse", sku: "ELC-002", categoryId: catElec, unit: "pcs", currentStock: 8, minStockLevel: 15, maxStockLevel: 150, unitCostPrice: 450, unitSellingPrice: 950, supplierName: "TechSupply Lanka" },
    { id: createId(), name: "Bluetooth Speaker", sku: "ELC-003", categoryId: catElec, unit: "pcs", currentStock: 45, minStockLevel: 10, maxStockLevel: 100, unitCostPrice: 1200, unitSellingPrice: 2500, supplierName: "AudioWorld" },
    { id: createId(), name: "USB-C Hub Adapter", sku: "ELC-004", categoryId: catElec, unit: "pcs", currentStock: 25, minStockLevel: 10, maxStockLevel: 80, unitCostPrice: 1500, unitSellingPrice: 3500, supplierName: "TechSupply Lanka" },
    { id: createId(), name: "Wireless Keyboard", sku: "ELC-005", categoryId: catElec, unit: "pcs", currentStock: 15, minStockLevel: 8, maxStockLevel: 60, unitCostPrice: 1200, unitSellingPrice: 2800, supplierName: "TechSupply Lanka" },
    // Stationery (5)
    { id: createId(), name: "A4 Printing Paper (Ream)", sku: "STN-001", categoryId: catStat, unit: "reams", currentStock: 5, minStockLevel: 20, maxStockLevel: 500, unitCostPrice: 350, unitSellingPrice: 550, supplierName: "PaperHouse" },
    { id: createId(), name: "Blue Ballpoint Pen (Box)", sku: "STN-002", categoryId: catStat, unit: "boxes", currentStock: 80, minStockLevel: 15, maxStockLevel: 300, unitCostPrice: 120, unitSellingPrice: 250, supplierName: "PenMart" },
    { id: createId(), name: "Spiral Notebook A5", sku: "STN-003", categoryId: catStat, unit: "pcs", currentStock: 120, minStockLevel: 25, maxStockLevel: 400, unitCostPrice: 75, unitSellingPrice: 150, supplierName: "PaperHouse" },
    { id: createId(), name: "Stapler", sku: "STN-004", categoryId: catStat, unit: "pcs", currentStock: 30, minStockLevel: 10, maxStockLevel: 100, unitCostPrice: 200, unitSellingPrice: 450, supplierName: "PenMart" },
    { id: createId(), name: "Whiteboard Marker Set", sku: "STN-005", categoryId: catStat, unit: "sets", currentStock: 85, minStockLevel: 20, maxStockLevel: 200, unitCostPrice: 180, unitSellingPrice: 450, supplierName: "PenMart" },
    // Food & Beverages (5)
    { id: createId(), name: "Instant Coffee 200g", sku: "FNB-001", categoryId: catFood, unit: "pcs", currentStock: 12, minStockLevel: 10, maxStockLevel: 150, unitCostPrice: 380, unitSellingPrice: 650, supplierName: "FreshFoods" },
    { id: createId(), name: "Mineral Water 500ml (Pack)", sku: "FNB-002", categoryId: catFood, unit: "packs", currentStock: 200, minStockLevel: 50, maxStockLevel: 500, unitCostPrice: 180, unitSellingPrice: 320, supplierName: "AquaPure" },
    { id: createId(), name: "Biscuit Variety Pack", sku: "FNB-003", categoryId: catFood, unit: "packs", currentStock: 65, minStockLevel: 20, maxStockLevel: 200, unitCostPrice: 250, unitSellingPrice: 450, supplierName: "FreshFoods" },
    { id: createId(), name: "Green Tea Box", sku: "FNB-004", categoryId: catFood, unit: "boxes", currentStock: 50, minStockLevel: 15, maxStockLevel: 120, unitCostPrice: 200, unitSellingPrice: 380, supplierName: "FreshFoods" },
    { id: createId(), name: "Chocolate Bar Pack", sku: "FNB-005", categoryId: catFood, unit: "packs", currentStock: 72, minStockLevel: 10, maxStockLevel: 100, unitCostPrice: 320, unitSellingPrice: 600, supplierName: "FreshFoods" },
    // Cleaning Supplies (5)
    { id: createId(), name: "All-Purpose Cleaner", sku: "CLN-001", categoryId: catClen, unit: "bottles", currentStock: 60, minStockLevel: 15, maxStockLevel: 120, unitCostPrice: 220, unitSellingPrice: 450, supplierName: "CleanPro" },
    { id: createId(), name: "Hand Sanitizer 500ml", sku: "CLN-002", categoryId: catClen, unit: "bottles", currentStock: 95, minStockLevel: 20, maxStockLevel: 150, unitCostPrice: 180, unitSellingPrice: 350, supplierName: "CleanPro" },
    { id: createId(), name: "Floor Mop", sku: "CLN-003", categoryId: catClen, unit: "pcs", currentStock: 18, minStockLevel: 5, maxStockLevel: 40, unitCostPrice: 650, unitSellingPrice: 1200, supplierName: "CleanPro" },
    { id: createId(), name: "Garbage Bags (Roll)", sku: "CLN-004", categoryId: catClen, unit: "rolls", currentStock: 110, minStockLevel: 25, maxStockLevel: 200, unitCostPrice: 140, unitSellingPrice: 280, supplierName: "CleanPro" },
    { id: createId(), name: "Glass Cleaner Spray", sku: "CLN-005", categoryId: catClen, unit: "bottles", currentStock: 35, minStockLevel: 10, maxStockLevel: 80, unitCostPrice: 280, unitSellingPrice: 520, supplierName: "CleanPro" },
    // Personal Care (5)
    { id: createId(), name: "Face Mask (Box of 50)", sku: "PCR-001", categoryId: catCare, unit: "boxes", currentStock: 42, minStockLevel: 10, maxStockLevel: 100, unitCostPrice: 400, unitSellingPrice: 750, supplierName: "MediCare LK" },
    { id: createId(), name: "Hand Cream 200ml", sku: "PCR-002", categoryId: catCare, unit: "tubes", currentStock: 28, minStockLevel: 12, maxStockLevel: 80, unitCostPrice: 350, unitSellingPrice: 680, supplierName: "MediCare LK" },
    { id: createId(), name: "Tissue Box (Pack of 5)", sku: "PCR-003", categoryId: catCare, unit: "packs", currentStock: 180, minStockLevel: 30, maxStockLevel: 250, unitCostPrice: 160, unitSellingPrice: 320, supplierName: "MediCare LK" },
    { id: createId(), name: "Wet Wipes (Pack of 80)", sku: "PCR-004", categoryId: catCare, unit: "packs", currentStock: 135, minStockLevel: 20, maxStockLevel: 200, unitCostPrice: 150, unitSellingPrice: 290, supplierName: "MediCare LK" },
    { id: createId(), name: "Lip Balm", sku: "PCR-005", categoryId: catCare, unit: "pcs", currentStock: 55, minStockLevel: 15, maxStockLevel: 100, unitCostPrice: 90, unitSellingPrice: 180, supplierName: "MediCare LK" },
    // Office Equipment (5)
    { id: createId(), name: "Desk Lamp LED", sku: "OFC-001", categoryId: catOffc, unit: "pcs", currentStock: 12, minStockLevel: 5, maxStockLevel: 30, unitCostPrice: 1100, unitSellingPrice: 2200, supplierName: "OfficeHub" },
    { id: createId(), name: "Paper Shredder", sku: "OFC-002", categoryId: catOffc, unit: "pcs", currentStock: 4, minStockLevel: 2, maxStockLevel: 15, unitCostPrice: 4500, unitSellingPrice: 8500, supplierName: "OfficeHub" },
    { id: createId(), name: "Cable Organizer Box", sku: "OFC-003", categoryId: catOffc, unit: "pcs", currentStock: 30, minStockLevel: 10, maxStockLevel: 60, unitCostPrice: 320, unitSellingPrice: 650, supplierName: "OfficeHub" },
    { id: createId(), name: "Monitor Stand Riser", sku: "OFC-004", categoryId: catOffc, unit: "pcs", currentStock: 8, minStockLevel: 5, maxStockLevel: 25, unitCostPrice: 900, unitSellingPrice: 1800, supplierName: "OfficeHub" },
    { id: createId(), name: "Filing Cabinet 3-Drawer", sku: "OFC-005", categoryId: catOffc, unit: "pcs", currentStock: 3, minStockLevel: 2, maxStockLevel: 10, unitCostPrice: 6500, unitSellingPrice: 12500, supplierName: "OfficeHub" },
  ];

  await db.insert(products).values(productData);
  console.log("✅ Products created");

  // ─── Alerts for products below stock levels ─────────
  // Product 0: Out of stock (USB Charging Cable)
  await db.insert(alerts).values({
    productId: productData[0].id,
    type: "OUT_OF_STOCK",
    message: `${productData[0].name} is out of stock.`,
  });
  // Product 1: Low stock (Wireless Mouse)
  await db.insert(alerts).values({
    productId: productData[1].id,
    type: "LOW_STOCK",
    message: `${productData[1].name} stock is low (8 remaining, minimum is 15).`,
  });
  // Product 5: Low stock (A4 Printing Paper)
  await db.insert(alerts).values({
    productId: productData[5].id,
    type: "LOW_STOCK",
    message: `${productData[5].name} stock is low (5 remaining, minimum is 20).`,
  });
  // Product 28: Low stock (Monitor Stand Riser)
  await db.insert(alerts).values({
    productId: productData[28].id,
    type: "LOW_STOCK",
    message: `${productData[28].name} stock is low (8 remaining, minimum is 5).`,
  });
  // Product 29: Low stock (Filing Cabinet 3-Drawer)
  await db.insert(alerts).values({
    productId: productData[29].id,
    type: "LOW_STOCK",
    message: `${productData[29].name} stock is low (3 remaining, minimum is 2).`,
  });
  console.log("✅ Alerts created");

  // ─── Historical Data: 24 months (Mar 2024 — Feb 2026) for all products ──
  // Monthly sales quantities per product (index 0..29 matches productData)
  const monthlySalesData: number[][] = [
    // 0: USB Charging Cable (ELC-001) — growing demand
    [10, 12, 14, 13, 16, 18, 15, 20, 22, 19, 24, 26, 22, 25, 28, 26, 30, 32, 28, 34, 36, 33, 38, 40],
    // 1: Wireless Mouse (ELC-002) — upward trend
    [8, 10, 12, 10, 14, 15, 12, 16, 18, 15, 20, 22, 18, 22, 25, 20, 26, 28, 24, 30, 32, 28, 35, 38],
    // 2: Bluetooth Speaker (ELC-003) — holiday seasonal peaks (Nov-Dec)
    [8, 6, 5, 4, 3, 5, 8, 15, 20, 25, 30, 10, 9, 7, 5, 4, 4, 6, 10, 18, 25, 30, 35, 12],
    // 3: USB-C Hub Adapter (ELC-004) — steady moderate demand
    [5, 6, 7, 5, 8, 6, 7, 9, 8, 7, 10, 8, 6, 7, 9, 6, 8, 7, 9, 10, 8, 9, 11, 9],
    // 4: Wireless Keyboard (ELC-005) — slow growth
    [3, 4, 3, 5, 4, 5, 4, 6, 5, 6, 7, 5, 4, 5, 6, 5, 6, 7, 5, 7, 8, 6, 8, 9],
    // 5: A4 Printing Paper (STN-001) — school-year seasonal (Jan-Mar, Sep-Nov peaks)
    [40, 35, 30, 15, 10, 8, 15, 35, 45, 50, 40, 25, 45, 40, 35, 18, 12, 10, 18, 40, 50, 55, 45, 30],
    // 6: Blue Ballpoint Pen (STN-002) — school-year seasonal
    [35, 30, 25, 15, 10, 12, 20, 38, 45, 42, 35, 20, 40, 35, 30, 20, 15, 15, 25, 42, 50, 48, 40, 25],
    // 7: Spiral Notebook A5 (STN-003) — school-year seasonal
    [30, 25, 20, 10, 8, 10, 18, 35, 40, 38, 30, 15, 35, 30, 25, 12, 10, 12, 20, 38, 45, 42, 35, 18],
    // 8: Stapler (STN-004) — steady low demand
    [5, 4, 6, 5, 3, 4, 5, 8, 7, 6, 5, 4, 6, 5, 7, 5, 4, 5, 6, 9, 8, 7, 6, 5],
    // 9: Whiteboard Marker Set (STN-005) — school-year seasonal, moderate
    [15, 12, 10, 6, 5, 6, 10, 18, 22, 20, 16, 8, 18, 15, 12, 7, 6, 7, 12, 20, 25, 22, 18, 10],
    // 10: Instant Coffee 200g (FNB-001) — steady with slight growth
    [15, 16, 14, 17, 15, 18, 16, 19, 17, 20, 18, 21, 19, 22, 20, 23, 21, 24, 22, 25, 23, 26, 24, 27],
    // 11: Mineral Water 500ml (FNB-002) — summer seasonal peaks
    [50, 55, 65, 80, 95, 100, 90, 75, 60, 50, 45, 40, 55, 60, 70, 85, 100, 105, 95, 80, 65, 55, 48, 45],
    // 12: Biscuit Variety Pack (FNB-003) — steady with noise
    [20, 22, 18, 25, 19, 23, 21, 24, 20, 26, 22, 28, 23, 25, 19, 27, 21, 24, 22, 26, 20, 28, 24, 30],
    // 13: Green Tea Box (FNB-004) — gentle upward trend
    [8, 9, 10, 8, 11, 10, 12, 11, 13, 12, 14, 13, 11, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17],
    // 14: Chocolate Bar Pack (FNB-005) — holiday seasonal
    [12, 10, 8, 7, 6, 8, 10, 14, 18, 22, 28, 15, 13, 11, 9, 8, 7, 9, 12, 16, 20, 25, 32, 18],
    // 15: All-Purpose Cleaner (CLN-001) — steady moderate
    [10, 12, 11, 13, 10, 14, 12, 11, 13, 12, 14, 11, 12, 13, 11, 14, 12, 15, 13, 12, 14, 13, 15, 12],
    // 16: Hand Sanitizer 500ml (CLN-002) — declining from pandemic peak
    [35, 32, 28, 25, 22, 20, 18, 17, 16, 15, 14, 13, 14, 13, 12, 12, 11, 11, 10, 10, 10, 9, 9, 9],
    // 17: Floor Mop (CLN-003) — slow steady
    [3, 2, 4, 3, 2, 3, 4, 3, 2, 3, 4, 3, 3, 2, 4, 3, 2, 3, 4, 3, 3, 4, 3, 2],
    // 18: Garbage Bags Roll (CLN-004) — steady high demand
    [25, 28, 26, 30, 27, 29, 28, 31, 27, 30, 28, 32, 26, 29, 27, 31, 28, 30, 29, 32, 28, 31, 29, 33],
    // 19: Glass Cleaner Spray (CLN-005) — steady low
    [6, 7, 5, 8, 6, 7, 5, 8, 7, 6, 8, 5, 7, 8, 6, 7, 5, 8, 6, 7, 8, 6, 7, 5],
    // 20: Face Mask Box (PCR-001) — declining from pandemic peak
    [30, 28, 25, 22, 20, 18, 16, 15, 14, 12, 11, 10, 12, 10, 9, 8, 8, 7, 7, 7, 6, 6, 6, 5],
    // 21: Hand Cream 200ml (PCR-002) — seasonal (winter peak)
    [8, 6, 5, 4, 3, 3, 4, 5, 7, 9, 12, 10, 9, 7, 5, 4, 3, 4, 5, 6, 8, 10, 13, 11],
    // 22: Tissue Box Pack (PCR-003) — steady high demand
    [30, 32, 28, 35, 30, 33, 31, 34, 29, 35, 32, 36, 31, 33, 29, 36, 31, 34, 32, 36, 30, 35, 33, 37],
    // 23: Wet Wipes Pack (PCR-004) — steady moderate
    [18, 20, 17, 22, 19, 21, 18, 23, 20, 22, 19, 24, 19, 21, 18, 23, 20, 22, 19, 24, 20, 23, 20, 25],
    // 24: Lip Balm (PCR-005) — seasonal (winter peak)
    [6, 5, 4, 3, 2, 2, 3, 4, 6, 8, 10, 8, 7, 5, 4, 3, 2, 3, 4, 5, 7, 9, 11, 9],
    // 25: Desk Lamp LED (OFC-001) — slow steady
    [2, 3, 2, 3, 2, 2, 3, 3, 4, 3, 2, 3, 3, 2, 3, 2, 3, 2, 3, 3, 4, 3, 3, 2],
    // 26: Paper Shredder (OFC-002) — very low demand
    [1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1],
    // 27: Cable Organizer Box (OFC-003) — moderate with growth
    [5, 6, 5, 7, 6, 7, 5, 8, 7, 6, 8, 7, 6, 7, 8, 7, 8, 7, 9, 8, 7, 9, 8, 10],
    // 28: Monitor Stand Riser (OFC-004) — very low demand
    [1, 2, 1, 2, 1, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 2, 2, 1, 2, 2, 1],
    // 29: Filing Cabinet 3-Drawer (OFC-005) — very low demand
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
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
  console.log("✅ Historical data created (24 months × 30 products)");

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
