import { z } from "zod";

const productBaseSchema = z.object({
  name: z.string().min(1, "Product name is required").max(100),
  sku: z.string().min(1, "SKU is required").max(50),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  initialStock: z.number().int().min(0, "Must be 0 or greater"),
  minStockLevel: z.number().int().min(0, "Must be 0 or greater"),
  maxStockLevel: z.number().int().min(1, "Must be greater than 0"),
  unitCostPrice: z.number().min(0).multipleOf(0.01),
  unitSellingPrice: z.number().min(0).multipleOf(0.01),
  supplierName: z.string().optional(),
  leadTimeDays: z.number().int().min(1).max(365).optional().default(7),
  imageUrl: z.string().max(500000).optional().nullable(),
});

export const productSchema = productBaseSchema.refine(
  (data) => data.maxStockLevel > data.minStockLevel,
  {
    message: "Maximum stock must be greater than minimum stock level",
    path: ["maxStockLevel"],
  }
);

export const updateProductSchema = productBaseSchema
  .omit({ initialStock: true })
  .refine((data) => data.maxStockLevel > data.minStockLevel, {
    message: "Maximum stock must be greater than minimum stock level",
    path: ["maxStockLevel"],
  });

export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
