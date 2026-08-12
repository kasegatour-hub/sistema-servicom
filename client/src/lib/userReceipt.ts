import { buildTrackingUrl, TRACKING_QR_OPTIONS } from "./tracking";
import QRCode from "qrcode";

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
    const senderPhone = escapeHtml(shipment.senderPhone || "No especificado");
    const senderDni = escapeHtml(shipment.senderDni || "No especificado");
    const recipientPhone = escapeHtml(shipment.recipientPhone || "No especificado");
    const recipientDni = escapeHtml(shipment.recipientDni || "No especificado");
    const notes = escapeHtml(shipment.notes || "Documentación lícita");
    const createdAt = new Date(shipment.createdAt || Date.now()).toLocaleString("es-PE");
    const today = new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
    const shortCode = escapeHtml(String(shipment.code).split("-").pop());

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo ${order} - Servicom Internacional</title><style>
@media print{.page-break{page-break-before:always}}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:30px;color:#0B2B5E;line-height:1.4}.header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:3px solid #F28C00;padding-bottom:14px}.logo{width:150px;height:82px;object-fit:contain;object-position:left center}.company{font-size:24px;font-weight:700;margin:5px 0 0}.subtitle{color:#F28C00;font-weight:700;font-size:13px}.contact{color:#555;font-size:10px;margin-top:6px}.seal{border:2px solid #0B2B5E;border-radius:8px;padding:10px;min-width:190px;font-size:10px}.seal-title{font-weight:700;text-align:center;border-bottom:1px solid #0B2B5E;padding-bottom:4px;margin-bottom:5px}.title{text-align:center;background:#f4f6f8;padding:10px;margin:20px 0;font-size:19px;font-weight:700}.section{margin:15px 0}.section-title{border-left:4px solid #F28C00;padding-left:8px;font-weight:700;text-transform:uppercase;margin-bottom:8px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;font-size:12px}.line{border-bottom:1px dotted #aaa;min-height:20px}.label{font-weight:700;color:#444}.content{min-height:52px;border:1px solid #ddd;padding:8px;font-size:12px}.qr-wrap{display:flex;justify-content:space-around;align-items:center;gap:20px;background:#fafafa;border:1px solid #e5e7eb;padding:14px;margin-top:20px}.qr-box{text-align:center;font-size:10px;color:#555}#qr{width:150px;height:150px;display:block}.ticket{border:2px dashed #0B2B5E;margin-top:35px;padding:14px;position:relative}.ticket:before{content:"✂ RECORTAR Y ADJUNTAR AL FOLDER MANILA";position:absolute;top:-12px;left:16px;background:white;padding:0 7px;color:#0B2B5E;font-size:10px;font-weight:700}.ticket-title{text-align:center;font-weight:700;margin-bottom:10px}.ticket-grid{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;font-size:11px}.ticket-code{border:2px solid #0B2B5E;padding:7px;font-size:20px;font-weight:700}.declaration-title{text-align:center;margin:10px 0 20px;font-size:20px;font-weight:700}.declaration{font-size:11.5px;text-align:justify;line-height:1.6}.signature-area{display:flex;justify-content:space-between;gap:45px;margin-top:45px}.signature{flex:1;text-align:center;padding-top:8px;font-size:11px}.fingerprint{width:90px;height:110px;border:1px solid #000;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#777}.footer{text-align:center;font-size:9px;color:#888;margin-top:25px}</style></head><body>
<section><div class="header"><div><img class="logo" src="${logoSrc}" alt="Servicom Internacional"><div class="company">SERVICOM INTERNACIONAL</div><div class="subtitle">SERVICOM INTERNACIONAL</div><div class="contact">RUC: 20615004708 · peruservicom@gmail.com · +51 970 188 447 / +51 908 722 617 · 01 390 7269</div></div><div class="seal"><div class="seal-title">RECIBO DE ENVÍO</div><strong>Orden:</strong> ${order}<br><strong>Cód. envío:</strong> ${code}<br><strong>Fecha:</strong> ${createdAt}</div></div>
<div class="title">INFORMACIÓN DE ENVÍO DE DOCUMENTO</div><div class="section"><div class="section-title">Remitente</div><div class="grid"><div><span class="label">Nombre:</span> <span class="line">${sender}</span></div><div><span class="label">DNI/RUC:</span> <span class="line">${senderDni}</span></div><div><span class="label">Celular:</span> <span class="line">${senderPhone}</span></div></div></div><div class="section"><div class="section-title">Destinatario</div><div class="grid"><div><span class="label">Nombre:</span> <span class="line">${recipient}</span></div><div><span class="label">DNI/C.I.:</span> <span class="line">${recipientDni}</span></div><div><span class="label">Celular:</span> <span class="line">${recipientPhone}</span></div></div></div><div class="section"><div class="section-title">Descripción y tarifa</div><div class="content">${notes}</div></div><div class="qr-wrap"><div class="qr-box"><img id="qr" src="${qrSrc}" alt="Código QR de rastreo"><div>Escanea para rastrear el envío</div></div><div style="font-size:11px;max-width:310px"><strong>Tarifa documental:</strong> 50 € por documentos apostillados, traducidos o legalizados. Se agregan 10 € por cada documento adicional de la misma naturaleza.<br><br><strong>Estado inicial:</strong> ${escapeHtml(shipment.status || "En agencia")}</div></div><div class="ticket"><div class="ticket-title">CONTROL DE ENTREGA — TORINO, ITALIA</div><div class="ticket-grid"><div><strong>ORDEN:</strong> ${order}<br><strong>DESTINO:</strong> TORINO, ITALIA<br><strong>RECEPTOR:</strong> ${recipient}</div><div class="ticket-code">${shortCode}</div></div></div></section>
<section class="page-break"><div class="header"><div><img class="logo" src="${logoSrc}" alt="Servicom Internacional"><div class="company">SERVICOM INTERNACIONAL</div><div class="subtitle">SERVICOM INTERNACIONAL</div></div><div class="seal">RUC: 20615004708<br>Orden: ${order}</div></div><div class="declaration-title">DECLARACIÓN JURADA DE CONTENIDO<br><span style="font-size:16px;font-weight:normal">Y EXENCIÓN DE RESPONSABILIDAD LEGAL</span></div><div class="declaration"><p>Yo, <strong>${sender}</strong>, identificado(a) con documento de identidad N° <strong>${senderDni}</strong>, en pleno uso de mis facultades, declaro bajo juramento que el envío amparado bajo la Orden N° <strong>${order}</strong> (Token de seguridad: ${code}) contiene <strong>ÚNICA Y ESTRICTAMENTE DOCUMENTACIÓN LÍCITA</strong>.</p><p>Garantizo formalmente que los documentos entregados a la agencia no ocultan, no camuflan, ni se encuentran impregnados de sustancias estupefacientes, alcaloides, dinero en efectivo no declarado, ni ningún material prohibido por la legislación penal de la República del Perú (incluyendo de forma explícita la Ley N° 28002 - Ley que penaliza el Tráfico Ilícito de Drogas) y los convenios aduaneros internacionales vigentes.</p><p>Mediante mi firma y huella dactilar estampada en el presente documento, asumo la <strong>responsabilidad penal, civil y administrativa absoluta e indelegable</strong> ante la Policía Nacional del Perú (DIRANDRO), SUNAT/Aduanas, Ministerio Público y cualquier autoridad judicial nacional o extranjera en caso de detectarse alteraciones, camuflajes o sustancias ilícitas en mi envío.</p><p>En consecuencia, eximo expresa, legal y totalmente de cualquier implicancia, investigación, responsabilidad operativa o financiera a la empresa <strong>Servicom Internacional</strong> (RUC: 20615004708). Asimismo, autorizo de manera irrevocable la apertura, revisión física detallada y escaneo del presente envío por parte de la agencia o las autoridades competentes sin necesidad de mi presencia ni notificación previa.</p><p>Suscrito en la ciudad de Lima, el ${today}.</p></div><div class="signature-area"><div class="signature"><div style="font-size:3px;color:#666;letter-spacing:1px;margin-bottom:12px;user-select:none">SERVICOM-INTERNACIONAL-DOCUMENTO-LEGAL-AUTENTICO-SERVICOM-INTERNACIONAL-DOCUMENTO-LEGAL-AUTENTICO-SERVICOM-INTERNACIONAL-DOCUMENTO-LEGAL-AUTENTICO</div><strong>Firma del Remitente</strong><br>DNI/Pasaporte N° ${senderDni}<br><span style="font-size:9px;color:#555">(Firmar sobre la línea de microimpresión)</span></div><div style="width:35%;text-align:center;font-size:11px"><div class="fingerprint">Huella Dactilar<br>(Índice Derecho)</div><strong>Huella Dactilar</strong><br><span style="font-size:9px;color:#555">(Índice Derecho)</span></div></div><div class="footer">Este anexo forma parte integral e indivisible de la Orden de Envío N° ${order}. Propiedad legal de Servicom Internacional</div></section></body></html>`;

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
