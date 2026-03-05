import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getStockStatus(
  currentStock: number,
  minStock: number
): "out" | "low" | "normal" {
  if (currentStock === 0) return "out";
  if (currentStock <= minStock) return "low";
  return "normal";
}

export function getStockColor(status: "out" | "low" | "normal"): string {
  switch (status) {
    case "out":
      return "text-red-600 bg-red-50";
    case "low":
      return "text-amber-600 bg-amber-50";
    case "normal":
      return "text-green-600 bg-green-50";
  }
}
