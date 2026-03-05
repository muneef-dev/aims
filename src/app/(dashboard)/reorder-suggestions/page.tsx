"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { PackagePlus, AlertCircle, Clock, DollarSign } from "lucide-react";

interface Suggestion {
  id: string;
  name: string;
  sku: string;
  categoryName: string | null;
  supplierName: string | null;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  dailyConsumption: number;
  reorderPoint: number;
  suggestedQuantity: number;
  estimatedCost: number;
  urgency: "ORDER_NOW" | "ORDER_SOON" | "PLAN_AHEAD" | "ADEQUATE";
  daysUntilStockout: number | null;
}

const urgencyColors: Record<string, string> = {
  ORDER_NOW: "bg-red-100 text-red-800",
  ORDER_SOON: "bg-orange-100 text-orange-800",
  PLAN_AHEAD: "bg-yellow-100 text-yellow-800",
  ADEQUATE: "bg-green-100 text-green-800",
};

export default function ReorderSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reorder-suggestions");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setSuggestions(data.data);
      } catch {
        toast.error("Failed to load reorder suggestions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { sortedData, sortConfig, requestSort } = useTableSort<Suggestion>(suggestions, "urgency", "asc");

  const totalCost = suggestions.reduce((sum, s) => sum + s.estimatedCost, 0);
  const orderNow = suggestions.filter((s) => s.urgency === "ORDER_NOW").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reorder Suggestions</h1>
        <p className="text-muted-foreground">
          Smart recommendations based on consumption rates and lead times
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items to Reorder</CardTitle>
            <PackagePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suggestions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Now</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{orderNow}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Est. Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rs. {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suggestions.length > 0
                ? Math.round(suggestions.reduce((s, i) => s + i.leadTimeDays, 0) / suggestions.length)
                : 0}{" "}
              days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
          <CardDescription>
            Quantities calculated using safety stock formula with lead time consideration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
          ) : sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PackagePlus className="h-12 w-12 mb-2" />
              <p>All stock levels are adequate. No reorders needed.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Product" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Supplier" sortKey="supplierName" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Stock" sortKey="currentStock" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Daily Usage" sortKey="dailyConsumption" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Reorder Qty" sortKey="suggestedQuantity" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Est. Cost" sortKey="estimatedCost" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Lead Time" sortKey="leadTimeDays" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Urgency" sortKey="urgency" sortConfig={sortConfig} onSort={requestSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell>{item.supplierName ?? "—"}</TableCell>
                      <TableCell>
                        <span className={item.currentStock <= item.minStockLevel ? "text-red-600 font-bold" : ""}>
                          {item.currentStock}
                        </span>
                        <span className="text-xs text-muted-foreground"> / {item.minStockLevel}</span>
                      </TableCell>
                      <TableCell>{item.dailyConsumption}</TableCell>
                      <TableCell className="font-bold">{item.suggestedQuantity}</TableCell>
                      <TableCell>
                        Rs. {item.estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{item.leadTimeDays} days</TableCell>
                      <TableCell>
                        <Badge className={urgencyColors[item.urgency]}>
                          {item.urgency.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
