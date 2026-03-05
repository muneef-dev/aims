"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { formatCurrency, getStockStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useTableSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/ui/sortable-header";

interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string | null;
  currentStock: number;
  minStockLevel: number;
  unitCostPrice: number;
  unitSellingPrice: number;
  imageUrl: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isOwner = session?.user?.role === "OWNER";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debouncedSearch = useDebounce(search);
  const { sortedData: sortedProducts, sortConfig, requestSort } = useTableSort(products as unknown as Record<string, unknown>[], "name");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await fetch(`/api/products?${params}`);
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`${deleteTarget.name} has been deleted.`);
        setDeleteTarget(null);
        fetchProducts();
      } else {
        toast.error("Failed to delete product.");
      }
    } finally {
      setDeleting(false);
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
          Products {!loading && <span className="text-muted-foreground font-normal text-sm">({total})</span>}
        </h2>
        {isOwner && (
          <Button asChild>
            <Link href="/products/new">
              <Plus className="h-4 w-4" />
              Add Product
            </Link>
          </Button>
        )}
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
              <SortableHeader label="Selling Price" sortKey="unitSellingPrice" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
              {isOwner && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isOwner ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  No products found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              (sortedProducts as unknown as Product[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/products/${p.id}`}
                      className="flex items-center gap-3 font-medium text-primary hover:underline"
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-8 w-8 rounded border object-cover" loading="lazy" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                          {p.name.charAt(0)}
                        </span>
                      )}
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell>{p.categoryName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{p.currentStock}</span>
                      {stockBadge(p.currentStock, p.minStockLevel)}
                    </div>
                  </TableCell>
                  <TableCell>{p.minStockLevel}</TableCell>
                  <TableCell>{formatCurrency(p.unitSellingPrice)}</TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/products/${p.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
