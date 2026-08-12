import { getReceiptTicketPrintCss } from "./printLayout";

export function buildAdminReceiptPrintStyles() {
  return getReceiptTicketPrintCss(".cut-ticket");
}

export function buildAdminDeliveryTicketHtml(data: {
  order: string;
  code: string;
  recipient: string;
  recipientPhone: string;
}) {
  return `<div class="cut-ticket"><div class="cut-icon">✂</div><div class="ticket-header">CONTROL DE ENTREGA - TORINO, ITALIA</div><div style="display: flex; justify-content: space-between; align-items: center;"><div style="flex: 1;"><div class="row"><div class="label" style="width:130px">ORDEN:</div><div class="value"><strong>${data.order}</strong></div></div><div class="row"><div class="label" style="width:130px">CÓDIGO:</div><div class="value"><strong>${data.code}</strong></div></div><div class="row"><div class="label" style="width:130px">DESTINO:</div><div class="value">TORINO, ITALIA</div></div><div class="row"><div class="label" style="width:130px">RECEPTOR:</div><div class="value">${data.recipient}</div></div><div class="row"><div class="label" style="width:130px">CEL. DESTINATARIA:</div><div class="value">${data.recipientPhone}</div></div></div><div style="text-align: right; min-width: 140px;"><div style="font-size: 15px; font-weight: bold; border: 2px solid #0B2B5E; padding: 8px; background: #fff; text-align: center;">${data.code}</div><div style="font-size: 9px; margin-top: 5px; font-weight: bold;">ADJUNTAR A FOLDER MANILA</div></div></div></div>`;
}
