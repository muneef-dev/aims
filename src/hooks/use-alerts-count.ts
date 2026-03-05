"use client";

import { useEffect, useState, useCallback } from "react";

export function useAlertsCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/alerts/count");
        if (res.ok) {
          const data = await res.json();
          setCount(data.unreadCount);
        }
      } catch {
        // Silently fail — don't block UI for alert count
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/count");
      if (res.ok) {
        const data = await res.json();
        setCount(data.unreadCount);
      }
    } catch {
      // Silently fail
    }
  }, []);

  return { count, refetch };
}
