import { productSchema, updateProductSchema } from "@/lib/validations/product";
import { stockUpdateSchema } from "@/lib/validations/stock-update";
import { categorySchema } from "@/lib/validations/category";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
} from "@/lib/validations/user";

describe("Zod Validation Schemas", () => {
  // ── Product Schema ──────────────────────────────────────
  describe("productSchema", () => {
    const validProduct = {
      name: "Widget",
      sku: "WID-001",
      categoryId: "cat-1",
      unit: "pcs",
      initialStock: 50,
      minStockLevel: 10,
      maxStockLevel: 200,
      unitCostPrice: 99.99,
      unitSellingPrice: 149.99,
    };

    it("accepts valid product data", () => {
      const result = productSchema.safeParse(validProduct);
      expect(result.success).toBe(true);
    });

    it("rejects when maxStockLevel <= minStockLevel", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        minStockLevel: 100,
        maxStockLevel: 50,
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing required name", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing SKU", () => {
      const result = productSchema.safeParse({ ...validProduct, sku: "" });
      expect(result.success).toBe(false);
    });

    it("rejects negative initialStock", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        initialStock: -1,
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional description and supplierName", () => {
      const result = productSchema.safeParse({
        ...validProduct,
        description: "A nice widget",
        supplierName: "ACME Corp",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateProductSchema", () => {
    const validUpdate = {
      name: "Updated Widget",
      sku: "WID-001",
      categoryId: "cat-1",
      unit: "pcs",
      minStockLevel: 5,
      maxStockLevel: 100,
      unitCostPrice: 80.0,
      unitSellingPrice: 120.0,
    };

    it("accepts valid update data without initialStock", () => {
      const result = updateProductSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it("still validates max > min stock", () => {
      const result = updateProductSchema.safeParse({
        ...validUpdate,
        minStockLevel: 100,
        maxStockLevel: 50,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Stock Update Schema ─────────────────────────────────
  describe("stockUpdateSchema", () => {
    it("accepts valid RESTOCK update", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "RESTOCK",
        quantity: 25,
      });
      expect(result.success).toBe(true);
    });

    it("accepts all valid update types", () => {
      const types = [
        "RESTOCK",
        "SALE",
        "ADJUSTMENT",
        "RETURN",
        "DAMAGE_WRITEOFF",
      ];
      types.forEach((updateType) => {
        const result = stockUpdateSchema.safeParse({
          updateType,
          quantity: 10,
        });
        expect(result.success).toBe(true);
      });
    });

    it("rejects invalid update type", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "STOLEN",
        quantity: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "RESTOCK",
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "SALE",
        quantity: -10,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer quantity", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "SALE",
        quantity: 2.5,
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional note", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "ADJUSTMENT",
        quantity: 3,
        note: "Correcting count after audit",
      });
      expect(result.success).toBe(true);
    });

    it("rejects note exceeding 500 characters", () => {
      const result = stockUpdateSchema.safeParse({
        updateType: "ADJUSTMENT",
        quantity: 3,
        note: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Category Schema ─────────────────────────────────────
  describe("categorySchema", () => {
    it("accepts valid category", () => {
      const result = categorySchema.safeParse({ name: "Electronics" });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = categorySchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 100 characters", () => {
      const result = categorySchema.safeParse({ name: "x".repeat(101) });
      expect(result.success).toBe(false);
    });

    it("accepts optional description", () => {
      const result = categorySchema.safeParse({
        name: "Electronics",
        description: "All electronic items",
      });
      expect(result.success).toBe(true);
    });

    it("rejects description exceeding 500 characters", () => {
      const result = categorySchema.safeParse({
        name: "Electronics",
        description: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── User Schemas ────────────────────────────────────────
  describe("createUserSchema", () => {
    const validUser = {
      name: "John Doe",
      email: "john@example.com",
      role: "STAFF" as const,
      password: "Password123",
      confirmPassword: "Password123",
    };

    it("accepts valid user data", () => {
      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it("rejects password mismatch", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        confirmPassword: "WrongPassword",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join("."));
        expect(paths).toContain("confirmPassword");
      }
    });

    it("rejects password shorter than 8 characters", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        password: "short",
        confirmPassword: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid role", () => {
      const result = createUserSchema.safeParse({
        ...validUser,
        role: "ADMIN",
      });
      expect(result.success).toBe(false);
    });

    it("accepts both OWNER and STAFF roles", () => {
      expect(
        createUserSchema.safeParse({ ...validUser, role: "OWNER" }).success
      ).toBe(true);
      expect(
        createUserSchema.safeParse({ ...validUser, role: "STAFF" }).success
      ).toBe(true);
    });
  });

  describe("updateUserSchema", () => {
    it("accepts valid update data", () => {
      const result = updateUserSchema.safeParse({
        name: "Jane",
        role: "OWNER",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = updateUserSchema.safeParse({ name: "", role: "STAFF" });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts matching passwords", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPass123",
        confirmPassword: "NewPass123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects mis-matched passwords", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPass123",
        confirmPassword: "Different1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short password", () => {
      const result = resetPasswordSchema.safeParse({
        password: "short",
        confirmPassword: "short",
      });
      expect(result.success).toBe(false);
    });
  });
});
