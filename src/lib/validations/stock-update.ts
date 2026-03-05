import { z } from "zod";

export const stockUpdateSchema = z.object({
  updateType: z.enum([
    "RESTOCK",
    "SALE",
    "ADJUSTMENT",
    "RETURN",
    "DAMAGE_WRITEOFF",
  ]),
  quantity: z.number().int().positive("Quantity must be greater than zero"),
  note: z.string().max(500).optional(),
});

export type StockUpdateInput = z.infer<typeof stockUpdateSchema>;
