"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { getStockStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackagePlus } from "lucide-react";
import { useTableSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/ui/sortable-header";

interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string | null;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
}

interface Category {
  id: string;
  name: string;
}

type UpdateType = "RESTOCK" | "SALE" | "ADJUSTMENT" | "RETURN" | "DAMAGE_WRITEOFF";

const UPDATE_TYPE_LABELS: Record<UpdateType, string> = {
  RESTOCK: "Restock",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
  DAMAGE_WRITEOFF: "Damage / Write-off",
};

export default function InventoryPage() {
  useSession();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Stock update modal state
  const [updateTarget, setUpdateTarget] = useState<InventoryProduct | null>(null);
  const [updateType, setUpdateType] = useState<UpdateType>("RESTOCK");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const debouncedSearch = useDebounce(search);
  const { sortedData: sortedProducts, sortConfig, requestSort } = useTableSort(products as unknown as Record<string, unknown>[], "name");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/inventory?${params}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, categoryFilter]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  // Live preview calculation
  const previewStock = useMemo(() => {
    if (!updateTarget || !quantity) return null;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return null;

    switch (updateType) {
      case "RESTOCK":
      case "RETURN":
        return updateTarget.currentStock + qty;
      case "SALE":
      case "DAMAGE_WRITEOFF":
      case "ADJUSTMENT":
        return updateTarget.currentStock - qty;
      default:
        return null;
    }
  }, [updateTarget, updateType, quantity]);

  function openUpdateModal(product: InventoryProduct) {
    setUpdateTarget(product);
    setUpdateType("RESTOCK");
    setQuantity("");
    setNote("");
  }

  function closeUpdateModal() {
    setUpdateTarget(null);
    setQuantity("");
    setNote("");
  }

  async function handleStockUpdate() {
    if (!updateTarget) return;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${updateTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType,
          quantity: qty,
          note: note || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Stock updated successfully");
        closeUpdateModal();
        fetchProducts();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update stock.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function stockBadge(currentStock: number, minStock: number) {
    const status = getStockStatus(currentStock, minStock);
    if (status === "out")
      return <Badge variant="destructive">Out of Stock</Badge>;
    if (status === "low")
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          Low Stock
        </Badge>
      );
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
        In Stock
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Inventory{" "}
          {!loading && (
            <span className="text-muted-foreground font-normal text-sm">
              ({total})
            </span>
          )}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={categoryFilter}
          onValueChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Product Name" sortKey="name" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
              <SortableHeader label="SKU" sortKey="sku" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
              <SortableHeader label="Category" sortKey="categoryName" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
              <SortableHeader label="Current Stock" sortKey="currentStock" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
              <SortableHeader label="Min Stock" sortKey="minStockLevel" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No products found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              (sortedProducts as unknown as InventoryProduct[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.sku}
                  </TableCell>
                  <TableCell>{p.categoryName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{p.currentStock}</span>
                      {stockBadge(p.currentStock, p.minStockLevel)}
                    </div>
                  </TableCell>
                  <TableCell>{p.minStockLevel}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUpdateModal(p)}
                    >
                      <PackagePlus className="h-4 w-4 mr-1" />
                      Update Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      <Dialog open={!!updateTarget} onOpenChange={() => closeUpdateModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>{updateTarget?.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current stock display */}
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-3xl font-bold">{updateTarget?.currentStock}</p>
            </div>

            {/* Update type */}
            <div className="space-y-2">
              <Label htmlFor="updateType">Update Type</Label>
              <Select
                value={updateType}
                onValueChange={(v) => setUpdateType(v as UpdateType)}
              >
                <SelectTrigger id="updateType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(UPDATE_TYPE_LABELS) as UpdateType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {UPDATE_TYPE_LABELS[type]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
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
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note about this update…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>

            {/* Live preview */}
            {previewStock !== null && (
              <div
                className={`rounded-lg p-4 text-center ${
                  previewStock === 0
                    ? "bg-red-50 text-red-700"
                    : previewStock < 0
                    ? "bg-red-50 text-red-700"
                    : previewStock <= (updateTarget?.minStockLevel ?? 0)
                    ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                <p className="text-sm">New stock will be:</p>
                <p className="text-2xl font-bold">
                  {previewStock < 0 ? (
                    <span className="text-red-600">
                      Insufficient stock
                    </span>
                  ) : (
                    `${previewStock} units`
                  )}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUpdateModal}>
              Cancel
            </Button>
            <Button
              disabled={
                submitting ||
                !quantity ||
                parseInt(quantity, 10) <= 0 ||
                (previewStock !== null && previewStock < 0)
              }
              onClick={handleStockUpdate}
            >
              {submitting ? "Updating…" : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
