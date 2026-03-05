import { linearRegression, linearRegressionLine, standardDeviation, mean } from "simple-statistics";

export interface AnomalyResult {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
}

interface StockMovement {
  month: string;
  quantity: number;
}

/**
 * Detect anomalies in stock movement patterns using statistical analysis.
 * Uses Z-score analysis and trend deviation to identify unusual patterns.
 */
export function detectAnomalies(
  productName: string,
  currentStock: number,
  minStockLevel: number,
  maxStockLevel: number,
  monthlyMovements: StockMovement[]
): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  // 1. Stock Level Anomaly
  if (currentStock === 0) {
    anomalies.push({
      type: "STOCK_OUT",
      severity: "CRITICAL",
      description: `${productName} has zero stock — immediate restock needed.`,
      expectedValue: minStockLevel,
      actualValue: currentStock,
      deviation: 100,
    });
  } else if (currentStock <= minStockLevel * 0.5) {
    anomalies.push({
      type: "CRITICAL_LOW_STOCK",
      severity: "HIGH",
      description: `${productName} stock (${currentStock}) is below 50% of minimum level (${minStockLevel}).`,
      expectedValue: minStockLevel,
      actualValue: currentStock,
      deviation: Math.round(((minStockLevel - currentStock) / minStockLevel) * 100),
    });
  } else if (currentStock > maxStockLevel * 1.2) {
    anomalies.push({
      type: "SEVERE_OVERSTOCK",
      severity: "HIGH",
      description: `${productName} stock (${currentStock}) exceeds maximum (${maxStockLevel}) by over 20%.`,
      expectedValue: maxStockLevel,
      actualValue: currentStock,
      deviation: Math.round(((currentStock - maxStockLevel) / maxStockLevel) * 100),
    });
  }

  // Need at least 3 months of data for statistical analysis
  if (monthlyMovements.length < 3) return anomalies;

  const quantities = monthlyMovements.map((m) => m.quantity);
  const avg = mean(quantities);
  const sd = standardDeviation(quantities);

  // 2. Z-score analysis on latest month
  if (sd > 0 && quantities.length >= 3) {
    const latest = quantities[quantities.length - 1];
    const zScore = (latest - avg) / sd;

    if (Math.abs(zScore) > 2.5) {
      const direction = zScore > 0 ? "spike" : "drop";
      anomalies.push({
        type: `DEMAND_${direction.toUpperCase()}`,
        severity: Math.abs(zScore) > 3 ? "HIGH" : "MEDIUM",
        description: `${productName} shows unusual demand ${direction} — latest month (${latest}) is ${Math.abs(zScore).toFixed(1)} standard deviations from the mean (${Math.round(avg)}).`,
        expectedValue: Math.round(avg),
        actualValue: latest,
        deviation: Math.round(Math.abs(zScore) * 100) / 100,
      });
    }
  }

  // 3. Trend deviation — compare regression prediction to actual
  if (quantities.length >= 4) {
    const pairs: [number, number][] = quantities.slice(0, -1).map((v, i) => [i, v]);
    const regression = linearRegression(pairs);
    const line = linearRegressionLine(regression);
    const predicted = line(quantities.length - 1);
    const actual = quantities[quantities.length - 1];

    if (predicted > 0) {
      const pctDeviation = Math.abs((actual - predicted) / predicted) * 100;
      if (pctDeviation > 50) {
        anomalies.push({
          type: "TREND_DEVIATION",
          severity: pctDeviation > 80 ? "HIGH" : "MEDIUM",
          description: `${productName} latest demand deviates ${Math.round(pctDeviation)}% from the trend prediction (expected ~${Math.round(predicted)}, got ${actual}).`,
          expectedValue: Math.round(predicted),
          actualValue: actual,
          deviation: Math.round(pctDeviation),
        });
      }
    }
  }

  // 4. Sudden zero-demand detection
  if (quantities.length >= 3 && avg > 5) {
    const latest = quantities[quantities.length - 1];
    if (latest === 0) {
      anomalies.push({
        type: "SUDDEN_ZERO_DEMAND",
        severity: "HIGH",
        description: `${productName} had zero demand this month despite an average of ${Math.round(avg)} units — possible data issue or market change.`,
        expectedValue: Math.round(avg),
        actualValue: 0,
        deviation: 100,
      });
    }
  }

  return anomalies;
}
