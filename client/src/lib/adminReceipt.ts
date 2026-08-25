import { getReceiptTicketPrintCss } from "./printLayout";
import { getDeclarationLegalText, getRoutePresentation, INSTITUTIONAL_DECLARATION_ENTITY } from "./routeDetails";
import { buildReceiptPriceHtml, type ReceiptPriceData } from "./receiptPrice";
import { formatPhoneNumber } from "./phoneFormatting";
import { isTorinoLimaRoute } from "@shared/shipmentRoutes";

export function buildAdminReceiptPrintStyles() {
  return `${getReceiptTicketPrintCss(".cut-ticket")}@media print{.cut-ticket.ticket-delivery-control{box-sizing:border-box;min-height:200mm;padding:10mm 9mm;font-size:12px;line-height:1.38}.ticket-delivery-control .ticket-header{flex:1;text-align:center;font-size:16px;line-height:1.2;font-weight:900;letter-spacing:.02em}.ticket-delivery-control .row{margin:4px 0}.ticket-delivery-control .label{width:150px!important;font-size:11px;font-weight:900;letter-spacing:.02em}.ticket-delivery-control .value{font-size:12px;line-height:1.35}.ticket-delivery-control .ticket-main-grid{display:flex!important;align-items:flex-start!important;gap:10mm!important}.ticket-delivery-control .ticket-data{flex:1;min-width:0}.ticket-delivery-control .ticket-qr-zone{flex:0 0 58mm!important;min-width:58mm!important;text-align:center;padding:4mm;background:#fff;border:1.5px solid #0B2B5E;border-radius:3mm}.ticket-delivery-control .ticket-code{font-size:20px!important;font-weight:900!important;letter-spacing:.08em;padding:5mm!important;margin-bottom:4mm}.ticket-delivery-control .ticket-qr-image,.ticket-delivery-control #deliveryControlQR{display:block!important;width:46mm!important;height:46mm!important;margin:0 auto!important;padding:3mm!important;box-sizing:content-box!important;background:#fff!important;border:0!important;image-rendering:pixelated}.ticket-delivery-control .ticket-qr-caption{font-size:10px!important;line-height:1.35!important;margin-top:3mm!important;font-weight:900!important}.ticket-delivery-control .ticket-folder-note{font-size:10px!important;margin-top:4mm!important;font-weight:900!important}.ticket-delivery-control .price-final{font-size:18px!important;padding:4mm!important}.ticket-delivery-control ul{font-size:12px!important;line-height:1.45!important}}`;
}

export function buildAdminDeclarationHtml(data: {
  sender: string;
  senderDni: string;
  order: string;
  token: string;
  today: string;
  route?: string | null;
  companyName?: string;
}) {
  const legal = getDeclarationLegalText(data.route);
  const legalEntity = data.companyName?.trim() || INSTITUTIONAL_DECLARATION_ENTITY;
  return `<p>Yo, <strong>${data.sender}</strong>, identificado(a) con documento de identidad N° <strong>${data.senderDni}</strong>, en pleno uso de mis facultades, declaro bajo juramento que el envío amparado bajo la Orden N° <strong>${data.order}</strong> (Token de seguridad: ${data.token}) contiene <strong>ÚNICA Y ESTRICTAMENTE DOCUMENTACIÓN LÍCITA</strong>.</p><p>${legal.guarantee}</p><p>${legal.authorities}</p><p>En consecuencia, eximo expresa, legal y totalmente de cualquier implicancia, investigación, responsabilidad operativa o financiera a la empresa <strong>${legalEntity}</strong>. Asimismo, autorizo de manera irrevocable la apertura, revisión física detallada y escaneo del presente envío por parte de la agencia o las autoridades competentes sin necesidad de mi presencia ni notificación previa.</p><p>${legal.originLine} ${data.today}. <strong>${legalEntity}</strong>.</p>`;
}

export function buildAdminRouteSummaryHtml(routeValue?: string | null, destinationAddress?: string | null, originAddress?: string | null, originPhone?: string | null) {
  const routeBase = getRoutePresentation(routeValue, destinationAddress);
  const origin = originAddress?.trim()
    ? { ...routeBase.origin, officeLabel: originAddress.trim(), address: originAddress.trim(), phone: originPhone?.trim() || routeBase.origin.phone }
    : routeBase.origin;
  const route = { ...routeBase, origin };
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
  provinceCarrier?: string | null;
  provinceSenderName?: string | null;
  provinceSenderLastName?: string | null;
  provinceSenderDni?: string | null;
  provinceSenderPhone?: string | null;
  limaTorinoTransferMode?: "dhl_recogida" | "persona_autorizada" | null;
  deliveryPersonName?: string | null;
  deliveryPersonLastName?: string | null;
  deliveryPersonDni?: string | null;
  deliveryPersonPhone?: string | null;
  deliveryLocationType?: "direccion" | "aeropuerto_jorge_chavez" | null;
  deliveryLocationAddress?: string | null;
  brandLogoPath?: string;
  brandName?: string;
  brandRuc?: string;
}) {
  const route = getRoutePresentation(data.route, data.destinationAddress);
  const ticketBrandName = data.brandName?.trim() || "Servicom Internacional";
  const ticketBrandLogoPath = data.brandLogoPath?.trim() || "/manus-storage/servicom_logo_final_e7ce35aa.png";
  const ticketBrandRuc = data.brandRuc?.trim() || "20615004708";
  const shipmentLabel = data.shipmentType === "encomienda" ? "ENCOMIENDA" : "DOCUMENTO";
  const priceHtml = buildReceiptPriceHtml(data.price || {});
  const checklistHtml = data.contentChecklist?.length
    ? `<div class="row"><div class="label" style="width:130px">CHECKLIST:</div><div class="value"><ul style="margin:0;padding-left:18px">${data.contentChecklist.map(item => `<li>${item}</li>`).join("")}</ul></div></div>`
    : "";
  const restrictionWarning = route.route === "Lima - Torino" && data.limaTorinoEncomiendasEnabled === false
    ? `<div style="margin:10px 0;padding:8px 10px;border:1px solid #b91c1c;background:#fef2f2;color:#991b1b;font-size:11px;line-height:1.35"><strong>AVISO DE SEGURIDAD:</strong> Las encomiendas Lima – Torino están restringidas temporalmente. Esta ruta solo admite documentos hasta nuevo aviso.</div>`
    : "";
  const managementQrHtml = data.managementQrDataUrl
    ? `<div class="ticket-qr-wrap"><img class="ticket-qr-image" src="${data.managementQrDataUrl}" width="174" height="174" alt="QR para actualizar el estado del envío"><div class="ticket-qr-caption">ESCANEAR PARA GESTIONAR<br>ESTADO (PERSONAL AUTORIZADO)</div></div>`
    : data.managementUrl
    ? `<div class="ticket-qr-wrap"><canvas id="deliveryControlQR" width="174" height="174" aria-label="QR para actualizar el estado del envío"></canvas><div class="ticket-qr-caption">ESCANEAR PARA GESTIONAR<br>ESTADO (PERSONAL AUTORIZADO)</div></div>`
    : "";
  const apostilleHtml = (data.requiresApostilleService === true || Number(data.requiresApostilleService) === 1) ? `<div class="row"><div class="label" style="width:130px">SERVICIO:</div><div class="value"><strong>Documentos para apostillar</strong></div></div>` : "";
  const translationHtml = (data.requiresTranslationService === true || Number(data.requiresTranslationService) === 1) ? `<div class="row"><div class="label" style="width:130px">SERVICIO:</div><div class="value"><strong>Documentos para traducir</strong></div></div>` : "";
  const isProvince = data.isProvinceDelivery === true || Number(data.isProvinceDelivery) === 1;
  const provinceSender = [data.provinceSenderName, data.provinceSenderLastName].filter(Boolean).join(" ").trim();
  const senderDisplay = isProvince && provinceSender ? provinceSender : data.sender || "No especificado";
  const senderPhoneDisplay = isProvince && data.provinceSenderPhone ? data.provinceSenderPhone : data.senderPhone;
  const senderDniDisplay = isProvince && data.provinceSenderDni ? data.provinceSenderDni : data.senderDni;
  const provinceCarrierLabel = data.provinceCarrier === "olva" ? "Olva Courier" : data.provinceCarrier === "fedex" ? "FedEx" : data.provinceCarrier === "dhl" ? "DHL" : data.provinceCarrier || "Shalom";
  const transferHtml = data.route === "Lima - Torino" && data.shipmentType === "documento" && data.limaTorinoTransferMode ? `<div style="margin:10px 0;padding:10px 12px;border:2px solid #2563eb;border-radius:6px;background:#eff6ff;color:#0B2B5E;font-size:11px;line-height:1.4"><strong>MODALIDAD DE TRASLADO A TORINO:</strong> ${data.limaTorinoTransferMode === "dhl_recogida" ? "DHL recogerá el documento en Lima." : `Entrega a persona autorizada: <strong>${data.deliveryPersonName || ""} ${data.deliveryPersonLastName || ""}</strong> · DNI ${data.deliveryPersonDni || "No indicado"} · Celular ${data.deliveryPersonPhone || "No indicado"}<br><strong>Lugar:</strong> ${data.deliveryLocationType === "aeropuerto_jorge_chavez" ? "Nuevo Aeropuerto Internacional Jorge Chávez" : data.deliveryLocationAddress || "Dirección indicada"}`}</div>` : "";
  const provinceHtml = isProvince ? `<div style="margin:10px 0;padding:10px 12px;border:2px solid #F28C00;border-radius:6px;background:#fff7ed;color:#7c2d12;font-size:11px;line-height:1.4"><strong>TICKET PARA ENVÍO A PROVINCIA</strong><br>El personal autorizado debe entregar este paquete al operador <strong>${provinceCarrierLabel}</strong> para su traslado a la dirección de destino indicada. Verifica que la orden, código, destinatario y teléfono coincidan antes de despacharlo.</div>` : "";
  const clientPin = isTorinoLimaRoute(route.route) && data.recipientPhone ? String(data.recipientPhone).replace(/\D/g, "").slice(-4) : "";
  const pinHtml = clientPin.length === 4 ? `<div class="row"><div class="label" style="width:130px">CLAVE CLIENTE:</div><div class="value"><strong>${clientPin}</strong> <span style="font-size:9px;color:#64748b">(últimos 4 dígitos del celular)</span></div></div>` : "";
  return `<div class="cut-ticket ticket-delivery-control"><div class="cut-icon">✂</div><div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid #dbe4ef;padding-bottom:8px;margin-bottom:8px"><img src="${ticketBrandLogoPath}" alt="${ticketBrandName}" style="width:46px;height:46px;object-fit:contain;border-radius:8px;background:#fff"><div><strong style="display:block;color:#0B2B5E;font-size:15px">${ticketBrandName}</strong><span style="display:block;color:#475569;font-size:10px">RUC ${ticketBrandRuc}</span></div><div class="ticket-header">CONTROL DE ENTREGA — ${route.deliveryTitle} (${shipmentLabel})</div></div>${restrictionWarning}<div class="ticket-main-grid" style="display:flex;justify-content:space-between;align-items:flex-start"><div class="ticket-data" style="flex:1"><div class="row"><div class="label" style="width:130px">INFORMACIÓN:</div><div class="value"><strong>ENVÍO DE ${shipmentLabel}</strong></div></div><div class="row"><div class="label" style="width:130px">ORDEN:</div><div class="value"><strong>${data.order}</strong></div></div><div class="row"><div class="label" style="width:130px">CÓDIGO:</div><div class="value"><strong>${data.code}</strong></div></div><div class="row"><div class="label" style="width:130px">RUTA:</div><div class="value">${route.route}</div></div><div class="row"><div class="label" style="width:130px">ORIGEN:</div><div class="value">${route.originPrintLabel}</div></div><div class="row"><div class="label" style="width:130px">DESTINO:</div><div class="value">${route.destinationPrintLabel}</div></div><div class="row"><div class="label" style="width:130px">SEDE DE ENTREGA:</div><div class="value">${route.destination.officeLabel}</div></div><div class="row"><div class="label" style="width:130px">DIRECCIÓN:</div><div class="value">${route.destination.address}</div></div><div class="row"><div class="label" style="width:130px">${isProvince && provinceSender ? "REMITENTE PROVINCIAL:" : "REMITENTE:"}</div><div class="value">${senderDisplay} · ${formatPhoneNumber(senderPhoneDisplay) || "No especificado"} · DNI ${senderDniDisplay || "No especificado"}</div></div><div class="row"><div class="label" style="width:130px">DESTINATARIO:</div><div class="value">${data.recipient} · ${formatPhoneNumber(data.recipientPhone) || "No especificado"} · DNI ${data.recipientDni || "No especificado"}</div></div>${apostilleHtml}${translationHtml}${transferHtml}${provinceHtml}${pinHtml}<div class="row"><div class="label" style="width:130px">NOTAS:</div><div class="value">${data.notes || "Sin notas"}${priceHtml}</div></div>${checklistHtml}</div><aside class="ticket-qr-zone" style="text-align:right;min-width:140px"><div class="ticket-code" style="font-size:15px;font-weight:bold;border:2px solid #0B2B5E;padding:8px;background:#fff;text-align:center">${data.code}</div>${managementQrHtml}<div class="ticket-folder-note" style="font-size:9px;margin-top:5px;font-weight:bold">ADJUNTAR A FOLDER MANILA</div></aside></div></div>`;
}
