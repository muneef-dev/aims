"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Pencil } from "lucide-react";
import { formatCurrency, formatDate, getStockStatus } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTableSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/ui/sortable-header";

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string | null;
  description: string | null;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitCostPrice: number;
  unitSellingPrice: number;
  supplierName: string | null;
  leadTimeDays: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StockHistory {
  id: string;
  updateType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  userName: string;
  createdAt: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${id}`).then((r) => r.json()),
      isOwner
        ? fetch(`/api/inventory/${id}/history?limit=50`).then((r) =>
            r.ok ? r.json() : []
          )
        : Promise.resolve([]),
    ])
      .then(([prod, hist]) => {
        setProduct(prod.error ? null : prod);
        setHistory(Array.isArray(hist) ? hist : []);
      })
      .finally(() => setLoading(false));
  }, [id, isOwner]);

  if (loading) {
    return <p className="text-muted-foreground py-8">Loading…</p>;
  }

  if (!product) {
    return <p className="text-muted-foreground py-8">Product not found.</p>;
  }

  const status = getStockStatus(product.currentStock, product.minStockLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-lg font-semibold">{product.name}</h2>
        </div>
        {isOwner && (
          <Button asChild>
            <Link href={`/products/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {product.imageUrl && (
          <div className="md:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-48 w-48 rounded-md border object-cover"
                />
              </CardContent>
            </Card>
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="SKU" value={product.sku} />
            <Row label="Category" value={product.categoryName ?? "—"} />
            <Row label="Unit" value={product.unit} />
            {product.description && (
              <Row label="Description" value={product.description} />
            )}
            {product.supplierName && (
              <Row label="Supplier" value={product.supplierName} />
            )}
            <Row label="Lead Time" value={`${product.leadTimeDays} days`} />
            <Row label="Created" value={formatDate(product.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Stock</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{product.currentStock} {product.unit}</span>
                {status === "out" && <Badge variant="destructive">Out of Stock</Badge>}
                {status === "low" && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">Low Stock</Badge>
                )}
                {status === "normal" && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">In Stock</Badge>
                )}
              </div>
            </div>
            <Row label="Min Stock Level" value={String(product.minStockLevel)} />
            <Row label="Max Stock Level" value={String(product.maxStockLevel)} />
            {isOwner && (
              <Row label="Cost Price" value={formatCurrency(product.unitCostPrice)} />
            )}
            <Row label="Selling Price" value={formatCurrency(product.unitSellingPrice)} />
          </CardContent>
        </Card>
      </div>

      {isOwner && history.length > 0 && (
        <StockHistoryTable history={history} />
      )}
    </div>
  );
}

function StockHistoryTable({ history }: { history: StockHistory[] }) {
  const { sortedData, sortConfig, requestSort } = useTableSort(history, "createdAt", "desc");

  return (
    <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Date & Time" sortKey="createdAt" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Update Type" sortKey="updateType" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Qty Change" sortKey="quantity" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="Previous" sortKey="previousStock" sortConfig={sortConfig} onSort={requestSort} />
                  <SortableHeader label="New" sortKey="newStock" sortConfig={sortConfig} onSort={requestSort} />
                  <TableHead>Note</TableHead>
                  <SortableHeader label="Updated By" sortKey="userName" sortConfig={sortConfig} onSort={requestSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sortedData as unknown as StockHistory[]).map((h) => {
                  const diff = h.newStock - h.previousStock;
                  return (
                    <TableRow key={h.id}>
                      <TableCell>{formatDate(h.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {h.updateType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={
                          diff >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {diff >= 0 ? `+${diff}` : diff}
                      </TableCell>
                      <TableCell>{h.previousStock}</TableCell>
                      <TableCell>{h.newStock}</TableCell>
                      <TableCell className="max-w-50 truncate">
                        {h.note ?? "—"}
                      </TableCell>
                      <TableCell>{h.userName}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
