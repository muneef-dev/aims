"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, CheckCircle } from "lucide-react";
import { useTableSort } from "@/hooks/use-table-sort";
import { SortableHeader } from "@/components/ui/sortable-header";

interface Alert {
  id: string;
  productId: string;
  productName: string | null;
  productSku: string | null;
  type: "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK";
  message: string;
  isRead: boolean;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

const ALERT_BADGE: Record<string, { className: string; label: string }> = {
  OUT_OF_STOCK: {
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
    label: "Out of Stock",
  },
  LOW_STOCK: {
    className: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100",
    label: "Low Stock",
  },
  OVERSTOCK: {
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
    label: "Overstock",
  },
};

export default function AlertsPage() {
  const [tab, setTab] = useState("unresolved");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const resolved = tab === "resolved" ? "true" : "false";
      const params = new URLSearchParams({
        resolved,
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/alerts?${params}`);
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  async function markAsRead(id: string) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    });
    if (res.ok) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      toast.success("Alert marked as read");
    }
  }

  async function markAsResolved(id: string) {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isResolved: true }),
    });
    if (res.ok) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setTotal((t) => t - 1);
      toast.success("Alert resolved");
    }
  }

  function alertBadge(type: string) {
    const config = ALERT_BADGE[type];
    if (!config) return <Badge>{type}</Badge>;
    return <Badge className={config.className}>{config.label}</Badge>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Alerts</h2>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="unresolved" className="mt-4">
          <AlertTable
            alerts={alerts}
            loading={loading}
            showActions
            onMarkRead={markAsRead}
            onResolve={markAsResolved}
            alertBadge={alertBadge}
          />
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <AlertTable
            alerts={alerts}
            loading={loading}
            showResolved
            alertBadge={alertBadge}
          />
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertTable({
  alerts,
  loading,
  showActions,
  showResolved,
  onMarkRead,
  onResolve,
  alertBadge,
}: {
  alerts: Alert[];
  loading: boolean;
  showActions?: boolean;
  showResolved?: boolean;
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
  alertBadge: (type: string) => React.ReactNode;
}) {
  const colSpan = showActions ? 5 : showResolved ? 5 : 4;
  const { sortedData, sortConfig, requestSort } = useTableSort(alerts as unknown as Record<string, unknown>[], "createdAt", "desc");

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader label="Product" sortKey="productName" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
            <SortableHeader label="Type" sortKey="type" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
            <TableHead>Message</TableHead>
            <SortableHeader label="Date" sortKey="createdAt" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />
            {showActions && <TableHead className="text-right">Actions</TableHead>}
            {showResolved && <SortableHeader label="Resolved At" sortKey="resolvedAt" currentSortKey={sortConfig?.key ?? null} currentDirection={sortConfig?.direction ?? null} onSort={requestSort} />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                Loading…
              </TableCell>
            </TableRow>
          ) : alerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground">
                {showResolved ? "No resolved alerts." : "No unresolved alerts. All clear!"}
              </TableCell>
            </TableRow>
          ) : (
            (sortedData as unknown as Alert[]).map((a) => (
              <TableRow
                key={a.id}
                className={
                  !a.isRead && !a.isResolved
                    ? "border-l-4 border-l-primary font-medium"
                    : ""
                }
              >
                <TableCell>
                  <div>
                    <span className="font-medium">{a.productName ?? "—"}</span>
                    {a.productSku && (
                      <span className="text-muted-foreground text-xs ml-2">
                        {a.productSku}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{alertBadge(a.type)}</TableCell>
                <TableCell className="max-w-xs truncate">{a.message}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(a.createdAt)}
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {!a.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkRead?.(a.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResolve?.(a.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  </TableCell>
                )}
                {showResolved && (
                  <TableCell className="whitespace-nowrap">
                    {a.resolvedAt ? formatDate(a.resolvedAt) : "—"}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
