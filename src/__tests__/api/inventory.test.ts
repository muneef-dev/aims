/**
 * Tests for inventory stock-update business logic.
 *
 * We extract the pure calculation logic from the API route and
 * test it without needing a running database or HTTP server.
 */

// ── Pure logic extracted from the inventory route ─────────
type UpdateType =
  | "RESTOCK"
  | "RETURN"
  | "SALE"
  | "DAMAGE_WRITEOFF"
  | "ADJUSTMENT";

interface StockCalcResult {
  success: boolean;
  newStock?: number;
  error?: string;
}

function calculateNewStock(
  previousStock: number,
  updateType: UpdateType,
  quantity: number
): StockCalcResult {
  let newStock: number;

  switch (updateType) {
    case "RESTOCK":
    case "RETURN":
      newStock = previousStock + quantity;
      break;
    case "SALE":
    case "DAMAGE_WRITEOFF":
    case "ADJUSTMENT":
      newStock = previousStock - quantity;
      break;
    default:
      return { success: false, error: "Invalid update type" };
  }

  if (newStock < 0) {
    return { success: false, error: "Insufficient stock for this operation" };
  }

  return { success: true, newStock };
}

type AlertType = "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK" | null;

function determineAlertType(
  newStock: number,
  minStockLevel: number,
  maxStockLevel: number
): AlertType {
  if (newStock === 0) return "OUT_OF_STOCK";
  if (newStock > 0 && newStock <= minStockLevel) return "LOW_STOCK";
  if (newStock >= maxStockLevel) return "OVERSTOCK";
  return null;
}

// ── Tests ─────────────────────────────────────────────────
describe("Inventory Stock Logic", () => {
  // ── Stock Calculation ────────────────────────────────
  describe("calculateNewStock", () => {
    it("RESTOCK adds quantity to current stock", () => {
      const result = calculateNewStock(50, "RESTOCK", 25);
      expect(result).toEqual({ success: true, newStock: 75 });
    });

    it("RETURN adds quantity to current stock", () => {
      const result = calculateNewStock(30, "RETURN", 5);
      expect(result).toEqual({ success: true, newStock: 35 });
    });

    it("SALE subtracts quantity from current stock", () => {
      const result = calculateNewStock(100, "SALE", 40);
      expect(result).toEqual({ success: true, newStock: 60 });
    });

    it("DAMAGE_WRITEOFF subtracts quantity", () => {
      const result = calculateNewStock(20, "DAMAGE_WRITEOFF", 5);
      expect(result).toEqual({ success: true, newStock: 15 });
    });

    it("ADJUSTMENT subtracts quantity", () => {
      const result = calculateNewStock(50, "ADJUSTMENT", 10);
      expect(result).toEqual({ success: true, newStock: 40 });
    });

    it("allows stock to reach exactly zero", () => {
      const result = calculateNewStock(10, "SALE", 10);
      expect(result).toEqual({ success: true, newStock: 0 });
    });

    it("rejects operation that would make stock negative", () => {
      const result = calculateNewStock(5, "SALE", 10);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/insufficient/i);
    });

    it("handles zero starting stock with RESTOCK", () => {
      const result = calculateNewStock(0, "RESTOCK", 100);
      expect(result).toEqual({ success: true, newStock: 100 });
    });
  });

  // ── Alert Determination ──────────────────────────────
  describe("determineAlertType", () => {
    it("returns OUT_OF_STOCK when stock is 0", () => {
      expect(determineAlertType(0, 10, 200)).toBe("OUT_OF_STOCK");
    });

    it("returns LOW_STOCK when stock equals min level", () => {
      expect(determineAlertType(10, 10, 200)).toBe("LOW_STOCK");
    });

    it("returns LOW_STOCK when stock below min but above 0", () => {
      expect(determineAlertType(3, 10, 200)).toBe("LOW_STOCK");
    });

    it("returns OVERSTOCK when stock equals max level", () => {
      expect(determineAlertType(200, 10, 200)).toBe("OVERSTOCK");
    });

    it("returns OVERSTOCK when stock exceeds max level", () => {
      expect(determineAlertType(300, 10, 200)).toBe("OVERSTOCK");
    });

    it("returns null when stock is in normal range", () => {
      expect(determineAlertType(50, 10, 200)).toBeNull();
    });

    it("returns null when stock is just above min level", () => {
      expect(determineAlertType(11, 10, 200)).toBeNull();
    });

    it("returns null when stock is just below max level", () => {
      expect(determineAlertType(199, 10, 200)).toBeNull();
    });
  });
});
