"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface ForecastData {
  predictedDemand: number;
  forecastMonth: string;
  confidence: number;
  confidenceLabel: string;
  modelUsed: string;
  historicalData: { month: string; quantity: number }[];
  generatedAt: string;
}

export default function ForecastingPage() {
  useSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((data) => setProducts(data.data ?? []))
      .catch(() => {});
  }, []);

  const fetchForecast = useCallback(async (productId: string) => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    setForecast(null);

    try {
      const res = await fetch(`/api/forecasting?productId=${productId}`);
      if (res.ok) {
        const data = await res.json();
        setForecast(data);
      } else if (res.status === 404) {
        setError(
          "No sales data available for this product. Record at least 3 months of sales to enable AI forecasting."
        );
      } else {
        setError("Failed to load forecast.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      fetchForecast(selectedProductId);
    }
  }, [selectedProductId, fetchForecast]);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/forecasting/regenerate", { method: "POST" });
      if (res.ok) {
        toast.success("All forecasts have been regenerated successfully");
        if (selectedProductId) {
          fetchForecast(selectedProductId);
        }
      } else {
        toast.error("Failed to regenerate forecasts.");
      }
    } finally {
      setRegenerating(false);
    }
  }

  // Prepare chart data with predicted month appended
  const chartData = forecast
    ? [
        ...forecast.historicalData.map((d) => ({
          month: d.month.replace(/^\w+\s/, (m) => m.slice(0, 3) + " "),
          quantity: d.quantity,
          type: "historical" as const,
        })),
        {
          month: forecast.forecastMonth.replace(/^\w+\s/, (m) => m.slice(0, 3) + " "),
          quantity: forecast.predictedDemand,
          type: "predicted" as const,
        },
      ]
    : [];

  function confidenceBadge(confidence: number, label: string) {
    if (confidence >= 70) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
          {label}
        </Badge>
      );
    }
    if (confidence >= 40) {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
          {label}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        {label}
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Demand Forecasting</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This feature analyzes your product sales history to predict how many
            units you&apos;ll need next month. Select a product below to see its
            forecast.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={regenerating}
          onClick={handleRegenerate}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${regenerating ? "animate-spin" : ""}`}
          />
          {regenerating ? "Regenerating…" : "Regenerate All Forecasts"}
        </Button>
      </div>

      {/* Product selector */}
      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
        <SelectTrigger className="max-w-sm">
          <SelectValue placeholder="Select a product" />
        </SelectTrigger>
        <SelectContent>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Generating forecast…
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Forecast results */}
      {forecast && !loading && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart — takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Sales History &amp; Demand Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="quantity" name="Units Sold" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.type === "predicted"
                            ? "hsl(160, 60%, 45%)"
                            : "hsl(215, 70%, 55%)"
                        }
                        strokeDasharray={
                          entry.type === "predicted" ? "5 5" : undefined
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(215, 70%, 55%)" }} />
                  Historical
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "hsl(160, 60%, 45%)" }} />
                  Predicted
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Forecast details panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forecast Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">Predicted Demand</p>
                <p className="text-4xl font-bold mt-1">
                  {forecast.predictedDemand}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    units
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Forecast Month</p>
                <p className="text-lg font-medium">{forecast.forecastMonth}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Confidence Score
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {forecast.confidence}%
                  </span>
                  {confidenceBadge(forecast.confidence, forecast.confidenceLabel)}
                </div>
                {forecast.confidence < 40 && (
                  <p className="text-xs text-red-600 mt-1">
                    Not enough data for a reliable prediction
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Model Used</p>
                <p className="font-medium">{forecast.modelUsed}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Last Generated</p>
                <p className="text-sm">{formatDate(forecast.generatedAt)}</p>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-4">
                The confidence score indicates how consistent past sales patterns
                are. A higher score means the prediction is more reliable.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state when no product selected */}
      {!selectedProductId && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a product above to view its demand forecast.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
