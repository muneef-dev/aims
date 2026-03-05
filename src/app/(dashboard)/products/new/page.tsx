import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Add Product</h2>
      <ProductForm mode="create" />
    </div>
  );
}
