const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function alertEmailHtml(product: {
  name: string;
  sku: string;
  currentStock: number;
  minStockLevel: number;
  alertType: "OUT_OF_STOCK" | "LOW_STOCK" | "OVERSTOCK";
}) {
  const isOut = product.alertType === "OUT_OF_STOCK";
  const isOverstock = product.alertType === "OVERSTOCK";
  const color = isOut ? "#DC2626" : isOverstock ? "#2563EB" : "#D97706";
  const label = isOut ? "Out of Stock" : isOverstock ? "Overstock" : "Low Stock";

  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
    <h2 style="color:${color};margin-bottom:8px;">${isOut ? "🚨" : isOverstock ? "📦" : "⚠️"} ${label}: ${product.name}</h2>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Product</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${product.name}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">SKU</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${product.sku}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Current Stock</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;color:${color};">${product.currentStock}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Minimum Stock</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${product.minStockLevel}</td></tr>
    </table>
    <a href="${APP_URL}/inventory" style="display:inline-block;padding:10px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:6px;margin-top:8px;">View in AIMS</a>
  </div>`;
}

export function weeklyReportEmailHtml(stats: {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockNames: string[];
  outOfStockNames: string[];
}) {
  const items = [
    ...stats.outOfStockNames.map((n) => `<li style="color:#DC2626;">🚨 ${n} — Out of Stock</li>`),
    ...stats.lowStockNames.map((n) => `<li style="color:#D97706;">⚠️ ${n} — Low Stock</li>`),
  ];

  return `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
    <h2 style="margin-bottom:4px;">📊 AIMS Weekly Inventory Report</h2>
    <p style="color:#6b7280;margin-top:0;">${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">Total Active Products</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${stats.totalProducts}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">Low Stock Products</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#D97706;">${stats.lowStockCount}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">Out of Stock Products</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#DC2626;">${stats.outOfStockCount}</td></tr>
    </table>
    ${items.length > 0 ? `<h3 style="margin-bottom:8px;">Products Needing Attention</h3><ul style="padding-left:20px;">${items.join("")}</ul>` : "<p>All stock levels are healthy! ✅</p>"}
    <a href="${APP_URL}/login" style="display:inline-block;padding:10px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:6px;margin-top:12px;">Login to AIMS</a>
  </div>`;
}
