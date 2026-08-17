import { buildTrackingUrl, TRACKING_QR_OPTIONS } from "./tracking";
import QRCode from "qrcode";
import { getReceiptTicketPrintCss } from "./printLayout";
import { getPaymentPrintPresentation } from "./paymentPrint";
import { buildReceiptPriceHtml, type ReceiptPriceData } from "./receiptPrice";
import { getDeclarationLegalText, getRoutePresentation, INSTITUTIONAL_DECLARATION_ENTITY } from "./routeDetails";
import { formatPhoneNumber } from "./phoneFormatting";
import { buildSignatureSvgMarkup } from "../../../shared/signature";

const brandLogoPath = "/manus-storage/servicom_logo_final_e7ce35aa.png";

const escapeHtml = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
const fullName = (name?: string | null, lastName?: string | null) => `${name ?? ""} ${lastName ?? ""}`.trim() || "No especificado";

export const resolveReceiptAssetUrl = (path: string, origin: string) => new URL(path, origin).href;
export const buildReceiptUrl = (origin: string, order: string, code: string) => {
  const url = new URL("/recibo", origin);
  url.searchParams.set("order", order);
  url.searchParams.set("code", code);
  return url.href;
};

export function buildReceiptDownloadFilename(data: {
  recipientName?: string | null;
  recipientLastName?: string | null;
  orderNumber?: string | number | null;
  shipmentType?: "documento" | "encomienda" | null;
}) {
  const recipient = fullName(data.recipientName, data.recipientLastName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "destinatario";
  const order = String(data.orderNumber ?? "sin-orden").replace(/[^a-zA-Z0-9-]/g, "") || "sin-orden";
  const type = data.shipmentType === "encomienda" ? "encomienda" : "documento";
  return `recibo-${type}-${recipient.toLowerCase()}-orden-${order}`;
}

export function getPaymentStatusPresentation(status?: string | null) {
  const normalizedStatus = typeof status === "string" ? status.trim() : "";
  const isPaid = normalizedStatus === "Pagado";
  const isPending = normalizedStatus === "Falta cancelar";
  const isMarked = isPaid || isPending;
  return {
    label: isPaid ? "Pagado" : isPending ? "No cancelado" : "Sin marcar",
    color: isPaid ? "#059669" : isPending ? "#e11d48" : "#000000",
    background: isPaid ? "#ecfdf5" : isPending ? "#fff1f2" : "transparent",
    isPaid,
    isPending,
    isMarked,
  };
}

export function buildReceiptPrintStyles() {
  return getReceiptTicketPrintCss(".ticket");
}

export function buildElectronicSignatureHtml(signature: any, fallbackSigner: string, fallbackDni: string) {
  if (!signature || signature.status !== "signed") {
    return `<div class="signature-remote signature-remote-pending"><div class="signature-remote-title">FIRMA ELECTRÓNICA DEL CLIENTE</div><strong>Pendiente de firma remota</strong><br><span style="font-size:9px;color:#555">El cliente puede firmar desde el recibo digital con su orden y código.</span></div>`;
  }

  const signer = escapeHtml(signature.signerName || fallbackSigner || "Cliente");
  const dni = escapeHtml(signature.signerDni || fallbackDni || "No especificado");
  const signedAt = signature.signedAt ? escapeHtml(new Date(signature.signedAt).toLocaleString("es-PE")) : "Fecha no disponible";
  let svg = "";
  try {
    svg = buildSignatureSvgMarkup(signature.signatureStrokes);
  } catch {
    svg = `<div class="signature-remote-fallback">Firma electrónica validada</div>`;
  }
  return `<div class="signature-remote signature-remote-signed"><div class="signature-remote-title">FIRMADO ELECTRÓNICAMENTE POR</div>${svg}<strong>${signer}</strong><br>DNI: ${dni}<br><span style="font-size:9px;color:#555">Fecha de firma: ${signedAt}</span><br><span style="font-size:9px;color:#555">Firma electrónica remota vinculada a la orden</span></div>`;
}

export function buildReceiptRouteSummaryHtml(routeValue?: string | null) {
  const route = getRoutePresentation(routeValue);
  return `<div class="section"><div class="section-title">Ruta y sedes</div><div class="grid"><div><span class="label">Origen:</span> <span class="line">${route.originPrintLabel} · ${route.origin.officeLabel}</span></div><div><span class="label">Destino:</span> <span class="line">${route.destinationPrintLabel} · ${route.destination.officeLabel}</span></div><div><span class="label">Dirección de entrega:</span> <span class="line">${route.destination.address}</span></div><div><span class="label">Contacto de sede:</span> <span class="line">${route.destination.phone}</span></div></div></div>`;
}

export function buildReceiptTicketHtml(data: {
  order: string;
  code: string;
  recipient: string;
  recipientPhone: string;
  recipientDni?: string;
  sender?: string;
  senderPhone?: string;
  senderDni?: string;
  notes?: string;
  shipmentType?: "documento" | "encomienda";
  price?: ReceiptPriceData;
  route?: string | null;
  contentChecklist?: string[];
}) {
  const route = getRoutePresentation(data.route);
  const shipmentLabel = data.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO";
  const priceHtml = buildReceiptPriceHtml(data.price || {});
  const checklist = (data.contentChecklist || []).map(item => String(item).trim()).filter(Boolean);
  const checklistHtml = checklist.length
    ? `<br><strong>LISTA DE COSAS ENVIADAS:</strong><ul style="margin:4px 0;padding-left:18px">${checklist.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";
  return `<div class="ticket"><div class="ticket-title">CONTROL DE ENTREGA — ${route.deliveryTitle} (${shipmentLabel})</div><div class="ticket-grid"><div><strong>INFORMACIÓN DE ENVÍO DE ${shipmentLabel}</strong><br><strong>ORDEN:</strong> ${data.order}<br><strong>CÓDIGO:</strong> ${data.code}<br><strong>RUTA:</strong> ${route.route}<br><strong>ORIGEN:</strong> ${route.originPrintLabel}<br><strong>DESTINO:</strong> ${route.destinationPrintLabel}<br><strong>SEDE DE ENTREGA:</strong> ${route.destination.officeLabel}<br><strong>DIRECCIÓN:</strong> ${route.destination.address}<br><strong>REMITENTE:</strong> ${data.sender || "No especificado"}<br><strong>CELULAR REMITENTE:</strong> ${data.senderPhone || "No especificado"}<br><strong>DNI REMITENTE:</strong> ${data.senderDni || "No especificado"}<br><strong>DESTINATARIO:</strong> ${data.recipient}<br><strong>CELULAR DESTINATARIA:</strong> ${data.recipientPhone}<br><strong>DNI DESTINATARIO:</strong> ${data.recipientDni || "No especificado"}<br><strong>NOTAS:</strong> ${escapeHtml(data.notes || "Sin notas")}${checklistHtml}${priceHtml}</div><div class="ticket-code">${data.code}</div></div></div>`;
}

const absoluteAssetUrl = (path: string) => resolveReceiptAssetUrl(path, window.location.origin);

async function loadLogoSource(): Promise<string> {
  const url = absoluteAssetUrl(brandLogoPath);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Logo HTTP ${response.status}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function waitForPopupReady(printWindow: Window): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      try {
        if (printWindow.closed) { reject(new Error("La ventana del recibo fue cerrada.")); return; }
        if (printWindow.document.readyState === "complete") { resolve(); return; }
      } catch {
        // La ventana todavía está navegando; se vuelve a comprobar enseguida.
      }
      if (Date.now() - startedAt > 5000) { resolve(); return; }
      window.setTimeout(check, 50);
    };
    check();
  });
}

async function waitForImages(documentRef: Document): Promise<void> {
  const images = Array.from(documentRef.images);
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}

export async function printUserShipmentReceipt(shipment: any): Promise<void> {
  if (!shipment?.orderNumber || !shipment?.code) return;

  const receiptHref = buildReceiptUrl(window.location.origin, String(shipment.orderNumber), String(shipment.code));
  const printWindow = window.open(receiptHref, "_blank", "width=900,height=900");
  if (!printWindow) { window.alert("Permite las ventanas emergentes para abrir el recibo."); return; }

  // Esperar la navegación real para que el encabezado/pie de impresión nunca use about:blank.
  try {
    await waitForPopupReady(printWindow);
  } catch (error) {
    printWindow.close();
    console.error("La ventana del recibo se cerró antes de cargar", error);
    return;
  }
  printWindow.document.open();
  printWindow.document.write("<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>Preparando recibo — Servicom Internacional</title></head><body style=\"font-family:Arial,sans-serif;padding:32px;color:#0B2B5E\">Preparando recibo de Servicom Internacional…</body></html>");
  printWindow.document.close();

  try {
    const trackingUrl = buildTrackingUrl(shipment.orderNumber, shipment.code);
    const [logoSrc, qrSrc] = await Promise.all([
      loadLogoSource(),
      QRCode.toDataURL(trackingUrl, { ...TRACKING_QR_OPTIONS, width: 150, margin: 1, color: { dark: "#0B2B5E", light: "#ffffff" } }),
    ]);
    const order = escapeHtml(shipment.orderNumber);
    const code = escapeHtml(shipment.code);
    const sender = escapeHtml(fullName(shipment.senderName, shipment.senderLastName));
    const recipient = escapeHtml(fullName(shipment.recipientName, shipment.recipientLastName));
    const senderPhone = escapeHtml(formatPhoneNumber(shipment.senderPhone) || "No especificado");
    const senderDni = escapeHtml(shipment.senderDni || "No especificado");
    const recipientPhone = escapeHtml(formatPhoneNumber(shipment.recipientPhone) || "No especificado");
    const recipientDni = escapeHtml(shipment.recipientDni || "No especificado");
    const notes = escapeHtml(shipment.notes || "Documentación lícita");
    const contentChecklist = (() => {
      if (Array.isArray(shipment.contentChecklist)) return shipment.contentChecklist.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0);
      if (typeof shipment.contentChecklist !== "string") return [];
      try {
        const parsed = JSON.parse(shipment.contentChecklist);
        return Array.isArray(parsed) ? parsed.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
      } catch {
        return [];
      }
    })();
    const checklistHtml = contentChecklist.length
      ? `<div class="section"><div class="section-title">Lista de cosas enviadas</div><div class="content"><ul style="margin:0;padding-left:18px">${contentChecklist.map((item: string) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div>`
      : "";
    const createdAt = new Date(shipment.createdAt || Date.now()).toLocaleString("es-PE");
    const today = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
    const paymentPresentation = getPaymentStatusPresentation(shipment.paymentStatus);
    const paymentPrint = getPaymentPrintPresentation(shipment.paymentStatus);
    const routePresentation = getRoutePresentation(shipment.route);
    const declarationLegal = getDeclarationLegalText(shipment.route);
    const paymentStatus = paymentPresentation.label;
    const isPaid = paymentPrint.isPaid;
    const paidOptionColor = paymentPrint.paidColor;
    const paidOptionBackground = paymentPrint.paidBackground;
    const pendingOptionColor = paymentPrint.pendingColor;
    const pendingOptionBackground = paymentPrint.pendingBackground;

    const downloadFilename = buildReceiptDownloadFilename({
      recipientName: shipment.recipientName,
      recipientLastName: shipment.recipientLastName,
      orderNumber: order,
      shipmentType: shipment.shipmentType,
    });
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(downloadFilename)}</title><style>
${buildReceiptPrintStyles()}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:30px;color:#0B2B5E;line-height:1.4}.price-highlight{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;margin-top:10px;padding:8px 10px;border-left:5px solid #F28C00;background:#fff7ed;color:#0B2B5E}.price-label{font-size:10px;font-weight:700;letter-spacing:.08em}.price-value{font-size:18px;color:#ea580c;font-weight:800}.price-base{font-size:10px;color:#64748b}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:3px solid #F28C00;padding-bottom:14px}.logo{width:150px;height:82px;object-fit:contain;object-position:left center}.company{font-size:24px;font-weight:700;margin:5px 0 0}.subtitle{color:#F28C00;font-weight:700;font-size:13px}.contact{color:#555;font-size:10px;margin-top:6px}.seal{border:2px solid #0B2B5E;border-radius:8px;padding:10px;min-width:190px;font-size:10px}.seal-title{font-weight:700;text-align:center;border-bottom:1px solid #0B2B5E;padding-bottom:4px;margin-bottom:5px}.title{text-align:center;background:#f4f6f8;padding:10px;margin:20px 0;font-size:19px;font-weight:700}.section{margin:15px 0}.section-title{border-left:4px solid #F28C00;padding-left:8px;font-weight:700;text-transform:uppercase;margin-bottom:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;font-size:12px}.line{border-bottom:1px dotted #aaa;min-height:20px}.label{font-weight:700;color:#444}.content{min-height:52px;border:1px solid #ddd;padding:8px;font-size:12px}.qr-wrap{display:flex;justify-content:space-around;align-items:center;gap:20px;background:#fafafa;border:1px solid #e5e7eb;padding:14px;margin-top:20px}.qr-box{text-align:center;font-size:10px;color:#555}#qr{width:150px;height:150px;display:block}.ticket{border:2px dashed #0B2B5E;margin-top:35px;padding:14px;position:relative}.ticket:before{content:"✂ RECORTAR Y ADJUNTAR AL FOLDER MANILA";position:absolute;top:-12px;left:16px;background:white;padding:0 7px;color:#0B2B5E;font-size:10px;font-weight:700}.ticket-title{text-align:center;font-weight:700;margin-bottom:10px}.ticket-grid{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;font-size:11px}.ticket-code{border:2px solid #0B2B5E;padding:6px 12px;font-size:16px;font-weight:700;text-align:center}.declaration-title{text-align:center;margin:10px 0 20px;font-size:20px;font-weight:700}.declaration{font-size:11.5px;text-align:justify;line-height:1.6}.signature-area{display:flex;justify-content:space-between;gap:45px;margin-top:45px}.signature{flex:1;text-align:center;padding-top:8px;font-size:11px}.signature-remote{width:45%;text-align:center;border-top:1px dashed #000;padding-top:8px;font-size:11px}.signature-remote-pending{color:#64748b}.signature-remote-signed{color:#0B2B5E}.signature-remote-title{font-weight:700;margin-bottom:8px}.electronic-signature-svg{display:block;width:100%;height:82px;margin:0 auto 8px}.signature-remote-fallback{border:1px solid #0B2B5E;padding:12px;margin:8px 0;font-weight:700}.fingerprint{width:90px;height:110px;border:1px solid #000;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#777}.footer{text-align:center;font-size:9px;color:#888;margin-top:25px}</style></head><body>
	<section><div class="header"><div><img class="logo" src="${logoSrc}" alt="Servicom Internacional"><div class="company">SERVICOM INTERNACIONAL</div><div class="subtitle">SERVICOM INTERNACIONAL</div><div class="contact">RUC: 20615004708 · ${routePresentation.origin.phone}</div></div><div class="seal"><div class="seal-title">RECIBO DE ENVÍO</div><strong>Orden:</strong> ${order}<br><strong>Cód. envío:</strong> ${code}<br><strong>Fecha:</strong> ${createdAt}</div></div>
	<div class="title">INFORMACIÓN DE ENVÍO DE ${shipment.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO"} — ${routePresentation.route}</div>${buildReceiptRouteSummaryHtml(shipment.route)}<div class="section"><div class="section-title">Remitente</div><div class="grid"><div><span class="label">Nombre:</span> <span class="line">${sender}</span></div><div><span class="label">DNI/RUC:</span> <span class="line">${senderDni}</span></div><div><span class="label">Celular:</span> <span class="line">${senderPhone}</span></div></div></div><div class="section"><div class="section-title">Destinatario</div><div class="grid"><div><span class="label">Nombre:</span> <span class="line">${recipient}</span></div><div><span class="label">DNI/C.I.:</span> <span class="line">${recipientDni}</span></div><div><span class="label">Celular:</span> <span class="line">${recipientPhone}</span></div></div></div><div class="section"><div class="section-title">Estado de Pago y Descripción</div><div class="content" style="font-size:12px"><strong>Estado de Pago:</strong> <span style="display:inline-block;font-weight:bold"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${paidOptionBackground};color:${paidOptionColor}">[${isPaid ? 'X' : ' '}] Pagado</span>&nbsp;&nbsp;&nbsp;<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${pendingOptionBackground};color:${pendingOptionColor}">[${paymentPresentation.isPending ? 'X' : ' '}] No cancelado</span></span><br><br><strong>NOTAS:</strong> ${notes}</div></div>${checklistHtml}<div class="qr-wrap"><div class="qr-box"><img id="qr" src="${qrSrc}" alt="Código QR de rastreo"><div>Escanea para rastrear el envío</div></div><div style="font-size:11px;max-width:310px">${buildReceiptPriceHtml(shipment)}<br><strong>Estado de pago:</strong> ${paymentStatus}<br><strong>Estado del envío:</strong> ${escapeHtml(shipment.status || "En agencia")}</div></div>${buildReceiptTicketHtml({ order, code, recipient, recipientPhone, recipientDni, sender, senderPhone, senderDni, notes, shipmentType: shipment.shipmentType, price: shipment, route: shipment.route, contentChecklist })}</section>
<section class="page-break"><div class="header"><div><img class="logo" src="${logoSrc}" alt="Servicom Internacional"><div class="company">SERVICOM INTERNACIONAL</div><div class="subtitle">SERVICOM INTERNACIONAL</div></div><div class="seal">RUC: 20615004708<br>Orden: ${order}</div></div><div class="declaration-title">DECLARACIÓN JURADA DE CONTENIDO<br><span style="font-size:16px;font-weight:normal">Y EXENCIÓN DE RESPONSABILIDAD LEGAL</span></div><div class="declaration"><p>Yo, <strong>${sender}</strong>, identificado(a) con documento de identidad N° <strong>${senderDni}</strong>, en pleno uso de mis facultades, declaro bajo juramento que el envío amparado bajo la Orden N° <strong>${order}</strong> (Token de seguridad: ${code}) contiene <strong>ÚNICA Y ESTRICTAMENTE DOCUMENTACIÓN LÍCITA</strong>.</p><p>${declarationLegal.guarantee}</p><p>${declarationLegal.authorities}</p><p>En consecuencia, eximo expresa, legal y totalmente de cualquier implicancia, investigación, responsabilidad operativa o financiera a la empresa <strong>${INSTITUTIONAL_DECLARATION_ENTITY}</strong>. Asimismo, autorizo de manera irrevocable la apertura, revisión física detallada y escaneo del presente envío por parte de la agencia o las autoridades competentes sin necesidad de mi presencia ni notificación previa.</p><p>${declarationLegal.originLine} ${today}. <strong>${INSTITUTIONAL_DECLARATION_ENTITY}</strong>.</p></div><div class="signature-area"><div class="signature"><div style="font-size:3px;color:#666;letter-spacing:1px;margin-bottom:12px;user-select:none">SERVICOM-INTERNACIONAL-DOCUMENTO-LEGAL-AUTENTICO-SERVICOM-INTERNACIONAL-DOCUMENTO-LEGAL-AUTENTICO-SERVICOM-INTERNACIONAL-DOCUMENTO-LEGAL-AUTENTICO</div><strong>Firma del Remitente</strong><br>DNI/Pasaporte N° ${senderDni}<br><span style="font-size:9px;color:#555">(Firmar sobre la línea de microimpresión)</span></div>${buildElectronicSignatureHtml(shipment.signature, sender, senderDni)}</div><div class="footer">Este anexo forma parte integral e indivisible de la Orden de Envío N° ${order}. Propiedad legal de Servicom Internacional</div></section></body></html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    await waitForImages(printWindow.document);
    await new Promise((resolve) => setTimeout(resolve, 150));
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    printWindow.close();
    window.alert("No se pudo preparar el recibo. Inténtalo nuevamente.");
    console.error("Error al preparar recibo", error);
  }
}
