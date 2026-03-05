import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { Parser } from "json2csv";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await db
    .select({
      "Product Name": products.name,
      SKU: products.sku,
      Category: categories.name,
      "Current Stock": products.currentStock,
      "Min Stock Level": products.minStockLevel,
      "Max Stock Level": products.maxStockLevel,
      "Unit Cost Price": products.unitCostPrice,
      "Unit Selling Price": products.unitSellingPrice,
      Supplier: products.supplierName,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .orderBy(products.name);

  const parser = new Parser();
  const csv = parser.parse(data);

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="inventory_export_${date}.csv"`,
    },
  });
}
