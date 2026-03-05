"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  productSchema,
  updateProductSchema,
  type ProductInput,
  type UpdateProductInput,
} from "@/lib/validations/product";
import { categorySchema } from "@/lib/validations/category";
import { ImageUpload } from "@/components/products/image-upload";

interface Category {
  id: string;
  name: string;
}

interface ProductFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<ProductInput>;
  productId?: string;
}

export function ProductForm({ mode, defaultValues, productId }: ProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const schema = isEdit ? updateProductSchema : productSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      name: "",
      sku: "",
      categoryId: "",
      description: "",
      unit: "",
      initialStock: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      unitCostPrice: 0,
      unitSellingPrice: 0,
      supplierName: "",
      leadTimeDays: 7,
      imageUrl: null,
      ...defaultValues,
    },
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSaving, setNewCatSaving] = useState(false);
  const [skuError, setSkuError] = useState("");

  const costPrice = watch("unitCostPrice");
  const sellingPrice = watch("unitSellingPrice");
  const categoryId = watch("categoryId");
  const imageUrl = watch("imageUrl");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  async function checkSku(sku: string) {
    if (!sku) return;
    const params = new URLSearchParams({ sku });
    if (productId) params.set("excludeId", productId);
    const res = await fetch(`/api/products/check-sku?${params}`);
    if (res.ok) {
      const { exists } = await res.json();
      setSkuError(exists ? "This SKU is already in use." : "");
    }
  }

  async function handleAddCategory() {
    const parsed = categorySchema.safeParse({ name: newCatName });
    if (!parsed.success) return;

    setNewCatSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev) => [...prev, cat]);
        setValue("categoryId", cat.id);
        setNewCatOpen(false);
        setNewCatName("");
      } else {
        toast.error("Failed to create category.");
      }
    } finally {
      setNewCatSaving(false);
    }
  }

  async function onSubmit(data: ProductInput | UpdateProductInput) {
    if (skuError) return;

    const url = isEdit ? `/api/products/${productId}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success(isEdit ? "Product updated successfully." : "Product created successfully.");
      router.push("/products");
    } else {
      const err = await res.json();
      toast.error(err.error ?? "Something went wrong.");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 max-w-2xl">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input id="name" {...register("name")} />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* SKU */}
        <div className="space-y-2">
          <Label htmlFor="sku">SKU *</Label>
          <Input
            id="sku"
            {...register("sku")}
            onBlur={(e) => checkSku(e.target.value)}
          />
          {errors.sku && (
            <p className="text-sm text-destructive">{errors.sku.message}</p>
          )}
          {skuError && (
            <p className="text-sm text-destructive">{skuError}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={categoryId}
            onValueChange={(v) => {
              if (v === "__new__") {
                setNewCatOpen(true);
              } else {
                setValue("categoryId", v);
                clearErrors("categoryId");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Add New Category</SelectItem>
            </SelectContent>
          </Select>
          {errors.categoryId && (
            <p className="text-sm text-destructive">{errors.categoryId.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} rows={3} />
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Input id="unit" placeholder="e.g. pcs, kg, box" {...register("unit")} />
          {errors.unit && (
            <p className="text-sm text-destructive">{errors.unit.message}</p>
          )}
        </div>

        {/* Stock fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="initialStock">Initial Stock *</Label>
              <Input
                id="initialStock"
                type="number"
                {...register("initialStock", { valueAsNumber: true })}
              />
              {errors.initialStock && (
                <p className="text-sm text-destructive">{errors.initialStock.message}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="minStockLevel">Min Stock Level *</Label>
            <Input
              id="minStockLevel"
              type="number"
              {...register("minStockLevel", { valueAsNumber: true })}
            />
            {errors.minStockLevel && (
              <p className="text-sm text-destructive">{errors.minStockLevel.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxStockLevel">Max Stock Level *</Label>
            <Input
              id="maxStockLevel"
              type="number"
              {...register("maxStockLevel", { valueAsNumber: true })}
            />
            {errors.maxStockLevel && (
              <p className="text-sm text-destructive">{errors.maxStockLevel.message}</p>
            )}
          </div>
        </div>

        {/* Price fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unitCostPrice">Unit Cost Price (LKR) *</Label>
            <Input
              id="unitCostPrice"
              type="number"
              step="0.01"
              {...register("unitCostPrice", { valueAsNumber: true })}
            />
            {errors.unitCostPrice && (
              <p className="text-sm text-destructive">{errors.unitCostPrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="unitSellingPrice">Unit Selling Price (LKR) *</Label>
            <Input
              id="unitSellingPrice"
              type="number"
              step="0.01"
              {...register("unitSellingPrice", { valueAsNumber: true })}
            />
            {errors.unitSellingPrice && (
              <p className="text-sm text-destructive">{errors.unitSellingPrice.message}</p>
            )}
            {sellingPrice > 0 && costPrice > 0 && sellingPrice < costPrice && (
              <p className="text-sm text-amber-600">
                Selling price is lower than cost price.
              </p>
            )}
          </div>
        </div>

        {/* Supplier */}
        <div className="space-y-2">
          <Label htmlFor="supplierName">Supplier Name</Label>
          <Input id="supplierName" {...register("supplierName")} />
        </div>

        {/* Lead Time Days */}
        <div className="space-y-2">
          <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
          <Input
            id="leadTimeDays"
            type="number"
            min={1}
            max={365}
            {...register("leadTimeDays", { valueAsNumber: true })}
          />
          {errors.leadTimeDays && (
            <p className="text-sm text-destructive">{errors.leadTimeDays.message}</p>
          )}
          <p className="text-xs text-muted-foreground">Average days for supplier to deliver this product</p>
        </div>

        {/* Product Image */}
        <div className="space-y-2">
          <Label>Product Image</Label>
          <ImageUpload
            value={imageUrl}
            onChange={(v) => setValue("imageUrl", v)}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save Changes"
                : "Create Product"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/products")}
          >
            Cancel
          </Button>
        </div>
      </form>

      {/* Add Category Dialog */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newCatName">Category Name</Label>
            <Input
              id="newCatName"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newCatName.trim() || newCatSaving}
              onClick={handleAddCategory}
            >
              {newCatSaving ? "Saving…" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
