import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sku = req.nextUrl.searchParams.get("sku") ?? "";
  const excludeId = req.nextUrl.searchParams.get("excludeId") ?? "";

  if (!sku) {
    return NextResponse.json({ exists: false });
  }

  const conditions = [eq(products.sku, sku), eq(products.isActive, true)];
  if (excludeId) {
    conditions.push(ne(products.id, excludeId));
  }

  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(...conditions))
    .limit(1);

  return NextResponse.json({ exists: !!existing });
}
