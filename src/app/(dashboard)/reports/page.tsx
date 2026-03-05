"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.lastWeeklyReportAt) setLastSentAt(data.lastWeeklyReportAt);
      })
      .catch(() => {});
  }, []);

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/reports/pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory_report_${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF report downloaded");
    } catch {
      toast.error("Failed to download PDF report");
    } finally {
      setPdfLoading(false);
    }
  }

  async function downloadCsv() {
    setCsvLoading(true);
    try {
      const res = await fetch("/api/reports/csv");
      if (!res.ok) throw new Error("Failed to generate CSV");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory_export_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export downloaded");
    } catch {
      toast.error("Failed to download CSV export");
    } finally {
      setCsvLoading(false);
    }
  }

  async function sendReport() {
    setEmailLoading(true);
    try {
      const res = await fetch("/api/reports/email", { method: "POST" });
      if (!res.ok) throw new Error("Failed to send report");
      const now = new Date().toISOString();
      setLastSentAt(now);
      toast.success("Weekly report email sent successfully");
    } catch {
      toast.error("Failed to send weekly report email");
    } finally {
      setEmailLoading(false);
    }
  }

  function getNextMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(9, 0, 0, 0);
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " at 9:00 AM";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download inventory reports
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              PDF Report
            </CardTitle>
            <CardDescription>
              Download a formatted PDF inventory report with stock levels,
              highlights for low/out-of-stock items, and a summary section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadPdf} disabled={pdfLoading} className="w-full">
              {pdfLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Download PDF Report
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              CSV Export
            </CardTitle>
            <CardDescription>
              Export all product data as a CSV spreadsheet including cost prices
              for analysis in Excel or Google Sheets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={downloadCsv} disabled={csvLoading} variant="outline" className="w-full">
              {csvLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Weekly Email Report
            </CardTitle>
            <CardDescription>
              Send a summary email with stock status to the owner account.
              Automated every Monday at 9:00 AM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                Last sent:{" "}
                <span className="font-medium text-foreground">
                  {lastSentAt
                    ? new Date(lastSentAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </span>
              </p>
              <p className="text-muted-foreground">
                Next scheduled: <span className="font-medium text-foreground">{getNextMonday()}</span>
              </p>
            </div>
            <Button onClick={sendReport} disabled={emailLoading} variant="outline" className="w-full">
              {emailLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Report Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
