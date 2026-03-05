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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { Clock, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface StockoutItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string | null;
  currentStock: number;
  minStockLevel: number;
  leadTimeDays: number;
  dailyConsumption: number;
  daysUntilStockout: number | null;
  daysUntilMinLevel: number | null;
  stockoutDate: string | null;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

const riskColors: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-green-100 text-green-800",
  NONE: "bg-gray-100 text-gray-800",
};

const chartRiskColors: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
  NONE: "#94a3b8",
};

export default function StockoutTimelinePage() {
  const [items, setItems] = useState<StockoutItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stockout-timeline");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setItems(data.data);
      } catch {
        toast.error("Failed to load stockout timeline");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { sortedData, sortConfig, requestSort } = useTableSort<StockoutItem>(items, "daysUntilStockout", "asc");

  const atRisk = items.filter((i) => i.risk === "CRITICAL" || i.risk === "HIGH");
  const chartData = items
    .filter((i) => i.daysUntilStockout != null && i.daysUntilStockout <= 90)
    .slice(0, 15)
    .map((i) => ({
      name: i.name.length > 15 ? i.name.slice(0, 15) + "…" : i.name,
      days: i.daysUntilStockout,
      risk: i.risk,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stockout Timeline</h1>
        <p className="text-muted-foreground">
          Predictive analysis of when products will reach critical stock levels
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products At Risk</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{atRisk.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.filter((i) => i.risk === "CRITICAL").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stockout Within 7 Days</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter((i) => i.daysUntilStockout != null && i.daysUntilStockout <= 7).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safe Stock</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {items.filter((i) => i.risk === "LOW" || i.risk === "NONE").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Days Until Stockout (Top 15 at Risk)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} fontSize={12} />
                <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="days" name="Days Until Stockout">
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={chartRiskColors[entry.risk]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product Stockout Predictions</CardTitle>
          <CardDescription>Based on average daily consumption over the last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Product" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Current Stock" sortKey="currentStock" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Daily Usage" sortKey="dailyConsumption" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Days to Stockout" sortKey="daysUntilStockout" sortConfig={sortConfig} onSort={requestSort} />
                    <TableHead>Stockout Date</TableHead>
                    <SortableHeader label="Lead Time" sortKey="leadTimeDays" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Risk" sortKey="risk" sortConfig={sortConfig} onSort={requestSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.sku}</div>
                      </TableCell>
                      <TableCell>{item.currentStock}</TableCell>
                      <TableCell>{item.dailyConsumption}</TableCell>
                      <TableCell>
                        {item.daysUntilStockout != null ? (
                          <span className={item.daysUntilStockout <= 7 ? "font-bold text-red-600" : ""}>
                            {item.daysUntilStockout} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No usage data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.stockoutDate
                          ? format(new Date(item.stockoutDate), "MMM d, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>{item.leadTimeDays} days</TableCell>
                      <TableCell>
                        <Badge className={riskColors[item.risk]}>{item.risk}</Badge>
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
