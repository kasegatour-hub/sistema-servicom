import QRCode from "qrcode";
import { buildAdminDeclarationHtml, buildAdminDeliveryTicketHtml, buildAdminRouteSummaryHtml } from "./adminReceipt";
import { formatPhoneNumber } from "./phoneFormatting";
import { getPaymentPrintPresentation } from "./paymentPrint";
import { buildReceiptPriceHtml } from "./receiptPrice";
import { getRoutePresentation } from "./routeDetails";
import { buildElectronicSignatureHtml, buildReceiptDownloadFilename } from "./userReceipt";
import { buildShipmentDeliveryStatusUrl, buildTrackingUrl, TRACKING_QR_OPTIONS } from "./tracking";

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
  const route = getRoutePresentation(shipment.route);
  const payment = getPaymentPrintPresentation(shipment.paymentStatus);
  const checklist = getChecklist(shipment);
  const shipmentLabel = shipment.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO";
  const filename = buildReceiptDownloadFilename({ recipientName: shipment.recipientName, recipientLastName: shipment.recipientLastName, recipientDisplayName: recipient, orderNumber: order, shipmentType: shipment.shipmentType });
  const [trackingQrDataUrl, managementQrDataUrl] = await Promise.all([
    QRCode.toDataURL(buildTrackingUrl(order, code, input.origin), { ...TRACKING_QR_OPTIONS, width: 220, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
    QRCode.toDataURL(buildShipmentDeliveryStatusUrl(order, code, input.origin), { ...TRACKING_QR_OPTIONS, width: 160, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
  ]);
  const logoSrc = new URL("/manus-storage/servicom_logo_final_e7ce35aa.png", input.origin).href;
  const createdAt = new Date(shipment.createdAt || Date.now()).toLocaleString("es-PE");
  const today = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  const paymentHtml = `<strong>Estado de pago:</strong> <span style="color:${payment.paidColor};background:${payment.paidBackground};padding:2px 7px;border-radius:4px;font-weight:800">[${payment.isPaid ? "X" : " "}] Pagado</span> <span style="margin-left:12px;color:${payment.pendingColor};background:${payment.pendingBackground};padding:2px 7px;border-radius:4px;font-weight:800">[${payment.isPending ? "X" : " "}] No cancelado</span>`;
  const ticket = buildAdminDeliveryTicketHtml({
    order: escapeHtml(order), code: escapeHtml(code), recipient: escapeHtml(recipient), recipientPhone: escapeHtml(formatPhoneNumber(shipment.recipientPhone) || "No especificado"), recipientDni: escapeHtml(shipment.recipientDni || "No especificado"), sender: escapeHtml(sender), senderPhone: escapeHtml(formatPhoneNumber(shipment.senderPhone) || "No especificado"), senderDni: escapeHtml(shipment.senderDni || "No especificado"), notes: escapeHtml(shipment.notes || "Sin notas"), contentChecklist: checklist.map(escapeHtml), shipmentType: shipment.shipmentType, price: shipment, route: shipment.route, limaTorinoEncomiendasEnabled: input.limaTorinoEncomiendasEnabled, managementQrDataUrl,
  });
  const contentHtml = `<section class="receipt-page"><div class="header"><div><img class="brand-logo" src="${logoSrc}" alt="Servicom Internacional"><h1 class="company">SERVICOM INTERNACIONAL</h1><div class="subtitle">SERVICOM INTERNACIONAL</div><div class="ruc-contact">RUC: 20615004708 · ${escapeHtml(route.origin.phone)}<br>${escapeHtml(route.origin.address)}</div></div><div class="digital-seal"><div class="seal-title">FIRMADO DIGITALMENTE</div><strong>Titular:</strong> Servicom Internacional<br><strong>RUC:</strong> 20615004708<br><strong>Orden:</strong> ${escapeHtml(order)}<br><strong>Fecha:</strong> ${escapeHtml(createdAt)}</div></div><div class="main-title">INFORMACIÓN DE ENVÍO DE ${shipmentLabel} — ${escapeHtml(route.route)}</div>${buildAdminRouteSummaryHtml(shipment.route)}<div class="section"><div class="two-col"><div class="row"><div class="label">Orden:</div><div class="value">${escapeHtml(order)}</div></div><div class="row"><div class="label">Código:</div><div class="value">${escapeHtml(code)}</div></div></div></div><div class="section"><div class="section-title">Datos del remitente</div><div class="row"><div class="label">Remitente:</div><div class="value">${escapeHtml(sender)}</div></div><div class="two-col"><div class="row"><div class="label">Celular:</div><div class="value">${escapeHtml(formatPhoneNumber(shipment.senderPhone) || "No especificado")}</div></div><div class="row"><div class="label">Documento:</div><div class="value">${escapeHtml(shipment.senderDni || "No especificado")}</div></div></div></div><div class="section"><div class="section-title">Datos del destinatario</div><div class="row"><div class="label">Destinatario:</div><div class="value">${escapeHtml(recipient)}</div></div><div class="two-col"><div class="row"><div class="label">Celular:</div><div class="value">${escapeHtml(formatPhoneNumber(shipment.recipientPhone) || "No especificado")}</div></div><div class="row"><div class="label">Documento:</div><div class="value">${escapeHtml(shipment.recipientDni || "No especificado")}</div></div></div></div><div class="section"><div class="section-title">Estado de pago y descripción</div><div class="payment-box">${paymentHtml}<br><br><strong>Estado del envío:</strong> ${escapeHtml(shipment.status || "No especificado")}<br><strong>Notas:</strong> ${escapeHtml(shipment.notes || "Sin notas")}${buildReceiptPriceHtml(shipment)}</div></div><div class="qr-container"><div class="qr-box"><img src="${trackingQrDataUrl}" alt="QR de rastreo"><div>Escanea para rastrear el envío</div></div><div class="policies"><strong>POLÍTICAS:</strong><br>• Retiro: hasta 48h posterior a llegada.<br>• Almacenaje diario superado el plazo.<br>• Abandono: después de 30 días.<br>• Prohibido envío de ilícitos.</div></div></section><section class="receipt-page">${ticket}</section><section class="receipt-page"><div class="header"><div><img class="brand-logo" src="${logoSrc}" alt="Servicom Internacional"><h2 class="company" style="font-size:18px">SERVICOM INTERNACIONAL</h2></div><div class="digital-seal"><strong>RUC:</strong> 20615004708<br><strong>Orden:</strong> ${escapeHtml(order)}</div></div><div class="declaration-title">DECLARACIÓN JURADA DE CONTENIDO<br><span style="font-size:12px;font-weight:400">Y EXENCIÓN DE RESPONSABILIDAD LEGAL</span></div><div class="declaration">${buildAdminDeclarationHtml({ sender: escapeHtml(sender), senderDni: escapeHtml(shipment.senderDni || "No especificado"), order: escapeHtml(order), token: escapeHtml(code), today, route: shipment.route })}</div><div class="signature-area"><div class="signature-box"><div style="height:74px"></div><strong>Firma del remitente</strong><br>DNI/Pasaporte N° ${escapeHtml(shipment.senderDni || "No especificado")}<br><span style="font-size:8px">(Firmar sobre la línea de microimpresión)</span></div><div class="signature-box">${buildElectronicSignatureHtml(input.signature || shipment.signature, sender, shipment.senderDni || "")}</div></div><div class="dj-footer">Este anexo forma parte integral e indivisible de la Orden de Envío N° ${escapeHtml(order)}. Propiedad legal de Servicom Internacional.</div></section>`;
  return { filename, contentHtml, html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title><style>${ADMIN_RECEIPT_SHARED_STYLES}</style></head><body>${contentHtml}</body></html>` };
}

export async function downloadAdminReceiptPdf(input: AdminReceiptDocumentInput): Promise<string> {
  const { filename, contentHtml } = await buildAdminReceiptDocument(input);
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:210mm;background:#fff;z-index:-1";
  host.innerHTML = `<style>${ADMIN_RECEIPT_SHARED_STYLES}</style>${contentHtml}`;
  document.body.appendChild(host);
  try {
    const images = Array.from(host.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.addEventListener("load", () => resolve(), { once: true }); image.addEventListener("error", () => resolve(), { once: true }); })));
    const pages = Array.from(host.querySelectorAll<HTMLElement>(".receipt-page"));
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await html2canvas(pages[index], { scale: 1.5, useCORS: true, backgroundColor: "#ffffff", logging: false });
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }
    pdf.save(`${filename}.pdf`);
    return `${filename}.pdf`;
  } finally {
    host.remove();
  }
}
