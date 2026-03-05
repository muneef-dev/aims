"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  description: string | null;
  unit: string;
  initialStock: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitCostPrice: number;
  unitSellingPrice: number;
  supplierName: string | null;
  leadTimeDays: number;
  imageUrl: string | null;
  isActive: boolean;
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => setProduct(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-muted-foreground py-8">Loading…</p>;
  }

  if (!product) {
    return <p className="text-muted-foreground py-8">Product not found.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Edit Product</h2>
      <ProductForm
        mode="edit"
        productId={id}
        defaultValues={{
          name: product.name,
          sku: product.sku,
          categoryId: product.categoryId ?? undefined,
          description: product.description ?? "",
          unit: product.unit,
          minStockLevel: product.minStockLevel,
          maxStockLevel: product.maxStockLevel,
          unitCostPrice: product.unitCostPrice,
          unitSellingPrice: product.unitSellingPrice,
          supplierName: product.supplierName ?? "",
          leadTimeDays: product.leadTimeDays ?? 7,
          imageUrl: product.imageUrl ?? null,
        }}
      />
    </div>
  );
}
