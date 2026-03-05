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
import { Button } from "@/components/ui/button";
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
import { Target, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";

interface AccuracyRecord {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  forecastMonth: string;
  predictedDemand: number;
  actualDemand: number;
  accuracy: number;
  absoluteError: number;
  createdAt: string;
}

export default function ForecastAccuracyPage() {
  const [records, setRecords] = useState<AccuracyRecord[]>([]);
  const [summary, setSummary] = useState({ totalRecords: 0, avgAccuracy: 0, avgError: 0, highAccuracy: 0 });
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/forecast-accuracy");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRecords(json.data);
      setSummary(json.summary);
    } catch {
      toast.error("Failed to load forecast accuracy data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await fetch("/api/forecast-accuracy", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(data.message);
      fetchData();
    } catch {
      toast.error("Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  };

  const { sortedData, sortConfig, requestSort } = useTableSort<AccuracyRecord>(records, "accuracy", "desc");

  // Chart: predicted vs actual scatter
  const scatterData = records.map((r) => ({
    predicted: r.predictedDemand,
    actual: r.actualDemand,
    name: r.productName,
  }));

  // Accuracy distribution
  const accBuckets = [
    { range: "90-100%", count: records.filter((r) => r.accuracy >= 90).length },
    { range: "80-90%", count: records.filter((r) => r.accuracy >= 80 && r.accuracy < 90).length },
    { range: "60-80%", count: records.filter((r) => r.accuracy >= 60 && r.accuracy < 80).length },
    { range: "40-60%", count: records.filter((r) => r.accuracy >= 40 && r.accuracy < 60).length },
    { range: "<40%", count: records.filter((r) => r.accuracy < 40).length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Forecast Accuracy</h1>
          <p className="text-muted-foreground">
            Track how well AI predictions match actual demand
          </p>
        </div>
        <Button onClick={runEvaluation} disabled={evaluating}>
          {evaluating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Target className="mr-2 h-4 w-4" />
          )}
          {evaluating ? "Evaluating..." : "Run Evaluation"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRecords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgAccuracy}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Error</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avgError} units</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Accuracy (≥80%)</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.highAccuracy}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accuracy Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={accBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Products" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Predicted vs Actual</CardTitle>
            <CardDescription>Points on the diagonal = perfect predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="predicted" name="Predicted" type="number" />
                <YAxis dataKey="actual" name="Actual" type="number" />
                <ZAxis range={[40, 40]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={scatterData} fill="#2563eb" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accuracy Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
          ) : sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mb-2" />
              <p>No evaluations yet. Click &quot;Run Evaluation&quot; to compare forecasts with actuals.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Product" sortKey="productName" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Month" sortKey="forecastMonth" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Predicted" sortKey="predictedDemand" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Actual" sortKey="actualDemand" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Accuracy" sortKey="accuracy" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Error" sortKey="absoluteError" sortConfig={sortConfig} onSort={requestSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div>{r.productName}</div>
                        <div className="text-xs text-muted-foreground">{r.productSku}</div>
                      </TableCell>
                      <TableCell>{r.forecastMonth}</TableCell>
                      <TableCell>{r.predictedDemand}</TableCell>
                      <TableCell>{r.actualDemand}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            r.accuracy >= 80
                              ? "bg-green-100 text-green-800"
                              : r.accuracy >= 60
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {r.accuracy}%
                        </Badge>
                      </TableCell>
                      <TableCell>{r.absoluteError} units</TableCell>
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
