import { generateForecastFromData } from "@/lib/forecasting/engine";

describe("Forecasting Engine", () => {
  describe("generateForecastFromData", () => {
    it("throws NO_DATA error when given empty array", () => {
      expect(() => generateForecastFromData([])).toThrow("NO_DATA");
    });

    it("returns a forecast with single data point using weighted moving average", () => {
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 50 },
      ]);

      expect(result.predictedDemand).toBe(50);
      expect(result.modelUsed).toBe("Weighted Moving Average");
      expect(result.confidence).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeLessThanOrEqual(40);
      expect(result.historicalData).toHaveLength(1);
    });

    it("returns a forecast with two data points using weighted moving average", () => {
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 30 },
        { year: 2025, month: 2, totalQuantity: 60 },
      ]);

      expect(result.predictedDemand).toBeGreaterThan(0);
      expect(result.modelUsed).toBe("Weighted Moving Average");
      expect(result.historicalData).toHaveLength(2);
    });

    it("uses linear regression with 3+ data points", () => {
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 10 },
        { year: 2025, month: 2, totalQuantity: 20 },
        { year: 2025, month: 3, totalQuantity: 30 },
      ]);

      expect(result.modelUsed).toBe("Linear Trend Analysis");
      expect(result.predictedDemand).toBeGreaterThanOrEqual(30);
    });

    it("detects upward trend correctly", () => {
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 12 },
        { year: 2025, month: 2, totalQuantity: 15 },
        { year: 2025, month: 3, totalQuantity: 18 },
        { year: 2025, month: 4, totalQuantity: 20 },
        { year: 2025, month: 5, totalQuantity: 22 },
        { year: 2025, month: 6, totalQuantity: 25 },
      ]);

      expect(result.predictedDemand).toBeGreaterThan(25);
      expect(result.confidence).toBeGreaterThanOrEqual(40);
      expect(result.confidenceLabel).toMatch(/High|Moderate/);
    });

    it("never returns negative predicted demand", () => {
      // Declining trend that could extrapolate negative
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 10 },
        { year: 2025, month: 2, totalQuantity: 5 },
        { year: 2025, month: 3, totalQuantity: 2 },
      ]);

      expect(result.predictedDemand).toBeGreaterThanOrEqual(0);
    });

    it("confidence is capped at 95", () => {
      // Strong upward trend → high R² → should be capped at 95
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 10 },
        { year: 2025, month: 2, totalQuantity: 20 },
        { year: 2025, month: 3, totalQuantity: 30 },
        { year: 2025, month: 4, totalQuantity: 40 },
        { year: 2025, month: 5, totalQuantity: 50 },
        { year: 2025, month: 6, totalQuantity: 60 },
        { year: 2025, month: 7, totalQuantity: 70 },
        { year: 2025, month: 8, totalQuantity: 80 },
        { year: 2025, month: 9, totalQuantity: 90 },
        { year: 2025, month: 10, totalQuantity: 100 },
        { year: 2025, month: 11, totalQuantity: 110 },
        { year: 2025, month: 12, totalQuantity: 120 },
      ]);

      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it("provides correct confidence labels", () => {
      // Low confidence — very few data points
      const low = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 10 },
      ]);
      expect(low.confidenceLabel).toBe("Low Confidence");

      // Higher confidence with more consistent data
      const high = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 100 },
        { year: 2025, month: 2, totalQuantity: 102 },
        { year: 2025, month: 3, totalQuantity: 104 },
        { year: 2025, month: 4, totalQuantity: 106 },
        { year: 2025, month: 5, totalQuantity: 108 },
        { year: 2025, month: 6, totalQuantity: 110 },
        { year: 2025, month: 7, totalQuantity: 112 },
        { year: 2025, month: 8, totalQuantity: 114 },
        { year: 2025, month: 9, totalQuantity: 116 },
        { year: 2025, month: 10, totalQuantity: 118 },
        { year: 2025, month: 11, totalQuantity: 120 },
        { year: 2025, month: 12, totalQuantity: 122 },
      ]);
      expect(high.confidenceLabel).toBe("High Confidence");
    });

    it("sorts data chronologically regardless of input order", () => {
      const result = generateForecastFromData([
        { year: 2025, month: 3, totalQuantity: 30 },
        { year: 2025, month: 1, totalQuantity: 10 },
        { year: 2025, month: 2, totalQuantity: 20 },
      ]);

      expect(result.historicalData[0].month).toContain("January");
      expect(result.historicalData[1].month).toContain("February");
      expect(result.historicalData[2].month).toContain("March");
    });

    it("includes forecastMonth as next calendar month", () => {
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 50 },
      ]);

      // forecastMonth should be a valid "Month YYYY" string
      expect(result.forecastMonth).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    });

    it("returns a generatedAt timestamp", () => {
      const before = new Date();
      const result = generateForecastFromData([
        { year: 2025, month: 1, totalQuantity: 50 },
      ]);
      const after = new Date();

      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
