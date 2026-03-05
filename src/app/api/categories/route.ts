import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { categorySchema } from "@/lib/validations/category";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      productCount: sql<number>`count(${products.id}) filter (where ${products.isActive} = true)::int`,
    })
    .from(categories)
    .leftJoin(products, eq(categories.id, products.categoryId))
    .groupBy(categories.id, categories.name, categories.description)
    .orderBy(categories.name);

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [category] = await db
    .insert(categories)
    .values(parsed.data)
    .returning();

  return NextResponse.json(category, { status: 201 });
}
