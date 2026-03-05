import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, users, systemSettings } from "@/db/schema";
import { eq, and, lte, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email/mailer";
import { weeklyReportEmailHtml } from "@/lib/email/templates";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allProducts = await db
    .select({
      name: products.name,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
    })
    .from(products)
    .where(eq(products.isActive, true));

  const outOfStock = allProducts.filter((p) => p.currentStock === 0);
  const lowStock = allProducts.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel
  );

  const html = weeklyReportEmailHtml({
    totalProducts: allProducts.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockNames: lowStock.map((p) => p.name),
    outOfStockNames: outOfStock.map((p) => p.name),
  });

  const [owner] = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)))
    .limit(1);

  if (!owner) {
    return NextResponse.json({ error: "No active owner found" }, { status: 404 });
  }

  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  await sendEmail(owner.email, `📊 AIMS Weekly Inventory Report — ${date}`, html);

  // Update system settings
  const existing = await db.select().from(systemSettings).limit(1);
  if (existing.length > 0) {
    await db
      .update(systemSettings)
      .set({ lastWeeklyReportAt: new Date(), updatedAt: new Date() })
      .where(eq(systemSettings.id, existing[0].id));
  } else {
    await db.insert(systemSettings).values({
      lastWeeklyReportAt: new Date(),
    });
  }

  return NextResponse.json({ success: true });
}
