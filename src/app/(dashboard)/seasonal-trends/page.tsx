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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SeasonalData {
  product: { id: string; name: string };
  seasonalIndex: {
    month: number;
    monthName: string;
    averageDemand: number;
    seasonalIndex: number;
    dataPoints: number;
  }[];
  peakMonths: string[];
  troughMonths: string[];
  overallAverage: number;
  yearlyTrends: Record<string, { month: number; monthName: string; demand: number }[]>;
}

interface ProductOption {
  id: string;
  name: string;
}

const lineColors = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];

export default function SeasonalTrendsPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [data, setData] = useState<SeasonalData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load products for selector
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products?limit=100");
        if (!res.ok) throw new Error();
        const json = await res.json();
        setProducts(json.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })));
      } catch {
        toast.error("Failed to load products");
      }
    })();
  }, []);

  // Load seasonal data when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/seasonal-trends?productId=${selectedProduct}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json);
      } catch {
        toast.error("Failed to load seasonal trends");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedProduct]);

  // Build year-over-year chart data
  const years = data ? Object.keys(data.yearlyTrends).sort() : [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const yoyChartData = months.map((monthName, idx) => {
    const row: Record<string, string | number> = { month: monthName };
    for (const year of years) {
      const found = data?.yearlyTrends[year]?.find((t) => t.month === idx + 1);
      row[year] = found?.demand ?? 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seasonal Trends</h1>
        <p className="text-muted-foreground">
          Analyze monthly demand patterns and seasonal variation
        </p>
      </div>

      {/* Product Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Product</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Choose a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading seasonal data...
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Monthly Demand</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.overallAverage} units</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Peak Months</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 flex-wrap">
                  {data.peakMonths.length > 0 ? (
                    data.peakMonths.map((m) => (
                      <Badge key={m} className="bg-green-100 text-green-800">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No significant peaks</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Months</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 flex-wrap">
                  {data.troughMonths.length > 0 ? (
                    data.troughMonths.map((m) => (
                      <Badge key={m} className="bg-red-100 text-red-800">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No significant troughs</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seasonal Index Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Seasonal Index</CardTitle>
              <CardDescription>
                Index above 1.0 = higher than average demand, below 1.0 = lower
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.seasonalIndex}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="seasonalIndex"
                    name="Seasonal Index"
                    fill="#2563eb"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Year-over-Year Overlay */}
          {years.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Year-over-Year Comparison</CardTitle>
                <CardDescription>Monthly demand overlay across years</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={yoyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {years.map((year, idx) => (
                      <Line
                        key={year}
                        type="monotone"
                        dataKey={year}
                        name={year}
                        stroke={lineColors[idx % lineColors.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {data.seasonalIndex.map((item) => (
                  <div
                    key={item.month}
                    className={`rounded-lg border p-3 text-center ${
                      item.seasonalIndex >= 1.2
                        ? "border-green-300 bg-green-50"
                        : item.seasonalIndex <= 0.8 && item.seasonalIndex > 0
                          ? "border-red-300 bg-red-50"
                          : ""
                    }`}
                  >
                    <div className="font-semibold">{item.monthName}</div>
                    <div className="text-2xl font-bold">{item.averageDemand}</div>
                    <div className="text-xs text-muted-foreground">
                      Index: {item.seasonalIndex}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
