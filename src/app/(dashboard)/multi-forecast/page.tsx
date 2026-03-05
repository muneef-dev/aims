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
import { TrendingUp, Calendar } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ForecastData {
  product: { id: string; name: string };
  historical: { month: string; totalOut: number }[];
  forecasts: { month: string; predicted: number; lower: number; upper: number }[];
  chartData: { month: string; actual: number | null; predicted: number | null; lower: number | null; upper: number | null }[];
  periods: number;
}

interface ProductOption {
  id: string;
  name: string;
}

export default function MultiForecastPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [periods, setPeriods] = useState("6");
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!selectedProduct) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/multi-forecast?productId=${selectedProduct}&periods=${periods}`);
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        toast.error("Failed to load forecast data");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedProduct, periods]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Multi-Period Forecast</h1>
        <p className="text-muted-foreground">
          Compare forecasts across multiple future periods with confidence intervals
        </p>
      </div>

      {/* Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Choose a product..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periods} onValueChange={setPeriods}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months ahead</SelectItem>
              <SelectItem value="6">6 months ahead</SelectItem>
              <SelectItem value="9">9 months ahead</SelectItem>
              <SelectItem value="12">12 months ahead</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading forecast...</div>
      )}

      {data && !loading && (
        <>
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Historical Months</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.historical.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecast Periods</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.forecasts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next Month Prediction</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.forecasts.length > 0 ? `${data.forecasts[0].predicted} units` : "N/A"}
                </div>
                {data.forecasts.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Range: {data.forecasts[0].lower} – {data.forecasts[0].upper}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Historical vs Forecast</CardTitle>
              <CardDescription>Blue area = confidence interval, blue line = predicted, dark line = actual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" angle={-30} textAnchor="end" height={60} fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="upper"
                    name="Upper Bound"
                    fill="#93c5fd"
                    stroke="none"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    name="Lower Bound"
                    fill="#ffffff"
                    stroke="none"
                    fillOpacity={1}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Demand"
                    stroke="#1e293b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted"
                    stroke="#2563eb"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Forecast Table */}
          <Card>
            <CardHeader>
              <CardTitle>Forecast Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.forecasts.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  Not enough historical data (need at least 3 months) to generate forecasts.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Predicted Demand</TableHead>
                        <TableHead>Lower Bound (95%)</TableHead>
                        <TableHead>Upper Bound (95%)</TableHead>
                        <TableHead>Range Width</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.forecasts.map((f) => (
                        <TableRow key={f.month}>
                          <TableCell className="font-medium">{f.month}</TableCell>
                          <TableCell className="font-bold text-blue-600">{f.predicted}</TableCell>
                          <TableCell>{f.lower}</TableCell>
                          <TableCell>{f.upper}</TableCell>
                          <TableCell className="text-muted-foreground">{f.upper - f.lower}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
