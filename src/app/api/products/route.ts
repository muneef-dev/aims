import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, and, or, ilike, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { productSchema } from "@/lib/validations/product";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("category") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  const conditions = [eq(products.isActive, true)];

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`)
      )!
    );
  }

  if (categoryId) {
    conditions.push(eq(products.categoryId, categoryId));
  }

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  const data = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      categoryId: products.categoryId,
      categoryName: categories.name,
      description: products.description,
      unit: products.unit,
      currentStock: products.currentStock,
      minStockLevel: products.minStockLevel,
      maxStockLevel: products.maxStockLevel,
      unitCostPrice: products.unitCostPrice,
      unitSellingPrice: products.unitSellingPrice,
      supplierName: products.supplierName,
      leadTimeDays: products.leadTimeDays,
      imageUrl: products.imageUrl,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    data,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { initialStock, ...rest } = parsed.data;

  const [product] = await db
    .insert(products)
    .values({
      ...rest,
      currentStock: initialStock,
    })
    .returning();

  return NextResponse.json(product, { status: 201 });
}
