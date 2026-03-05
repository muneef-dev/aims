import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, users, systemSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email/mailer";
import { weeklyReportEmailHtml } from "@/lib/email/templates";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const [owner] = await db
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)))
    .limit(1);

  if (!owner) {
    return NextResponse.json({ error: "No active owner found" }, { status: 404 });
  }

  const html = weeklyReportEmailHtml({
    totalProducts: allProducts.length,
    lowStockCount: lowStock.length,
    outOfStockCount: outOfStock.length,
    lowStockNames: lowStock.map((p) => p.name),
    outOfStockNames: outOfStock.map((p) => p.name),
  });

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
    await db.insert(systemSettings).values({ lastWeeklyReportAt: new Date() });
  }

  return NextResponse.json({ success: true });
}
