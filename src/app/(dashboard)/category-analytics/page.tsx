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
import { Boxes, DollarSign, AlertTriangle, Package } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface CategoryData {
  categoryId: string | null;
  categoryName: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
  avgStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface AnalyticsData {
  categories: CategoryData[];
  chartData: Record<string, string | number>[];
  categoryNames: string[];
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#4f46e5", "#ca8a04"];

export default function CategoryAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/category-analytics");
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        toast.error("Failed to load category analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { sortedData, sortConfig, requestSort } = useTableSort<CategoryData>(
    data?.categories ?? [],
    "totalValue",
    "desc"
  );

  const totalValue = data?.categories.reduce((s, c) => s + c.totalValue, 0) ?? 0;
  const totalProducts = data?.categories.reduce((s, c) => s + c.productCount, 0) ?? 0;
  const totalLowStock = data?.categories.reduce((s, c) => s + c.lowStockCount, 0) ?? 0;

  // Pie chart data for stock value distribution
  const pieData = data?.categories.map((c) => ({
    name: c.categoryName,
    value: c.totalValue,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Category Analytics</h1>
        <p className="text-muted-foreground">
          Inventory performance broken down by product category
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
      ) : data ? (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.categories.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rs. {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{totalLowStock}</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Demand by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Demand by Category</CardTitle>
                <CardDescription>Last 6 months of outbound movements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {data.categoryNames.map((name, idx) => (
                      <Bar key={name} dataKey={name} stackId="a" fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Stock Value Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Value Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `Rs. ${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Table */}
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="Category" sortKey="categoryName" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Products" sortKey="productCount" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Total Stock" sortKey="totalStock" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Avg Stock" sortKey="avgStock" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Inventory Value" sortKey="totalValue" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Low Stock" sortKey="lowStockCount" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Out of Stock" sortKey="outOfStockCount" sortConfig={sortConfig} onSort={requestSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((cat) => (
                      <TableRow key={cat.categoryId ?? "uncategorized"}>
                        <TableCell className="font-medium">{cat.categoryName}</TableCell>
                        <TableCell>{cat.productCount}</TableCell>
                        <TableCell>{cat.totalStock.toLocaleString()}</TableCell>
                        <TableCell>{cat.avgStock.toLocaleString()}</TableCell>
                        <TableCell>
                          Rs. {cat.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell>
                          {cat.lowStockCount > 0 ? (
                            <Badge className="bg-orange-100 text-orange-800">{cat.lowStockCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cat.outOfStockCount > 0 ? (
                            <Badge className="bg-red-100 text-red-800">{cat.outOfStockCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
