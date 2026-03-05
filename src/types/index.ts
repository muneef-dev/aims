// Shared TypeScript types/interfaces used across the application

export type Role = "OWNER" | "STAFF";
export type AlertType = "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK";
export type StockUpdateType =
  | "RESTOCK"
  | "SALE"
  | "ADJUSTMENT"
  | "RETURN"
  | "DAMAGE_WRITEOFF";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalUnits: number;
  topProducts: {
    name: string;
    currentStock: number;
    minStockLevel: number;
  }[];
  categoryDistribution: {
    name: string;
    totalUnits: number;
  }[];
  periodMetrics?: {
    from: string;
    to: string;
    totalMovements: number;
    totalIn: number;
    totalOut: number;
  } | null;
}

export interface ForecastResult {
  predictedDemand: number;
  forecastMonth: string;
  confidence: number;
  confidenceLabel: string;
  modelUsed: string;
  historicalData: { month: string; quantity: number }[];
  generatedAt: Date;
}
