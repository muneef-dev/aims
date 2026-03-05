import {
  formatCurrency,
  formatDate,
  getStockStatus,
  getStockColor,
} from "@/lib/utils";

describe("Utility Functions", () => {
  describe("formatCurrency", () => {
    it("formats amount in LKR with two decimals", () => {
      const result = formatCurrency(1500);
      expect(result).toContain("1,500.00");
      expect(result).toMatch(/LKR|Rs/);
    });

    it("handles zero", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0.00");
    });

    it("formats large numbers with commas", () => {
      const result = formatCurrency(1234567.89);
      expect(result).toMatch(/1[,.]234[,.]567\.89/);
    });

    it("handles decimal amounts", () => {
      const result = formatCurrency(99.5);
      expect(result).toContain("99.50");
    });
  });

  describe("formatDate", () => {
    it("formats a date string in en-GB locale", () => {
      const result = formatDate("2025-06-15T10:30:00Z");
      // en-GB: DD MMM YYYY, HH:MM
      expect(result).toMatch(/15/);
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/2025/);
    });

    it("formats a Date object", () => {
      const result = formatDate(new Date(2025, 0, 5, 14, 30));
      expect(result).toMatch(/05/);
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/2025/);
    });
  });

  describe("getStockStatus", () => {
    it("returns 'out' when stock is 0", () => {
      expect(getStockStatus(0, 10)).toBe("out");
    });

    it("returns 'low' when stock equals min level", () => {
      expect(getStockStatus(10, 10)).toBe("low");
    });

    it("returns 'low' when stock is below min level", () => {
      expect(getStockStatus(5, 10)).toBe("low");
    });

    it("returns 'normal' when stock is above min level", () => {
      expect(getStockStatus(15, 10)).toBe("normal");
    });

    it("returns 'normal' when stock is well above min level", () => {
      expect(getStockStatus(100, 10)).toBe("normal");
    });
  });

  describe("getStockColor", () => {
    it("returns red classes for 'out' status", () => {
      const result = getStockColor("out");
      expect(result).toContain("red");
    });

    it("returns amber classes for 'low' status", () => {
      const result = getStockColor("low");
      expect(result).toContain("amber");
    });

    it("returns green classes for 'normal' status", () => {
      const result = getStockColor("normal");
      expect(result).toContain("green");
    });
  });
});
