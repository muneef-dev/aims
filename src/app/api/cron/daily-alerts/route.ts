import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, alerts, users, notificationPreferences } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email/mailer";
import { alertEmailHtml } from "@/lib/email/templates";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      maxStockLevel: products.maxStockLevel,
    })
    .from(products)
    .where(eq(products.isActive, true));

  const [owner] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)))
    .limit(1);

  // Load notification preferences for sender
  let prefs: typeof notificationPreferences.$inferSelect | null = null;

  if (owner) {
    const [ownerPrefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, owner.id));
    prefs = ownerPrefs ?? null;
  }

  // Check if currently in quiet hours
  function isQuietHours(): boolean {
    if (!prefs?.quietHoursEnabled || prefs.quietHoursStart == null || prefs.quietHoursEnd == null) return false;
    const currentHour = new Date().getHours();
    const start = prefs.quietHoursStart;
    const end = prefs.quietHoursEnd;
    if (start <= end) return currentHour >= start && currentHour < end;
    return currentHour >= start || currentHour < end;
  }

  const quiet = isQuietHours();

  let alertsCreated = 0;

  for (const product of allProducts) {
    let alertType: "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK" | null = null;
    let message = "";

    if (product.currentStock === 0) {
      alertType = "OUT_OF_STOCK";
      message = `${product.name} is out of stock.`;
    } else if (product.currentStock <= product.minStockLevel) {
      alertType = "LOW_STOCK";
      message = `${product.name} stock is low (${product.currentStock} remaining, minimum is ${product.minStockLevel}).`;
    } else if (product.currentStock >= product.maxStockLevel) {
      alertType = "OVERSTOCK";
      message = `${product.name} is overstocked (${product.currentStock} units, maximum is ${product.maxStockLevel}).`;
    }

    if (alertType) {
      await db
        .update(alerts)
        .set({ isResolved: true, resolvedAt: new Date() })
        .where(and(eq(alerts.productId, product.id), eq(alerts.isResolved, false)));

      await db.insert(alerts).values({
        productId: product.id,
        type: alertType,
        message,
      });
      alertsCreated++;

      // Check if email should be sent based on preferences
      const shouldEmail =
        owner &&
        !quiet &&
        ((alertType === "OUT_OF_STOCK" && (prefs?.emailOutOfStock ?? true)) ||
         (alertType === "LOW_STOCK" && (prefs?.emailLowStock ?? true)) ||
         (alertType === "OVERSTOCK" && (prefs?.emailOverstock ?? true)));

      if (shouldEmail) {
        try {
          const subject = alertType === "OUT_OF_STOCK"
            ? `🚨 Out of Stock: ${product.name}`
            : alertType === "LOW_STOCK"
            ? `⚠️ Low Stock Alert: ${product.name}`
            : `📦 Overstock Alert: ${product.name}`;
          const html = alertEmailHtml({
            name: product.name,
            sku: product.sku,
            currentStock: product.currentStock,
            minStockLevel: product.minStockLevel,
            alertType,
          });
          await sendEmail(owner.email, subject, html);
        } catch {
          // Continue even if email fails
        }
      }
    }
  }

  return NextResponse.json({ alertsCreated });
}
