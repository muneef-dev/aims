"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey?: string | null;
  currentDirection?: "asc" | "desc" | null;
  sortConfig?: { key: string; direction: "asc" | "desc" } | null;
  onSort: (key: string) => void;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  sortConfig,
  onSort,
}: SortableHeaderProps) {
  const activeKey = currentSortKey ?? sortConfig?.key ?? null;
  const activeDir = currentDirection ?? sortConfig?.direction ?? null;
  const isActive = activeKey === sortKey;

  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          activeDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}
