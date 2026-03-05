import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { InventoryReportDocument } from "@/lib/reports/pdf-document";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await db
    .select({
      name: products.name,
      sku: products.sku,
      categoryName: categories.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      maxStockLevel: products.maxStockLevel,
      unitSellingPrice: products.unitSellingPrice,
      supplierName: products.supplierName,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.isActive, true))
    .orderBy(products.name);

  const buffer = await renderToBuffer(
    createElement(InventoryReportDocument, { products: data }) as any
  );

  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="inventory_report_${date}.pdf"`,
    },
  });
}
