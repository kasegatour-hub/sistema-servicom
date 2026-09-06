type AccountingReportData = {
  periodLabel: string;
  routeLabel: string;
  workspace: { label: string };
  revenueEur: number;
  revenueUsd: number;
  revenuePen: number;
  manualExpenseEur: number;
  manualExpenseUsd: number;
  provinceCostPen: number;
  manualExpensePen: number;
  expensePen: number;
  penPerEur: number | null;
  expensePenConvertedEur: number | null;
  expenseEur: number;
  netEur: number;
  isNetEurConsolidated: boolean;
  shipmentCount: number;
  parcelCount: number;
  paidShipmentCount: number;
  shipments: Array<Record<string, any>>;
  parcelRows: Array<Record<string, any>>;
  expenses: Array<Record<string, any>>;
  monthly: Array<Record<string, any>>;
};

const money = (amount: number, currency: "EUR" | "USD" | "PEN") => new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2 }).format(Number(amount || 0));
const date = (value: unknown) => value ? new Date(value as string | Date).toLocaleDateString("es-PE") : "—";
const shipmentCurrency = (shipment: Record<string, any>): "EUR" | "USD" | "PEN" => shipment.manualPriceCurrency === "USD" ? "USD" : shipment.manualPriceCurrency === "PEN" || shipment.pricingCurrency === "PEN" ? "PEN" : "EUR";
const shipmentRecipient = (shipment: Record<string, any>) => `${shipment.recipientName || ""} ${shipment.recipientLastName || ""}`.trim() || "No indicado";
const filenameSegment = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function statementRows(report: AccountingReportData) {
  return [
    ["Ingresos cobrados EUR", money(report.revenueEur, "EUR")],
    ["Ingresos cobrados USD", money(report.revenueUsd, "USD")],
    ["Ingresos cobrados PEN", money(report.revenuePen, "PEN")],
    ["Gastos manuales EUR", money(report.manualExpenseEur, "EUR")],
    ["Gastos manuales USD", money(report.manualExpenseUsd, "USD")],
    ["Costo provincial automático", money(report.provinceCostPen, "PEN")],
    ["Gastos manuales", money(report.manualExpensePen, "PEN")],
    ["Total de egresos PEN", money(report.expensePen, "PEN")],
    ["Tipo de cambio PEN por EUR", report.penPerEur ? String(report.penPerEur) : "No indicado"],
    ["Egresos PEN convertidos", report.expensePenConvertedEur == null ? "No calculado" : money(report.expensePenConvertedEur, "EUR")],
    [report.isNetEurConsolidated ? "Utilidad neta consolidada" : "Utilidad EUR antes de convertir costos PEN", money(report.netEur, "EUR")],
  ];
}

export async function downloadAccountingExcel(report: AccountingReportData) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Estado de resultados simplificado"],
    ["Espacio", report.workspace.label],
    ["Periodo", report.periodLabel],
    ["Ruta", report.routeLabel],
    ["Envíos registrados", report.shipmentCount],
    ["Encomiendas", report.parcelCount],
    ["Envíos pagados", report.paidShipmentCount],
    [],
    ["Concepto", "Importe"],
    ...statementRows(report),
  ]);
  summarySheet["!cols"] = [{ wch: 38 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Estado de resultados");

  const parcelsSheet = XLSX.utils.json_to_sheet(report.parcelRows.map(shipment => ({
    "Fecha de registro": date(shipment.createdAt),
    "Orden": shipment.orderNumber,
    "Código": shipment.code,
    "Destinatario": shipmentRecipient(shipment),
    "Ruta": shipment.route || "—",
    "Estado": shipment.status || "—",
    "Pago": shipment.paymentStatus || "—",
    "Cobrado": Number(shipment.finalPriceEur ?? shipment.basePriceEur ?? 0),
    "Moneda cobrada": shipmentCurrency(shipment),
    "Costo provincial (PEN)": Number(shipment.provinceOperationalCostSoles ?? 0),
  })));
  parcelsSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 30 }, { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 17 }, { wch: 23 }];
  XLSX.utils.book_append_sheet(workbook, parcelsSheet, "Encomiendas");

  const expensesSheet = XLSX.utils.json_to_sheet(report.expenses.map(expense => ({
    "Fecha": date(expense.expenseDate),
    "Categoría": expense.category,
    "Monto": Number(expense.amount),
    "Moneda": expense.currency,
    "Descripción": expense.description,
    "Orden vinculada": report.shipments.find(shipment => shipment.id === expense.shipmentId)?.orderNumber || "—",
    "Registrado por": expense.createdByLabel || "—",
  })));
  expensesSheet["!cols"] = [{ wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 42 }, { wch: 18 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(workbook, expensesSheet, "Gastos manuales");

  if (report.monthly.length) {
    const monthlySheet = XLSX.utils.json_to_sheet(report.monthly.map(month => ({
      "Mes": month.periodLabel,
      "Ingresos EUR": month.revenueEur,
      "Ingresos USD": month.revenueUsd,
      "Ingresos PEN": month.revenuePen,
      "Egresos EUR": month.expenseEur,
      "Egresos PEN": month.expensePen,
      "Utilidad EUR": month.netEur,
      "Encomiendas": month.parcelCount,
    })));
    monthlySheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Meses");
  }

  XLSX.writeFile(workbook, `contabilidad-${filenameSegment(report.workspace.label)}-${filenameSegment(report.periodLabel)}.xlsx`);
}

export async function downloadAccountingPdf(report: AccountingReportData) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const pageWidth = 210;
  const left = 15;
  const maxWidth = 180;
  let y = 18;
  const ensureSpace = (height = 7) => {
    if (y + height <= 282) return;
    pdf.addPage();
    y = 18;
  };
  const line = (text: string, options?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    const size = options?.size ?? 10;
    pdf.setFont("helvetica", options?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...(options?.color ?? [51, 65, 85]));
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    ensureSpace(lines.length * (size * 0.45 + 1));
    pdf.text(lines, left, y);
    y += lines.length * (size * 0.45 + 1) + 2;
  };
  const rule = () => { ensureSpace(4); pdf.setDrawColor(203, 213, 225); pdf.line(left, y, pageWidth - left, y); y += 5; };

  line("SERVICOM INTERNACIONAL", { bold: true, size: 16, color: [11, 43, 94] });
  line("Estado de resultados simplificado", { bold: true, size: 13, color: [11, 43, 94] });
  line(`Espacio: ${report.workspace.label} · Periodo: ${report.periodLabel} · Ruta: ${report.routeLabel}`);
  line(`Envíos registrados: ${report.shipmentCount} · Encomiendas: ${report.parcelCount} · Envíos cobrados: ${report.paidShipmentCount}`);
  rule();
  statementRows(report).forEach(([label, value]) => line(`${label}: ${value}`, { bold: label.includes("Utilidad") }));
  if (!report.isNetEurConsolidated) line("Nota: la utilidad EUR no descuenta egresos PEN hasta que se indique un tipo de cambio.", { size: 9, color: [146, 64, 14] });
  rule();
  line("Relación de encomiendas del periodo", { bold: true, size: 12, color: [11, 43, 94] });
  if (!report.parcelRows.length) line("No hay encomiendas registradas en este periodo.");
  report.parcelRows.forEach((shipment, index) => {
    line(`${index + 1}. ${shipment.orderNumber} · ${shipment.code} · ${shipmentRecipient(shipment)} · ${shipment.status || "Sin estado"} · ${shipment.paymentStatus || "Sin pago"} · ${money(Number(shipment.finalPriceEur ?? shipment.basePriceEur ?? 0), shipmentCurrency(shipment))}`, { size: 9 });
  });
  rule();
  line("Gastos manuales del periodo", { bold: true, size: 12, color: [11, 43, 94] });
  if (!report.expenses.length) line("No hay gastos manuales registrados en este periodo.");
  report.expenses.forEach(expense => line(`${date(expense.expenseDate)} · ${expense.category} · ${money(Number(expense.amount), expense.currency)} · ${expense.description}`, { size: 9 }));
  pdf.save(`contabilidad-${filenameSegment(report.workspace.label)}-${filenameSegment(report.periodLabel)}.pdf`);
}
