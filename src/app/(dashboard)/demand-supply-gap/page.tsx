"use client";

import { useEffect, useState, useCallback } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ArrowDownToLine, ArrowUpFromLine, TrendingDown, Package } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface GapData {
  chartData: { month: string; supply: number; demand: number; gap: number }[];
  productData: {
    productId: string;
    productName: string;
    productSku: string;
    categoryName: string | null;
    supply: number;
    demand: number;
    gap: number;
  }[];
  summary: {
    totalSupply: number;
    totalDemand: number;
    netGap: number;
    deficitProducts: number;
  };
}

export default function DemandSupplyGapPage() {
  const [data, setData] = useState<GapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("6");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/demand-supply-gap?months=${months}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Failed to load demand-supply gap data");
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { sortedData, sortConfig, requestSort } = useTableSort(
    data?.productData ?? [],
    "gap",
    "asc"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demand-Supply Gap</h1>
          <p className="text-muted-foreground">
            Visualize the balance between incoming and outgoing inventory
          </p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
                <ArrowDownToLine className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data.summary.totalSupply.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Demand</CardTitle>
                <ArrowUpFromLine className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {data.summary.totalDemand.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Gap</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${data.summary.netGap < 0 ? "text-red-600" : "text-green-600"}`}>
                  {data.summary.netGap > 0 ? "+" : ""}
                  {data.summary.netGap.toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deficit Products</CardTitle>
                <Package className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.summary.deficitProducts}</div>
              </CardContent>
            </Card>
          </div>

          {/* Gap Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Supply vs Demand</CardTitle>
              <CardDescription>Green bars = supply (IN), blue bars = demand (OUT)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar dataKey="supply" name="Supply (In)" fill="#22c55e" />
                  <Bar dataKey="demand" name="Demand (Out)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Gap Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product-Level Gap Analysis</CardTitle>
              <CardDescription>Products sorted by gap (most undersupplied first)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="Product" sortKey="productName" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Category" sortKey="categoryName" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Supply" sortKey="supply" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Demand" sortKey="demand" sortConfig={sortConfig} onSort={requestSort} />
                      <SortableHeader label="Gap" sortKey="gap" sortConfig={sortConfig} onSort={requestSort} />
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedData.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">
                          <div>{item.productName}</div>
                          <div className="text-xs text-muted-foreground">{item.productSku}</div>
                        </TableCell>
                        <TableCell>{item.categoryName ?? "—"}</TableCell>
                        <TableCell className="text-green-600">{item.supply.toLocaleString()}</TableCell>
                        <TableCell className="text-blue-600">{item.demand.toLocaleString()}</TableCell>
                        <TableCell className={`font-bold ${item.gap < 0 ? "text-red-600" : "text-green-600"}`}>
                          {item.gap > 0 ? "+" : ""}
                          {item.gap.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {item.gap < 0 ? (
                            <Badge className="bg-red-100 text-red-800">Deficit</Badge>
                          ) : item.gap === 0 ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Balanced</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">Surplus</Badge>
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
