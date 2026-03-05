"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h2 className="mb-2 text-xl font-semibold">
            Something went wrong
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {error.message === "DATABASE_UNAVAILABLE"
              ? "The system is temporarily unavailable. Please try again shortly."
              : "An unexpected error occurred. Please try again."}
          </p>
          <Button onClick={reset}>Try Again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
