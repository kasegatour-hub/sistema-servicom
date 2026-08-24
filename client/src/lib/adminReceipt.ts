import { getReceiptTicketPrintCss } from "./printLayout";
import { getDeclarationLegalText, getRoutePresentation, INSTITUTIONAL_DECLARATION_ENTITY } from "./routeDetails";
import { buildReceiptPriceHtml, type ReceiptPriceData } from "./receiptPrice";
import { formatPhoneNumber } from "./phoneFormatting";

export function buildAdminReceiptPrintStyles() {
  return getReceiptTicketPrintCss(".cut-ticket");
}

export function buildAdminDeclarationHtml(data: {
  sender: string;
  senderDni: string;
  order: string;
  token: string;
  today: string;
  route?: string | null;
}) {
  const legal = getDeclarationLegalText(data.route);
  return `<p>Yo, <strong>${data.sender}</strong>, identificado(a) con documento de identidad N° <strong>${data.senderDni}</strong>, en pleno uso de mis facultades, declaro bajo juramento que el envío amparado bajo la Orden N° <strong>${data.order}</strong> (Token de seguridad: ${data.token}) contiene <strong>ÚNICA Y ESTRICTAMENTE DOCUMENTACIÓN LÍCITA</strong>.</p><p>${legal.guarantee}</p><p>${legal.authorities}</p><p>En consecuencia, eximo expresa, legal y totalmente de cualquier implicancia, investigación, responsabilidad operativa o financiera a la empresa <strong>${INSTITUTIONAL_DECLARATION_ENTITY}</strong>. Asimismo, autorizo de manera irrevocable la apertura, revisión física detallada y escaneo del presente envío por parte de la agencia o las autoridades competentes sin necesidad de mi presencia ni notificación previa.</p><p>${legal.originLine} ${data.today}. <strong>${INSTITUTIONAL_DECLARATION_ENTITY}</strong>.</p>`;
}

export function buildAdminRouteSummaryHtml(routeValue?: string | null, destinationAddress?: string | null) {
  const route = getRoutePresentation(routeValue, destinationAddress);
  return `<div class="section"><div class="section-title">Ruta y sedes</div><div class="row"><div class="label">Origen:</div><div class="value">${route.originPrintLabel} · ${route.origin.officeLabel}</div></div><div class="row"><div class="label">Destino:</div><div class="value">${route.destinationPrintLabel} · ${route.destination.officeLabel}</div></div><div class="row"><div class="label">Dirección de entrega:</div><div class="value">${route.destination.address}</div></div><div class="row"><div class="label">Contacto de sede:</div><div class="value">${route.destination.phone}</div></div></div>`;
}

export function buildAdminDeliveryTicketHtml(data: {
  order: string;
  code: string;
  recipient: string;
  recipientPhone: string;
  recipientDni?: string;
  sender?: string;
  senderPhone?: string;
  senderDni?: string;
  notes?: string;
  contentChecklist?: string[];
  shipmentType?: "documento" | "encomienda";
  price?: ReceiptPriceData;
  route?: string;
  destinationAddress?: string | null;
  limaTorinoEncomiendasEnabled?: boolean;
  managementUrl?: string;
  managementQrDataUrl?: string;
  requiresApostilleService?: boolean | number;
  requiresTranslationService?: boolean | number;
  isProvinceDelivery?: boolean | number;
  provinceCarrier?: "olva" | "shalom" | "fedex" | "dhl" | null;
}) {
  const route = getRoutePresentation(data.route, data.destinationAddress);
  const shipmentLabel = data.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO";
  const priceHtml = buildReceiptPriceHtml(data.price || {});
  const checklistHtml = data.contentChecklist?.length
    ? `<div class="row"><div class="label" style="width:130px">CHECKLIST:</div><div class="value"><ul style="margin:0;padding-left:18px">${data.contentChecklist.map(item => `<li>${item}</li>`).join("")}</ul></div></div>`
    : "";
  const restrictionWarning = route.route === "Lima - Torino" && data.limaTorinoEncomiendasEnabled === false
    ? `<div style="margin:10px 0;padding:8px 10px;border:1px solid #b91c1c;background:#fef2f2;color:#991b1b;font-size:11px;line-height:1.35"><strong>AVISO DE SEGURIDAD:</strong> Las encomiendas Lima – Torino están restringidas temporalmente. Esta ruta solo admite documentos hasta nuevo aviso.</div>`
    : "";
  const managementQrHtml = data.managementQrDataUrl
    ? `<div style="margin-top:9px;text-align:center"><img src="${data.managementQrDataUrl}" width="88" height="88" alt="QR para actualizar el estado del envío" style="display:block;margin:0 auto"><div style="font-size:8px;line-height:1.25;margin-top:3px;color:#334155;font-weight:700">ESCANEAR PARA GESTIONAR<br>ESTADO (PERSONAL AUTORIZADO)</div></div>`
    : data.managementUrl
    ? `<div style="margin-top:9px;text-align:center"><canvas id="deliveryControlQR" width="88" height="88" aria-label="QR para actualizar el estado del envío"></canvas><div style="font-size:8px;line-height:1.25;margin-top:3px;color:#334155;font-weight:700">ESCANEAR PARA GESTIONAR<br>ESTADO (PERSONAL AUTORIZADO)</div></div>`
    : "";
  const apostilleHtml = (data.requiresApostilleService === true || Number(data.requiresApostilleService) === 1) ? `<div class="row"><div class="label" style="width:130px">SERVICIO:</div><div class="value"><strong>Documentos para apostillar</strong></div></div>` : "";
  const translationHtml = (data.requiresTranslationService === true || Number(data.requiresTranslationService) === 1) ? `<div class="row"><div class="label" style="width:130px">SERVICIO:</div><div class="value"><strong>Documentos para traducir</strong></div></div>` : "";
  const provinceHtml = (data.isProvinceDelivery === true || Number(data.isProvinceDelivery) === 1) ? `<div style="margin:10px 0;padding:10px 12px;border:2px solid #F28C00;border-radius:6px;background:#fff7ed;color:#7c2d12;font-size:11px;line-height:1.4"><strong>TICKET PARA ENVÍO A PROVINCIA</strong><br>El personal autorizado debe entregar este paquete al operador <strong>${data.provinceCarrier === "olva" ? "Olva Courier" : data.provinceCarrier === "fedex" ? "FedEx" : data.provinceCarrier === "dhl" ? "DHL" : "Shalom"}</strong> para su traslado a la dirección de destino indicada. Verifica que la orden, código, destinatario y teléfono coincidan antes de despacharlo.</div>` : "";
  const clientPin = route.route === "Torino - Lima" && data.recipientPhone ? String(data.recipientPhone).replace(/\D/g, "").slice(-4) : "";
  const pinHtml = clientPin.length === 4 ? `<div class="row"><div class="label" style="width:130px">CLAVE CLIENTE:</div><div class="value"><strong>${clientPin}</strong> <span style="font-size:9px;color:#64748b">(últimos 4 dígitos del celular)</span></div></div>` : "";
  return `<div class="cut-ticket"><div class="cut-icon">✂</div><div class="ticket-header">CONTROL DE ENTREGA — ${route.deliveryTitle} (${shipmentLabel})</div>${restrictionWarning}<div style="display: flex; justify-content: space-between; align-items: center;"><div style="flex: 1;"><div class="row"><div class="label" style="width:130px">INFORMACIÓN:</div><div class="value"><strong>ENVÍO DE ${shipmentLabel}</strong></div></div><div class="row"><div class="label" style="width:130px">ORDEN:</div><div class="value"><strong>${data.order}</strong></div></div><div class="row"><div class="label" style="width:130px">CÓDIGO:</div><div class="value"><strong>${data.code}</strong></div></div><div class="row"><div class="label" style="width:130px">RUTA:</div><div class="value">${route.route}</div></div><div class="row"><div class="label" style="width:130px">ORIGEN:</div><div class="value">${route.originPrintLabel}</div></div><div class="row"><div class="label" style="width:130px">DESTINO:</div><div class="value">${route.destinationPrintLabel}</div></div><div class="row"><div class="label" style="width:130px">SEDE DE ENTREGA:</div><div class="value">${route.destination.officeLabel}</div></div><div class="row"><div class="label" style="width:130px">DIRECCIÓN:</div><div class="value">${route.destination.address}</div></div><div class="row"><div class="label" style="width:130px">REMITENTE:</div><div class="value">${data.sender || "No especificado"} · ${formatPhoneNumber(data.senderPhone) || "No especificado"} · DNI ${data.senderDni || "No especificado"}</div></div><div class="row"><div class="label" style="width:130px">DESTINATARIO:</div><div class="value">${data.recipient} · ${formatPhoneNumber(data.recipientPhone) || "No especificado"} · DNI ${data.recipientDni || "No especificado"}</div></div>${apostilleHtml}${translationHtml}${provinceHtml}${pinHtml}<div class="row"><div class="label" style="width:130px">NOTAS:</div><div class="value">${data.notes || "Sin notas"}${priceHtml}</div></div>${checklistHtml}</div><div style="text-align: right; min-width: 140px;"><div style="font-size: 15px; font-weight: bold; border: 2px solid #0B2B5E; padding: 8px; background: #fff; text-align: center;">${data.code}</div>${managementQrHtml}<div style="font-size: 9px; margin-top: 5px; font-weight: bold;">ADJUNTAR A FOLDER MANILA</div></div></div></div>`;
}
