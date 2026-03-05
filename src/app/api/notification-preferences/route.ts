import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

const prefsSchema = z.object({
  emailLowStock: z.boolean().optional(),
  emailOutOfStock: z.boolean().optional(),
  emailOverstock: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.union([z.number().int().min(0).max(23), z.string().regex(/^\d{2}:\d{2}$/).transform(v => parseInt(v.split(":")[0], 10))]).optional().nullable(),
  quietHoursEnd: z.union([z.number().int().min(0).max(23), z.string().regex(/^\d{2}:\d{2}$/).transform(v => parseInt(v.split(":")[0], 10))]).optional().nullable(),
  digestMode: z.boolean().optional(),
  maxEmailsPerHour: z.number().int().min(1).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  if (!prefs) {
    return NextResponse.json({
      emailLowStock: true,
      emailOutOfStock: true,
      emailOverstock: true,
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      digestMode: false,
      maxEmailsPerHour: 10,
    });
  }

  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, session.user.id));

  if (existing) {
    const [updated] = await db
      .update(notificationPreferences)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, session.user.id))
      .returning();
    return NextResponse.json(updated);
  } else {
    const [created] = await db
      .insert(notificationPreferences)
      .values({ userId: session.user.id, ...parsed.data })
      .returning();
    return NextResponse.json(created, { status: 201 });
  }
}
