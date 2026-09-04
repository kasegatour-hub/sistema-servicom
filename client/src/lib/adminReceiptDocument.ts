import QRCode from "qrcode";
import { buildAdminDeclarationHtml, buildAdminDeliveryTicketHtml, buildAdminRouteSummaryHtml } from "./adminReceipt";
import { formatPhoneNumber } from "./phoneFormatting";
import { getPaymentPrintPresentation } from "./paymentPrint";
import { buildReceiptPriceHtml } from "./receiptPrice";
import { getRoutePresentation } from "./routeDetails";
import { buildElectronicSignatureHtml, buildReceiptDownloadFilename, getReceiptBranding } from "./userReceipt";
import { buildShipmentDeliveryStatusUrl, buildTrackingUrl, TRACKING_QR_OPTIONS } from "./tracking";
import { getIdentityDocumentLabel } from "@shared/identityDocuments";
import { formatShipmentAmount } from "@shared/bcrpPricing";

type AdminReceiptDocumentInput = {
  shipment: any;
  signature?: any;
  limaTorinoEncomiendasEnabled?: boolean;
  origin: string;
};

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const CANVAS_SAFE_LOGO_FALLBACK = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="272" height="136" viewBox="0 0 272 136"><rect width="272" height="136" rx="12" fill="white"/><path d="M18 18h236v8H18z" fill="#f28c00"/><text x="136" y="72" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="800" fill="#0b2b5e">SERVICOM</text><text x="136" y="101" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" fill="#475569">INTERNACIONAL</text></svg>')}`;

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No se pudo leer el logo."));
  reader.onerror = () => reject(new Error("No se pudo leer el logo."));
  reader.readAsDataURL(blob);
});

async function prepareReceiptImagesForCanvas(host: HTMLElement) {
  const images = Array.from(host.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(images.map(async (image) => {
    if (image.src.startsWith("data:")) return;
    const originalSource = image.src;
    try {
      const response = await fetch(originalSource, { credentials: "same-origin" });
      if (!response.ok) throw new Error("No se pudo obtener el logo.");
      const logoBlob = await response.blob();
      if (!logoBlob.type.startsWith("image/")) throw new Error("El logo no es una imagen válida.");
      image.src = await blobToDataUrl(logoBlob);
    } catch {
      // Evita que una imagen remota o sin CORS invalide el canvas y bloquee toda la descarga.
      image.src = CANVAS_SAFE_LOGO_FALLBACK;
    }
  }));
}

const getChecklist = (shipment: any): string[] => {
  if (Array.isArray(shipment?.contentChecklist)) return shipment.contentChecklist.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0);
  if (typeof shipment?.contentChecklist !== "string") return [];
  try {
    const parsed = JSON.parse(shipment.contentChecklist);
    return Array.isArray(parsed) ? parsed.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
};

export const ADMIN_RECEIPT_SHARED_STYLES = `
  *{box-sizing:border-box} body{margin:0;background:#fff;color:#0B2B5E;font-family:Arial,Helvetica,sans-serif;line-height:1.35}
  .receipt-page{width:210mm;min-height:297mm;padding:16mm 18mm 14mm;page-break-after:always;background:#fff}.receipt-page:last-child{page-break-after:auto}
  .header{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:2px solid #F28C00;padding-bottom:10px}.brand-logo{width:136px;height:68px;object-fit:contain;object-position:left center;display:block;margin-bottom:5px}.company{font-size:22px;font-weight:800;margin:0}.subtitle{font-size:11px;color:#F28C00;font-weight:800;margin-top:2px}.ruc-contact{font-size:9px;color:#475569;margin-top:5px}.digital-seal{border:2px solid #0B2B5E;border-radius:8px;padding:8px;min-width:176px;font-size:9px}.seal-title{font-weight:800;text-align:center;border-bottom:1px solid #0B2B5E;padding-bottom:3px;margin-bottom:4px}.main-title{text-align:center;font-size:15px;font-weight:800;background:#f4f6f8;padding:8px;margin:15px 0}.section{margin:11px 0}.section-title{border-left:4px solid #F28C00;padding-left:7px;font-size:11px;font-weight:800;text-transform:uppercase;margin-bottom:6px}.row{display:flex;gap:5px;margin:3px 0;font-size:10px}.label{width:140px;flex:0 0 140px;font-weight:800;color:#334155}.value{flex:1;border-bottom:1px dotted #cbd5e1;min-height:15px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:7px 18px}.payment-box{border:1px solid #e2e8f0;background:#fafafa;padding:8px;font-size:10px}.price-highlight{display:flex;align-items:baseline;gap:8px;margin-top:9px;padding:7px 9px;border-left:5px solid #F28C00;background:#fff7ed}.price-label{font-size:9px;font-weight:800;letter-spacing:.06em}.price-value{font-size:16px;color:#ea580c;font-weight:800}.price-base{font-size:9px;color:#64748b}.qr-container{display:flex;justify-content:space-between;align-items:center;gap:18px;border:1px solid #e2e8f0;background:#fafafa;padding:10px;margin-top:14px}.qr-box{text-align:center;font-size:9px;color:#475569}.qr-box img{display:block;width:118px;height:118px;margin:auto}.policies{font-size:9px;line-height:1.45;max-width:280px}.cut-ticket{height:auto;border:2px dashed #0B2B5E;padding:14px;position:relative;margin-top:6px}.cut-icon{position:absolute;top:-13px;left:16px;background:#fff;padding:0 5px;font-size:17px}.ticket-header{text-align:center;font-size:12px;font-weight:800;margin-bottom:10px}.ticket-grid{display:grid;grid-template-columns:1fr 138px;gap:10px;align-items:start}.ticket-code{border:2px solid #0B2B5E;padding:7px;font-size:14px;font-weight:800;text-align:center}.declaration-title{text-align:center;margin:9px 0 20px;font-size:16px;font-weight:800}.declaration{font-size:10.5px;text-align:justify;line-height:1.55}.signature-area{display:flex;justify-content:space-between;gap:38px;margin-top:40px}.signature-box{flex:1;text-align:center;border-top:1px dashed #0B2B5E;padding-top:8px;font-size:9px}.fingerprint-box{width:90px;height:110px;border:1px solid #0B2B5E;margin:0 auto 7px}.dj-footer{text-align:center;font-size:8px;color:#64748b;margin-top:30px}.signature-remote{border-top:1px dashed #0B2B5E;padding-top:8px;text-align:center;font-size:9px}.signature-remote-title{font-weight:800;margin-bottom:6px}.electronic-signature-svg{display:block;width:100%;height:70px;margin:0 auto 5px}.signature-remote-fallback{border:1px solid #0B2B5E;padding:8px;font-weight:800}
  @media print{body{background:#fff}.receipt-page{break-after:page;page-break-after:always}.receipt-page:last-child{break-after:auto;page-break-after:auto}.cut-ticket{break-inside:avoid;page-break-inside:avoid}}
`;

export async function buildAdminReceiptDocument(input: AdminReceiptDocumentInput) {
  const { shipment } = input;
  if (!shipment?.orderNumber || !shipment?.code) throw new Error("Faltan la orden o el código del envío.");
  const order = String(shipment.orderNumber);
  const code = String(shipment.code);
  const sender = `${shipment.senderName || ""} ${shipment.senderLastName || ""}`.trim() || "No especificado";
  const recipient = `${shipment.recipientName || ""} ${shipment.recipientLastName || ""}`.trim() || "No especificado";
  const branding = getReceiptBranding(shipment);
  const route = getRoutePresentation(shipment.route, branding.isKasega ? branding.destinationAddress : shipment.destinationAddress);
  const receiptPhone = branding.isKasega ? branding.phone : route.origin.phone;
  const receiptAddress = branding.isKasega ? branding.address : route.origin.address;
  const payment = getPaymentPrintPresentation(shipment.paymentStatus);
  const checklist = getChecklist(shipment);
  const shipmentLabel = shipment.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO";
  const filename = buildReceiptDownloadFilename({ recipientName: shipment.recipientName, recipientLastName: shipment.recipientLastName, recipientDisplayName: recipient, orderNumber: order, shipmentType: shipment.shipmentType });
  const [trackingQrDataUrl, managementQrDataUrl] = await Promise.all([
    QRCode.toDataURL(buildTrackingUrl(order, code, input.origin), { ...TRACKING_QR_OPTIONS, width: 220, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
    QRCode.toDataURL(buildShipmentDeliveryStatusUrl(order, code, input.origin), { ...TRACKING_QR_OPTIONS, width: 160, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
  ]);
  const logoSrc = new URL(branding.logoPath, input.origin).href;
  const createdAt = new Date(shipment.createdAt || Date.now()).toLocaleString("es-PE");
  const today = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const paymentHtml = `<strong>Estado de pago:</strong> <span style="color:${payment.paidColor};background:${payment.paidBackground};padding:2px 7px;border-radius:4px;font-weight:800">[${payment.isPaid ? "X" : " "}] Pagado</span> <span style="margin-left:12px;color:${payment.pendingColor};background:${payment.pendingBackground};padding:2px 7px;border-radius:4px;font-weight:800">[${payment.isPending ? "X" : " "}] No cancelado</span>`;
  const ticket = buildAdminDeliveryTicketHtml({
    order: escapeHtml(order), code: escapeHtml(code), recipient: escapeHtml(recipient), recipientPhone: escapeHtml(formatPhoneNumber(shipment.recipientPhone) || "No especificado"), recipientDni: escapeHtml(shipment.recipientDni || "No especificado"), sender: escapeHtml(sender), senderPhone: escapeHtml(formatPhoneNumber(shipment.senderPhone) || "No especificado"), senderDni: escapeHtml(shipment.senderDni || "No especificado"), notes: escapeHtml(shipment.notes || "Sin notas"), contentChecklist: checklist.map(escapeHtml),     shipmentType: shipment.shipmentType, price: shipment, paymentStatus: shipment.paymentStatus, route: shipment.route, destinationAddress: shipment.destinationAddress, limaTorinoEncomiendasEnabled: input.limaTorinoEncomiendasEnabled, managementQrDataUrl, requiresApostilleService: shipment.requiresApostilleService, requiresTranslationService: shipment.requiresTranslationService, isProvinceDelivery: shipment.isProvinceDelivery, provinceCarrier: shipment.provinceCarrier, provinceSenderName: escapeHtml(shipment.provinceSenderName || ""), provinceSenderLastName: escapeHtml(shipment.provinceSenderLastName || ""), provinceSenderDni: escapeHtml(shipment.provinceSenderDni || ""), provinceSenderPhone: escapeHtml(formatPhoneNumber(shipment.provinceSenderPhone) || ""), limaTorinoTransferMode: shipment.limaTorinoTransferMode, deliveryPersonName: escapeHtml(shipment.deliveryPersonName || ""), deliveryPersonLastName: escapeHtml(shipment.deliveryPersonLastName || ""), deliveryPersonDni: escapeHtml(shipment.deliveryPersonDni || ""), deliveryPersonPhone: escapeHtml(formatPhoneNumber(shipment.deliveryPersonPhone) || ""), deliveryLocationType: shipment.deliveryLocationType, deliveryLocationAddress: escapeHtml(shipment.deliveryLocationAddress || ""), brandLogoPath: branding.logoPath, brandName: branding.companyName, brandRuc: branding.ruc,
  });
  const apostilleHtml = shipment.requiresApostilleService === true || Number(shipment.requiresApostilleService) === 1 ? `<br><strong>Servicio solicitado:</strong> Documentos para apostillar` : "";
  const contentHtml = `<section class="receipt-page"><div class="header"><div><img class="brand-logo" src="${logoSrc}" alt="${escapeHtml(branding.companyName)}"><h1 class="company">${escapeHtml(branding.companyName)}</h1><div class="subtitle">${escapeHtml(branding.subtitle)}</div><div class="ruc-contact">RUC: ${escapeHtml(branding.ruc)} · ${escapeHtml(receiptPhone)}<br>${escapeHtml(receiptAddress)}</div></div><div class="digital-seal"><div class="seal-title">FIRMADO DIGITALMENTE</div><strong>Titular:</strong> ${escapeHtml(branding.companyName)}<br><strong>RUC:</strong> ${escapeHtml(branding.ruc)}<br><strong>Orden:</strong> ${escapeHtml(order)}<br><strong>Fecha:</strong> ${escapeHtml(createdAt)}</div></div><div class="main-title">INFORMACIÓN DE ENVÍO DE ${shipmentLabel} — ${escapeHtml(route.route)}</div>${buildAdminRouteSummaryHtml(shipment.route, branding.isKasega ? branding.destinationAddress : shipment.destinationAddress, branding.isKasega ? branding.address : null, branding.isKasega ? branding.phone : null)}<div class="section"><div class="two-col"><div class="row"><div class="label">Orden:</div><div class="value">${escapeHtml(order)}</div></div><div class="row"><div class="label">Código:</div><div class="value">${escapeHtml(code)}</div></div></div></div><div class="section"><div class="section-title">Datos del remitente</div><div class="row"><div class="label">Remitente:</div><div class="value">${escapeHtml(sender)}</div></div><div class="two-col"><div class="row"><div class="label">Celular:</div><div class="value">${escapeHtml(formatPhoneNumber(shipment.senderPhone) || "No especificado")}</div></div><div class="row"><div class="label">Documento:</div><div class="value">${escapeHtml(shipment.senderDni || "No especificado")}</div></div></div></div><div class="section"><div class="section-title">Datos del destinatario</div><div class="row"><div class="label">Destinatario:</div><div class="value">${escapeHtml(recipient)}</div></div><div class="two-col"><div class="row"><div class="label">Celular:</div><div class="value">${escapeHtml(formatPhoneNumber(shipment.recipientPhone) || "No especificado")}</div></div><div class="row"><div class="label">Documento:</div><div class="value">${escapeHtml(shipment.recipientDni || "No especificado")}</div></div></div></div><div class="section"><div class="section-title">Estado de pago y descripción</div><div class="payment-box">${paymentHtml}<br><br><strong>Estado del envío:</strong> ${escapeHtml(shipment.status || "No especificado")}${apostilleHtml}<br><strong>Notas:</strong> ${escapeHtml(shipment.notes || "Sin notas")}${buildReceiptPriceHtml(shipment)}</div></div><div class="qr-container"><div class="qr-box"><img src="${trackingQrDataUrl}" alt="QR de rastreo"><div>Escanea para rastrear el envío</div></div><div class="policies"><strong>POLÍTICAS:</strong><br>• Retiro: hasta 48h posterior a llegada.<br>• Almacenaje diario superado el plazo.<br>• Abandono: después de 30 días.<br>• Prohibido envío de ilícitos.</div></div></section><section class="receipt-page">${ticket}</section><section class="receipt-page"><div class="header"><div><img class="brand-logo" src="${logoSrc}" alt="${escapeHtml(branding.companyName)}"><h2 class="company" style="font-size:18px">${escapeHtml(branding.companyName)}</h2></div><div class="digital-seal"><strong>RUC:</strong> ${escapeHtml(branding.ruc)}<br><strong>Orden:</strong> ${escapeHtml(order)}</div></div><div class="declaration-title">DECLARACIÓN JURADA DE CONTENIDO<br><span style="font-size:12px;font-weight:400">Y EXENCIÓN DE RESPONSABILIDAD LEGAL</span></div><div class="declaration">${buildAdminDeclarationHtml({ sender: escapeHtml(sender), senderDni: escapeHtml(shipment.senderDni || "No especificado"), order: escapeHtml(order), token: escapeHtml(code), today, route: shipment.route, companyName: branding.companyName, shipmentStatus: shipment.status, paymentStatus: shipment.paymentStatus })}</div><div class="signature-area"><div class="signature-box"><div style="height:74px"></div><strong>Firma del remitente</strong><br>DNI/Pasaporte N° ${escapeHtml(shipment.senderDni || "No especificado")}<br><span style="font-size:8px">(Firmar sobre la línea de microimpresión)</span></div><div class="signature-box">${buildElectronicSignatureHtml(input.signature || shipment.signature, sender, shipment.senderDni || "")}</div></div><div class="dj-footer">Este anexo forma parte integral e indivisible de la Orden de Envío N° ${escapeHtml(order)}. Propiedad legal de ${escapeHtml(branding.companyName)}.</div></section>`;
  return { filename, contentHtml, html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title><style>${ADMIN_RECEIPT_SHARED_STYLES}</style></head><body>${contentHtml}</body></html>` };
}

/**
 * La descarga PDF usa el mismo documento HTML que la impresión. El navegador
 * abre el diálogo nativo «Guardar como PDF», por lo que no existe una segunda
 * maqueta de jsPDF que pueda divergir visualmente.
 */
export async function downloadAdminReceiptUsingPrintTemplate(input: AdminReceiptDocumentInput): Promise<string> {
  const receiptDocument = await buildAdminReceiptDocument(input);
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) throw new Error("Permite las ventanas emergentes para guardar el comprobante como PDF.");
  try {
    printWindow.document.open();
    printWindow.document.write(receiptDocument.html);
    printWindow.document.close();
    printWindow.document.title = receiptDocument.filename;
    await Promise.all(Array.from(printWindow.document.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
    const closePrintWindow = () => { if (!printWindow.closed) printWindow.close(); };
    printWindow.onafterprint = closePrintWindow;
    printWindow.focus();
    printWindow.print();
    window.setTimeout(closePrintWindow, 1200);
    return `${receiptDocument.filename}.pdf`;
  } catch (error) {
    printWindow.close();
    throw error;
  }
}

export async function downloadAdminReceiptPdf(input: AdminReceiptDocumentInput, options?: { printWindow?: Window | null }): Promise<string> {
  const { shipment } = input;
  if (!shipment?.orderNumber || !shipment?.code) throw new Error("Faltan la orden o el código del envío.");
  const { jsPDF } = await import("jspdf");
  const order = String(shipment.orderNumber);
  const code = String(shipment.code);
  const sender = `${shipment.senderName || ""} ${shipment.senderLastName || ""}`.trim() || "No especificado";
  const recipient = `${shipment.recipientName || ""} ${shipment.recipientLastName || ""}`.trim() || "No especificado";
  const branding = getReceiptBranding(shipment);
  const route = getRoutePresentation(shipment.route, branding.isKasega ? branding.destinationAddress : shipment.destinationAddress);
  const paymentLabel = shipment.paymentStatus === "Pagado" ? "Pagado" : shipment.paymentStatus === "Falta cancelar" ? "No cancelado" : "Sin marcar";
  const shipmentLabel = shipment.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO";
  const apostilleRows: Array<[string, string]> = shipment.requiresApostilleService === true || Number(shipment.requiresApostilleService) === 1 ? [["Servicio solicitado", "Documentos para apostillar"]] : [];
  const filename = `${buildReceiptDownloadFilename({ recipientName: shipment.recipientName, recipientLastName: shipment.recipientLastName, recipientDisplayName: recipient, orderNumber: order, shipmentType: shipment.shipmentType })}.pdf`;
  const shipmentSignature = input.signature || shipment.signature;
  const [trackingQr, deliveryQr] = await Promise.all([
    QRCode.toDataURL(buildTrackingUrl(order, code, input.origin), { ...TRACKING_QR_OPTIONS, width: 220, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
    QRCode.toDataURL(buildShipmentDeliveryStatusUrl(order, code, input.origin), { ...TRACKING_QR_OPTIONS, width: 180, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
  ]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const left = 16;
  const right = 194;
  const width = right - left;
  const topBrand = (subtitle: string) => {
    pdf.setFillColor(11, 43, 94);
    pdf.rect(0, 0, 210, 28, "F");
    pdf.setFillColor(242, 140, 0);
    pdf.rect(left, 7, 16, 14, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.text("SI", left + 8, 16, { align: "center" });
    pdf.setFontSize(16);
    pdf.text(branding.companyName, left + 21, 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(subtitle, left + 21, 20);
    pdf.setTextColor(11, 43, 94);
  };
  const addSection = (title: string, y: number) => {
    pdf.setFillColor(242, 140, 0);
    pdf.rect(left, y - 4, 2.5, 7, "F");
    pdf.setTextColor(11, 43, 94);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.text(title.toUpperCase(), left + 5, y);
    return y + 7;
  };
  const addRows = (rows: Array<[string, string]>, startY: number) => {
    let y = startY;
    rows.forEach(([label, value]) => {
      const valueLines = pdf.splitTextToSize(value || "No especificado", 116);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`${label}:`, left, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(15, 23, 42);
      pdf.text(valueLines, left + 44, y);
      y += Math.max(5.5, valueLines.length * 4.2 + 1);
    });
    return y;
  };

  topBrand(`${branding.companyName} · RUC ${branding.ruc}`);
  let y = 39;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(`INFORMACIÓN DE ENVÍO DE ${shipmentLabel}`, left, y);
  y += 10;
  y = addSection("Ruta y comprobante", y);
  y = addRows([["Ruta", route.route], ["Orden", order], ["Código", code], ["Estado", String(shipment.status || "No especificado")], ["Estado de pago", paymentLabel], ...apostilleRows], y);
  y = addSection("Datos del remitente", y + 4);
  y = addRows([["Remitente", sender], [getIdentityDocumentLabel(shipment.senderDocumentType), String(shipment.senderDni || "No especificado")], ["Celular", formatPhoneNumber(shipment.senderPhone) || "No especificado"]], y);
  y = addSection("Datos del destinatario", y + 4);
  y = addRows([["Destinatario", recipient], [getIdentityDocumentLabel(shipment.recipientDocumentType), String(shipment.recipientDni || "No especificado")], ["Celular", formatPhoneNumber(shipment.recipientPhone) || "No especificado"], ["Sede de entrega", `${route.destinationPrintLabel} · ${route.destination.officeLabel}`], ["Dirección", route.destination.address]], y);
  y = addSection("Contenido y precio", y + 4);
  const checklist = getChecklist(shipment);
  y = addRows([["Lista de cosas", checklist.length ? checklist.join(" · ") : "Sin ítems registrados"], ["Notas", String(shipment.notes || "Sin notas")], ["Precio final", formatShipmentAmount(Number(shipment.finalPriceEur ?? shipment.basePriceEur ?? 0), shipment)]], y);
  // QR y políticas deben permanecer en la primera hoja, junto con el comprobante.
  y = Math.min(y, 230);
  pdf.addImage(trackingQr, "PNG", left, y + 2, 35, 35);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(11, 43, 94);
  pdf.text("Escanea para rastrear el envío", left + 43, y + 15);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Orden ${order} · Código ${code}`, left + 43, y + 22);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("POLÍTICAS:", left + 78, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.text([
    "• Retiro: hasta 48h posterior a llegada.",
    "• Almacenaje diario superado el plazo.",
    "• Abandono: después de 30 días.",
    "• Prohibido envío de ilícitos.",
  ], left + 78, y + 14);

  pdf.addPage();
  topBrand(`Control de entrega · ${route.route}`);
  y = 40;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(`CONTROL DE ENTREGA — ${route.deliveryTitle}`, left, y);
  y = addSection(`Información de envío de ${shipmentLabel}`, y + 12);
  y = addRows([["Orden", order], ["Código", code], ["Ruta", route.route], ...apostilleRows, ["Remitente", sender], ["Celular remitente", formatPhoneNumber(shipment.senderPhone) || "No especificado"], ["Destinatario", recipient], ["Celular destinatario", formatPhoneNumber(shipment.recipientPhone) || "No especificado"], ["Notas", String(shipment.notes || "Sin notas")], ["Precio final", formatShipmentAmount(Number(shipment.finalPriceEur ?? shipment.basePriceEur ?? 0), shipment)]], y);
  pdf.addImage(deliveryQr, "PNG", right - 45, 208, 38, 38);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("QR para actualizar estado", right - 26, 252, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("Recortar y adjuntar al envío", right - 26, 258, { align: "center" });

  pdf.addPage();
  topBrand(`Declaración jurada · RUC ${branding.ruc}`);
  y = 46;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("DECLARACIÓN JURADA DE CONTENIDO", 105, y, { align: "center" });
  pdf.setFontSize(11);
  pdf.text("Y EXENCIÓN DE RESPONSABILIDAD LEGAL", 105, y + 7, { align: "center" });
  y += 22;
  const declaration = [
    `Yo, ${sender}, identificado(a) con documento N° ${shipment.senderDni || "No especificado"}, declaro bajo juramento que el envío amparado bajo la Orden N° ${order} (Código: ${code}) contiene única y estrictamente documentación lícita.`,
    "Garantizo que el envío no contiene sustancias ilícitas, dinero no declarado ni materiales prohibidos por la legislación aplicable y los convenios aduaneros internacionales vigentes.",
    `Eximo expresa y legalmente de responsabilidad a ${branding.companyName}. Autorizo la revisión física y el escaneo del envío por la agencia y autoridades competentes.`,
    `Suscrito en ${route.originPrintLabel}, el ${new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}.`,
  ];
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  declaration.forEach((paragraph) => {
    const lines = pdf.splitTextToSize(paragraph, width);
    pdf.text(lines, left, y);
    y += lines.length * 4.8 + 7;
  });
  y += 18;
  pdf.setDrawColor(11, 43, 94);
  pdf.line(left, y, left + 70, y);
  pdf.line(right - 70, y, right, y);
  pdf.setFontSize(8.5);
  pdf.text("Firma del remitente", left + 35, y + 6, { align: "center" });
  if (shipmentSignature?.status === "signed") {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(11, 43, 94);
    pdf.text("FIRMA ELECTRÓNICA DEL CLIENTE", right - 35, y - 8, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(`Firmado por: ${String(shipmentSignature.signerName || sender)}`, right - 35, y + 2, { align: "center" });
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(11, 43, 94);
    pdf.text("FIRMA ELECTRÓNICA DEL CLIENTE", right - 35, y + 6, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("Pendiente de firma remota", right - 35, y + 12, { align: "center" });
  }
  if (options?.printWindow) {
    const printWindow = options.printWindow;
    printWindow.location.href = String(pdf.output("bloburl"));
    window.setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    }, 500);
  } else {
    pdf.save(filename);
  }
  return filename;
}

export async function printAdminReceiptPdf(input: AdminReceiptDocumentInput): Promise<string> {
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) throw new Error("Permite las ventanas emergentes para imprimir el comprobante.");
  try {
    return await downloadAdminReceiptPdf(input, { printWindow });
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
