"use client";

import { useEffect, useState, useCallback } from "react";

export function useAlertsCount() {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.unreadCount);
      }
    } catch {
      // Silently fail — don't block UI for alert count
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { count, refetch: fetchCount };
}
