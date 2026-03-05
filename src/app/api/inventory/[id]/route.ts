import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, stockUpdates, alerts, monthlySales, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { stockUpdateSchema } from "@/lib/validations/stock-update";
import { sendEmail } from "@/lib/email/mailer";
import { alertEmailHtml } from "@/lib/email/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: productId } = await params;
  const body = await req.json();
  const parsed = stockUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { updateType, quantity, note } = parsed.data;

  // Execute within a transaction
  const result = await db.transaction(async (tx) => {
    // Get current product with row lock
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.isActive, true)))
      .for("update");

    if (!product) {
      return { error: "Product not found", status: 404 };
    }

    // Calculate new stock
    const previousStock = product.currentStock;
    let newStock: number;

    switch (updateType) {
      case "RESTOCK":
      case "RETURN":
        newStock = previousStock + quantity;
        break;
      case "SALE":
      case "DAMAGE_WRITEOFF":
      case "ADJUSTMENT":
        newStock = previousStock - quantity;
        break;
      default:
        return { error: "Invalid update type", status: 400 };
    }

    if (newStock < 0) {
      return { error: "Insufficient stock for this operation", status: 400 };
    }

    // Update product stock
    await tx
      .update(products)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(products.id, productId));

    // Create stock update record
    await tx.insert(stockUpdates).values({
      productId,
      updateType,
      quantity,
      previousStock,
      newStock,
      note: note ?? null,
      userId: session.user.id,
    });

    // Update monthly sales aggregation for SALE type
    if (updateType === "SALE") {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const revenue = quantity * product.unitSellingPrice;

      await tx
        .insert(monthlySales)
        .values({
          productId,
          year,
          month,
          totalQuantity: quantity,
          totalRevenue: revenue,
        })
        .onConflictDoUpdate({
          target: [monthlySales.productId, monthlySales.year, monthlySales.month],
          set: {
            totalQuantity: sql`${monthlySales.totalQuantity} + ${quantity}`,
            totalRevenue: sql`${monthlySales.totalRevenue} + ${revenue}`,
          },
        });
    }

    // Resolve all existing unresolved alerts for this product
    await tx
      .update(alerts)
      .set({ isResolved: true, resolvedAt: new Date() })
      .where(and(eq(alerts.productId, productId), eq(alerts.isResolved, false)));

    // Check alert conditions and create new alert if needed
    let alertType: "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK" | null = null;
    let message = "";

    if (newStock === 0) {
      alertType = "OUT_OF_STOCK";
      message = `${product.name} is out of stock.`;
    } else if (newStock > 0 && newStock <= product.minStockLevel) {
      alertType = "LOW_STOCK";
      message = `${product.name} stock is low (${newStock} remaining, minimum is ${product.minStockLevel}).`;
    } else if (newStock >= product.maxStockLevel) {
      alertType = "OVERSTOCK";
      message = `${product.name} is overstocked (${newStock} units, maximum is ${product.maxStockLevel}).`;
    }

    let alertCreated = false;
    if (alertType) {
      await tx.insert(alerts).values({
        productId,
        type: alertType,
        message,
      });
      alertCreated = true;
    }

    return {
      data: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        previousStock,
        currentStock: newStock,
        minStockLevel: product.minStockLevel,
        maxStockLevel: product.maxStockLevel,
        alertCreated,
      },
      status: 200,
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Fire-and-forget alert email for OUT_OF_STOCK or LOW_STOCK
  if (result.data.alertCreated && result.data.currentStock <= result.data.minStockLevel) {
    (async () => {
      try {
        const [owner] = await db
          .select({ email: users.email })
          .from(users)
          .where(and(eq(users.role, "OWNER"), eq(users.isActive, true)))
          .limit(1);
        if (owner) {
          const alertType = result.data.currentStock === 0 ? "OUT_OF_STOCK" as const : "LOW_STOCK" as const;
          const subject = alertType === "OUT_OF_STOCK"
            ? `🚨 Out of Stock: ${result.data.name}`
            : `⚠️ Low Stock Alert: ${result.data.name}`;
          const html = alertEmailHtml({
            name: result.data.name,
            sku: result.data.sku,
            currentStock: result.data.currentStock,
            minStockLevel: result.data.minStockLevel,
            alertType,
          });
          await sendEmail(owner.email, subject, html);
        }
      } catch {
        // Email failure should not block the stock update
      }
    })();
  }

  return NextResponse.json(result.data);
}
