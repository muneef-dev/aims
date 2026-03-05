"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  price: string | number;
}

interface QuickSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleComplete?: () => void;
}

export function QuickSaleDialog({ open, onOpenChange, onSaleComplete }: QuickSaleDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load products when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingProducts(true);
    fetch("/api/inventory?limit=100")
      .then((r) => r.json())
      .then((json) => setProducts(json.data ?? []))
      .catch(() => toast.error("Failed to load products"))
      .finally(() => setLoadingProducts(false));
  }, [open]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const previewStock = useMemo(() => {
    if (!selectedProduct || !quantity) return null;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return null;
    return selectedProduct.currentStock - qty;
  }, [selectedProduct, quantity]);

  function resetForm() {
    setSelectedProductId("");
    setQuantity("");
    setNote("");
  }

  async function handleSubmit() {
    if (!selectedProduct) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${selectedProduct.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: "SALE",
          quantity: qty,
          note: note || undefined,
        }),
      });

      if (res.ok) {
        toast.success(`Sold ${qty} units of ${selectedProduct.name}`);
        resetForm();
        onOpenChange(false);
        onSaleComplete?.();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to record sale.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Sale</DialogTitle>
          <DialogDescription>
            Record a sale directly from the dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product selector */}
          <div className="space-y-2">
            <Label>Product</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingProducts ? "Loading…" : "Select a product"} />
              </SelectTrigger>
              <SelectContent>
                {products
                  .filter((p) => p.currentStock > 0)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.currentStock} in stock
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current stock display */}
          {selectedProduct && (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-3xl font-bold">{selectedProduct.currentStock}</p>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="sale-qty">Quantity Sold</Label>
            <Input
              id="sale-qty"
              type="number"
              min={1}
              step={1}
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="sale-note">Note (optional)</Label>
            <Textarea
              id="sale-note"
              placeholder="e.g. Walk-in customer purchase"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          {/* Live preview */}
          {previewStock !== null && (
            <div
              className={`rounded-lg p-4 text-center ${
                previewStock < 0
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : previewStock === 0
                  ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : previewStock <= (selectedProduct?.minStockLevel ?? 0)
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              }`}
            >
              <p className="text-sm">Remaining stock after sale:</p>
              <p className="text-2xl font-bold">
                {previewStock < 0 ? (
                  <span>Insufficient stock</span>
                ) : (
                  `${previewStock} units`
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            disabled={
              submitting ||
              !selectedProductId ||
              !quantity ||
              parseInt(quantity, 10) <= 0 ||
              (previewStock !== null && previewStock < 0)
            }
            onClick={handleSubmit}
          >
            {submitting ? "Recording…" : "Record Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
