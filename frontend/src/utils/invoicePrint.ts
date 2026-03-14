type PrintableInvoiceItem = {
  name: string;
  quantity: number;
  price: number;
  line_total: number;
  line_tax?: number;
};

export type PrintableInvoice = {
  invoice_id: number;
  customer_name: string;
  items: PrintableInvoiceItem[];
  subtotal?: number;
  tax_amount?: number;
  total_amount: number;
  payment_method?: string;
  change_due?: number | null;
  created_at?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const esc = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function printInvoiceDocument(invoice: PrintableInvoice) {
  const printWindow = window.open("", "_blank", "width=920,height=900");
  if (!printWindow) {
    alert("Pop-up blocked. Please allow pop-ups to print invoice.");
    return;
  }

  const now = new Date();
  const issuedAt = invoice.created_at
    ? new Date(invoice.created_at).toLocaleString()
    : now.toLocaleString();

  const rows = invoice.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${esc(item.name)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${money(item.price)}</td>
          <td class="num">${money(item.line_total)}</td>
        </tr>
      `
    )
    .join("");

  const subtotal = invoice.subtotal ?? invoice.total_amount;
  const tax = invoice.tax_amount ?? 0;

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${invoice.invoice_id}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #111827; margin: 0; }
    .sheet { width: 100%; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; margin-bottom: 16px; }
    .brand h1 { margin: 0; font-size: 22px; letter-spacing: 0.02em; }
    .brand p { margin: 4px 0 0; color: #4b5563; font-size: 12px; }
    .meta { text-align: right; font-size: 12px; color: #374151; }
    .meta p { margin: 2px 0; }
    .panel { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .card h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #4b5563; letter-spacing: 0.06em; }
    .card p { margin: 3px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; }
    th { background: #f3f4f6; text-align: left; }
    .num { text-align: right; white-space: nowrap; }
    .summary { margin-top: 16px; margin-left: auto; width: 320px; }
    .summary table th, .summary table td { border: none; border-bottom: 1px solid #e5e7eb; }
    .summary table th { background: transparent; color: #374151; font-weight: 600; }
    .summary table tr.total-row th, .summary table tr.total-row td { border-bottom: 2px solid #111827; font-size: 14px; font-weight: 700; color: #111827; }
    .footer { margin-top: 26px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-size: 11px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        <h1>SmartPOS</h1>
        <p>Retail Billing Invoice</p>
      </div>
      <div class="meta">
        <p><strong>Invoice:</strong> #${invoice.invoice_id}</p>
        <p><strong>Issued:</strong> ${esc(issuedAt)}</p>
      </div>
    </div>

    <div class="panel">
      <div class="card">
        <h3>Bill To</h3>
        <p><strong>${esc(invoice.customer_name)}</strong></p>
      </div>
      <div class="card">
        <h3>Payment</h3>
        <p><strong>Method:</strong> ${esc((invoice.payment_method ?? "N/A").toUpperCase())}</p>
        ${invoice.change_due != null ? `<p><strong>Change Due:</strong> ${money(invoice.change_due)}</p>` : ""}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 44px;">#</th>
          <th>Item</th>
          <th class="num" style="width: 70px;">Qty</th>
          <th class="num" style="width: 110px;">Unit Price</th>
          <th class="num" style="width: 130px;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="summary">
      <table>
        <tr>
          <th>Subtotal</th>
          <td class="num">${money(subtotal)}</td>
        </tr>
        <tr>
          <th>GST</th>
          <td class="num">${money(tax)}</td>
        </tr>
        <tr class="total-row">
          <th>Grand Total</th>
          <td class="num">${money(invoice.total_amount)}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      This is a computer-generated invoice and does not require a signature.
    </div>
  </div>

  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
