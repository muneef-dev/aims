import {
  linearRegression,
  linearRegressionLine,
  rSquared,
} from "simple-statistics";

export interface ForecastResult {
  predictedDemand: number;
  forecastMonth: string;
  confidence: number;
  confidenceLabel: string;
  modelUsed: string;
  historicalData: { month: string; quantity: number }[];
  generatedAt: Date;
}

interface MonthlySalesRow {
  year: number;
  month: number;
  totalQuantity: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function getNextMonthLabel(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return formatMonthLabel(nextMonth.getFullYear(), nextMonth.getMonth() + 1);
}

function weightedMovingAverage(data: number[]): number {
  if (data.length === 0) return 0;
  if (data.length === 1) return data[0];

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < data.length; i++) {
    const weight = i + 1; // More recent months get higher weight
    weightedSum += data[i] * weight;
    totalWeight += weight;
  }

  return Math.max(0, Math.round(weightedSum / totalWeight));
}

function calculateConfidence(data: number[], prediction: number): number {
  if (data.length < 3) return Math.min(40, data.length * 15);

  // Calculate R² from linear regression
  const pairs: [number, number][] = data.map((val, i) => [i, val]);
  const regression = linearRegression(pairs);
  const line = linearRegressionLine(regression);
  const r2 = rSquared(pairs, line);

  // Factor in data quantity
  const dataBonus = Math.min(20, data.length * 2);

  // Confidence = base from R² + data bonus, capped at 95
  const confidence = Math.min(95, Math.round(r2 * 75 + dataBonus));
  return Math.max(5, confidence);
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 70) return "High Confidence";
  if (confidence >= 40) return "Moderate Confidence";
  return "Low Confidence";
}

export function generateForecastFromData(salesData: MonthlySalesRow[]): ForecastResult {
  if (salesData.length === 0) {
    throw new Error("NO_DATA");
  }

  // Sort by year then month
  const sorted = [...salesData].sort(
    (a, b) => a.year - b.year || a.month - b.month
  );

  const quantities = sorted.map((d) => d.totalQuantity);
  const historicalData = sorted.map((d) => ({
    month: formatMonthLabel(d.year, d.month),
    quantity: d.totalQuantity,
  }));

  let prediction: number;
  let modelUsed: string;

  if (sorted.length >= 3) {
    // Use linear regression
    const pairs: [number, number][] = quantities.map((val, i) => [i, val]);
    const regression = linearRegression(pairs);
    const line = linearRegressionLine(regression);
    prediction = Math.max(0, Math.round(line(quantities.length)));
    modelUsed = "Linear Trend Analysis";
  } else {
    // Use weighted moving average
    prediction = weightedMovingAverage(quantities);
    modelUsed = "Weighted Moving Average";
  }

  const confidence = calculateConfidence(quantities, prediction);

  return {
    predictedDemand: prediction,
    forecastMonth: getNextMonthLabel(),
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
    modelUsed,
    historicalData,
    generatedAt: new Date(),
  };
}
