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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { AlertTriangle, ShieldCheck, ScanSearch, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface Anomaly {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  expectedValue: number | null;
  actualValue: number | null;
  deviation: number | null;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  detectedAt: string;
}

const severityColors: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
};

export default function AnomalyDetectionPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [acknowledgedFilter, setAcknowledgedFilter] = useState("false");

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (acknowledgedFilter !== "all") params.set("acknowledged", acknowledgedFilter);

      const res = await fetch(`/api/anomalies?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnomalies(data.data);
    } catch {
      toast.error("Failed to load anomalies");
    } finally {
      setLoading(false);
    }
  }, [severityFilter, acknowledgedFilter]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/anomalies", { method: "POST" });
      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();
      toast.success(data.message);
      fetchAnomalies();
    } catch {
      toast.error("Anomaly scan failed");
    } finally {
      setScanning(false);
    }
  };

  const acknowledge = async (id: string) => {
    try {
      const res = await fetch(`/api/anomalies/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Anomaly acknowledged");
      fetchAnomalies();
    } catch {
      toast.error("Failed to acknowledge anomaly");
    }
  };

  const { sortedData, sortConfig, requestSort } = useTableSort<Anomaly>(anomalies, "detectedAt", "desc");

  const stats = {
    total: anomalies.length,
    critical: anomalies.filter((a) => a.severity === "CRITICAL").length,
    high: anomalies.filter((a) => a.severity === "HIGH").length,
    unacknowledged: anomalies.filter((a) => !a.isAcknowledged).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anomaly Detection</h1>
          <p className="text-muted-foreground">
            AI-powered detection of unusual inventory patterns
          </p>
        </div>
        <Button onClick={runScan} disabled={scanning}>
          {scanning ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanSearch className="mr-2 h-4 w-4" />
          )}
          {scanning ? "Scanning..." : "Run Detection Scan"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unacknowledged}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Detected Anomalies</CardTitle>
          <CardDescription>Review and acknowledge inventory anomalies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="false">Unacknowledged</SelectItem>
                <SelectItem value="true">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading anomalies...
            </div>
          ) : sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mb-2" />
              <p>No anomalies found. Run a detection scan to check for issues.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Product" sortKey="productName" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Type" sortKey="type" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Severity" sortKey="severity" sortConfig={sortConfig} onSort={requestSort} />
                    <TableHead>Description</TableHead>
                    <SortableHeader label="Deviation" sortKey="deviation" sortConfig={sortConfig} onSort={requestSort} />
                    <SortableHeader label="Detected" sortKey="detectedAt" sortConfig={sortConfig} onSort={requestSort} />
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((anomaly) => (
                    <TableRow key={anomaly.id} className={anomaly.isAcknowledged ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        <div>{anomaly.productName}</div>
                        <div className="text-xs text-muted-foreground">{anomaly.productSku}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{anomaly.type.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[anomaly.severity]}>
                          {anomaly.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{anomaly.description}</TableCell>
                      <TableCell>
                        {anomaly.deviation != null ? `${anomaly.deviation}%` : "—"}
                      </TableCell>
                      <TableCell>{format(new Date(anomaly.detectedAt), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>
                        {!anomaly.isAcknowledged ? (
                          <Button size="sm" variant="outline" onClick={() => acknowledge(anomaly.id)}>
                            Acknowledge
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Acknowledged</span>
                        )}
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
