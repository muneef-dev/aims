import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  real,
  timestamp,
  uniqueIndex,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ───────────────────────────────────────────

export const roleEnum = pgEnum("role", ["OWNER", "STAFF"]);

export const alertTypeEnum = pgEnum("alert_type", [
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "OVERSTOCK",
]);

export const stockUpdateTypeEnum = pgEnum("stock_update_type", [
  "RESTOCK",
  "SALE",
  "ADJUSTMENT",
  "RETURN",
  "DAMAGE_WRITEOFF",
]);

export const anomalySeverityEnum = pgEnum("anomaly_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

// ─── Tables ──────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  description: text("description"),
  unit: text("unit").notNull(),
  currentStock: integer("current_stock").default(0).notNull(),
  minStockLevel: integer("min_stock_level").notNull(),
  maxStockLevel: integer("max_stock_level").notNull(),
  unitCostPrice: real("unit_cost_price").notNull(),
  unitSellingPrice: real("unit_selling_price").notNull(),
  supplierName: text("supplier_name"),
  leadTimeDays: integer("lead_time_days").default(7).notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockUpdates = pgTable(
  "stock_updates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    updateType: stockUpdateTypeEnum("update_type").notNull(),
    quantity: integer("quantity").notNull(),
    previousStock: integer("previous_stock").notNull(),
    newStock: integer("new_stock").notNull(),
    note: text("note"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("stock_updates_product_created_idx").on(
      table.productId,
      table.createdAt
    ),
  ]
);

export const alerts = pgTable(
  "alerts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    type: alertTypeEnum("type").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("alerts_product_resolved_idx").on(
      table.productId,
      table.isResolved
    ),
    index("alerts_resolved_created_idx").on(
      table.isResolved,
      table.createdAt
    ),
  ]
);

export const monthlySales = pgTable(
  "monthly_sales",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    totalQuantity: integer("total_quantity").notNull(),
    totalRevenue: real("total_revenue").notNull(),
  },
  (table) => [
    uniqueIndex("monthly_sales_product_year_month_idx").on(
      table.productId,
      table.year,
      table.month
    ),
  ]
);

export const forecasts = pgTable("forecasts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .unique()
    .references(() => products.id),
  predictedDemand: integer("predicted_demand").notNull(),
  forecastMonth: text("forecast_month").notNull(),
  confidence: real("confidence").notNull(),
  confidenceLabel: text("confidence_label").notNull(),
  modelUsed: text("model_used").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  lastWeeklyReportAt: timestamp("last_weekly_report_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const anomalies = pgTable("anomalies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  type: text("type").notNull(),
  severity: anomalySeverityEnum("severity").notNull(),
  description: text("description").notNull(),
  expectedValue: real("expected_value"),
  actualValue: real("actual_value"),
  deviation: real("deviation"),
  isAcknowledged: boolean("is_acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by").references(() => users.id),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forecastAccuracy = pgTable(
  "forecast_accuracy",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    forecastMonth: text("forecast_month").notNull(),
    predictedDemand: real("predicted_demand").notNull(),
    actualDemand: real("actual_demand").notNull(),
    accuracy: real("accuracy").notNull(),
    absoluteError: real("absolute_error").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.productId, table.forecastMonth)]
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  emailLowStock: boolean("email_low_stock").default(true).notNull(),
  emailOutOfStock: boolean("email_out_of_stock").default(true).notNull(),
  emailOverstock: boolean("email_overstock").default(false).notNull(),
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false).notNull(),
  quietHoursStart: integer("quiet_hours_start").default(22),
  quietHoursEnd: integer("quiet_hours_end").default(7),
  digestMode: boolean("digest_mode").default(false).notNull(),
  maxEmailsPerHour: integer("max_emails_per_hour").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  stockUpdates: many(stockUpdates),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  stockUpdates: many(stockUpdates),
  alerts: many(alerts),
  monthlySales: many(monthlySales),
  forecast: one(forecasts, {
    fields: [products.id],
    references: [forecasts.productId],
  }),
}));

export const stockUpdatesRelations = relations(stockUpdates, ({ one }) => ({
  product: one(products, {
    fields: [stockUpdates.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [stockUpdates.userId],
    references: [users.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  product: one(products, {
    fields: [alerts.productId],
    references: [products.id],
  }),
}));

export const monthlySalesRelations = relations(monthlySales, ({ one }) => ({
  product: one(products, {
    fields: [monthlySales.productId],
    references: [products.id],
  }),
}));

export const forecastsRelations = relations(forecasts, ({ one }) => ({
  product: one(products, {
    fields: [forecasts.productId],
    references: [products.id],
  }),
}));

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
  product: one(products, {
    fields: [anomalies.productId],
    references: [products.id],
  }),
}));
