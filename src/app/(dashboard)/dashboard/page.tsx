"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Package,
  AlertTriangle,
  XCircle,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import type { DashboardSummary } from "@/types";
import { formatDate } from "@/lib/utils";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

const PIE_COLORS = [
  "oklch(0.65 0.2 250)",   // blue
  "oklch(0.7 0.18 150)",   // green
  "oklch(0.75 0.15 60)",   // amber
  "oklch(0.6 0.22 310)",   // purple
  "oklch(0.7 0.2 20)",     // red-orange
  "oklch(0.65 0.16 200)",  // teal
  "oklch(0.72 0.14 100)",  // lime
  "oklch(0.6 0.2 340)",    // pink
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("from", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange?.to) params.set("to", format(dateRange.to, "yyyy-MM-dd"));
      const url = `/api/dashboard${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setFetchedAt(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        {dateRange?.from && (
          <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
            Clear
          </Button>
        )}
      </div>

      {/* Alert banners */}
      {data.outOfStockCount > 0 && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          ⚠️ {data.outOfStockCount} product(s) are out of stock!
        </div>
      )}
      {data.lowStockCount > 0 && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ {data.lowStockCount} product(s) are running low on stock
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Active Products"
          value={data.totalProducts}
          icon={Package}
          iconClass="text-blue-600 bg-blue-50 dark:bg-blue-950"
        />
        <SummaryCard
          title="Low Stock"
          value={data.lowStockCount}
          icon={AlertTriangle}
          iconClass="text-amber-600 bg-amber-50 dark:bg-amber-950"
        />
        <SummaryCard
          title="Out of Stock"
          value={data.outOfStockCount}
          icon={XCircle}
          iconClass="text-red-600 bg-red-50 dark:bg-red-950"
        />
        <SummaryCard
          title="Total Units in Stock"
          value={data.totalUnits}
          icon={Boxes}
          iconClass="text-green-600 bg-green-50 dark:bg-green-950"
        />
      </div>

      {/* Period Metrics (shown when date range selected) */}
      {data.periodMetrics && (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Stock Movements"
            value={data.periodMetrics.totalMovements}
            icon={Activity}
            iconClass="text-purple-600 bg-purple-50 dark:bg-purple-950"
          />
          <SummaryCard
            title="Units In"
            value={data.periodMetrics.totalIn}
            icon={ArrowDownToLine}
            iconClass="text-green-600 bg-green-50 dark:bg-green-950"
          />
          <SummaryCard
            title="Units Out"
            value={data.periodMetrics.totalOut}
            icon={ArrowUpFromLine}
            iconClass="text-red-600 bg-red-50 dark:bg-red-950"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart — Stock Level Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Level Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No products to display.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={data.topProducts}
                  margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    tickFormatter={(v: string) =>
                      v.length > 12 ? v.slice(0, 12) + "…" : v
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="currentStock"
                    name="Current Stock"
                    fill="oklch(0.65 0.2 250)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="minStockLevel"
                    name="Min Stock Level"
                    fill="oklch(0.75 0.15 60)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart — Inventory by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {data.categoryDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No categories to display.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={data.categoryDistribution}
                    dataKey="totalUnits"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine
                  >
                    {data.categoryDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last updated */}
      {fetchedAt && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {formatDate(fetchedAt)}
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`rounded-lg p-3 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
      </CardContent>
    </Card>
  );
}
