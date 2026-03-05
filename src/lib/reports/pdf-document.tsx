import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9 },
  header: { marginBottom: 20, textAlign: "center" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666" },
  table: { width: "100%" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    color: "#fff",
    padding: 6,
    fontWeight: "bold",
  },
  tableRow: { flexDirection: "row", padding: 6, borderBottom: "1px solid #e2e8f0" },
  rowRed: { backgroundColor: "#fef2f2" },
  rowAmber: { backgroundColor: "#fffbeb" },
  col1: { width: "20%" },
  col2: { width: "10%" },
  col3: { width: "14%" },
  col4: { width: "10%", textAlign: "right" },
  col5: { width: "10%", textAlign: "right" },
  col6: { width: "10%", textAlign: "right" },
  col7: { width: "12%", textAlign: "right" },
  col8: { width: "14%" },
  summary: { marginTop: 20, padding: 12, backgroundColor: "#f8fafc", borderRadius: 4 },
  summaryTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
});

interface ProductRow {
  name: string;
  sku: string;
  categoryName: string | null;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitSellingPrice: number;
  supplierName: string | null;
}

interface Props {
  products: ProductRow[];
}

export function InventoryReportDocument({ products }: Props) {
  const totalProducts = products.length;
  const outOfStock = products.filter((p) => p.currentStock === 0).length;
  const lowStock = products.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel
  ).length;
  const totalUnits = products.reduce((sum, p) => sum + p.currentStock, 0);

  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>AIMS — Inventory Report</Text>
          <Text style={styles.subtitle}>Generated on {now}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Product Name</Text>
            <Text style={styles.col2}>SKU</Text>
            <Text style={styles.col3}>Category</Text>
            <Text style={styles.col4}>Stock</Text>
            <Text style={styles.col5}>Min</Text>
            <Text style={styles.col6}>Max</Text>
            <Text style={styles.col7}>Price (LKR)</Text>
            <Text style={styles.col8}>Supplier</Text>
          </View>

          {products.map((p, i) => {
            const isOut = p.currentStock === 0;
            const isLow = !isOut && p.currentStock <= p.minStockLevel;
            return (
              <View
                key={i}
                style={[
                  styles.tableRow,
                  isOut ? styles.rowRed : isLow ? styles.rowAmber : {},
                ]}
              >
                <Text style={styles.col1}>{p.name}</Text>
                <Text style={styles.col2}>{p.sku}</Text>
                <Text style={styles.col3}>{p.categoryName ?? "—"}</Text>
                <Text style={styles.col4}>{p.currentStock}</Text>
                <Text style={styles.col5}>{p.minStockLevel}</Text>
                <Text style={styles.col6}>{p.maxStockLevel}</Text>
                <Text style={styles.col7}>{p.unitSellingPrice.toFixed(2)}</Text>
                <Text style={styles.col8}>{p.supplierName ?? "—"}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text>Total Products: {totalProducts}</Text>
            <Text>Low Stock: {lowStock}</Text>
            <Text>Out of Stock: {outOfStock}</Text>
            <Text>Total Units: {totalUnits}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
