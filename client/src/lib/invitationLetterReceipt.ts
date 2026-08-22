import type { InvitationLetterData, InvitationLetterSignatureView } from "./invitationLetter";

export type InvitationLetterExtra = { description: string; amountEur: number };
export type InvitationLetterPricing = {
  basePriceEur: number;
  manualPriceEur?: number | null;
  extras: InvitationLetterExtra[];
};

const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const safe = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "carta";
const money = (value: number) => `EUR ${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;

export const getInvitationLetterTotal = (pricing: InvitationLetterPricing) => {
  const base = pricing.manualPriceEur ?? pricing.basePriceEur;
  return base + pricing.extras.reduce((total, item) => total + (Number(item.amountEur) || 0), 0);
};

export function buildInvitationLetterReceiptFilename(input: { id: number; data: InvitationLetterData; signature?: InvitationLetterSignatureView | null }) {
  const name = safe(`${input.data.invitee.firstName} ${input.data.invitee.lastName}`);
  return `recibo-carta-invitacion-${name}-${input.id}${input.signature?.status === "signed" || input.signature?.signedAt ? "-firmada" : ""}`;
}

export function buildInvitationLetterReceiptHtml(input: { id: number; data: InvitationLetterData; pricing: InvitationLetterPricing; createdAt?: string | Date; signature?: InvitationLetterSignatureView | null }) {
  const base = input.pricing.manualPriceEur ?? input.pricing.basePriceEur;
  const extras = input.pricing.extras.filter(item => item.description.trim() || Number(item.amountEur) > 0);
  const total = getInvitationLetterTotal(input.pricing);
  const invited = `${input.data.invitee.firstName} ${input.data.invitee.lastName}`.trim();
  const inviter = `${input.data.inviter.firstName} ${input.data.inviter.lastName}`.trim();
  const created = input.createdAt ? new Date(input.createdAt).toLocaleString("es-PE") : new Date().toLocaleString("es-PE");
  const logo = typeof window === "undefined" ? "/manus-storage/servicom_logo_final_e7ce35aa.png" : new URL("/manus-storage/servicom_logo_final_e7ce35aa.png", window.location.origin).href;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${buildInvitationLetterReceiptFilename(input)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#12213a;font-family:Arial,sans-serif}.sheet{max-width:186mm;margin:auto}.head{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #f28c00;padding-bottom:10px}.brand{display:flex;align-items:center;gap:12px}.brand img{width:58px;height:58px;object-fit:contain;border:1px solid #dbe5f1;border-radius:8px;padding:3px}.brand h1{margin:0;color:#0b2b5e;font-size:20px}.brand p,.meta p{margin:3px 0;color:#526274;font-size:11px}.receipt{font-size:12px;font-weight:700;color:#0b2b5e;letter-spacing:.08em}.summary{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}.card{border:1px solid #d9e2ec;border-radius:8px;padding:12px;background:#f8fafc}.card h2{margin:0 0 8px;color:#0b2b5e;font-size:13px}.card p{margin:5px 0;font-size:12px}.prices{width:100%;border-collapse:collapse;margin-top:16px}.prices th{background:#0b2b5e;color:#fff;text-align:left;padding:9px;font-size:12px}.prices td{padding:9px;border-bottom:1px solid #d9e2ec;font-size:12px}.prices td:last-child,.prices th:last-child{text-align:right}.total td{border-top:2px solid #f28c00;border-bottom:0;font-weight:800;font-size:16px;color:#0b2b5e}.status{margin-top:20px;border-radius:8px;padding:10px;background:${input.signature?.status === "signed" ? "#ecfdf5" : "#fff7ed"};color:${input.signature?.status === "signed" ? "#166534" : "#9a3412"};font-size:12px}.foot{margin-top:26px;padding-top:10px;border-top:1px solid #d9e2ec;color:#64748b;font-size:10px;text-align:center}</style></head><body><main class="sheet"><header class="head"><div class="brand"><img src="${logo}" alt="Servicom Internacional"><div><h1>RECIBO DE CARTA DE INVITACIÓN</h1><p>Servicom Internacional</p><p>Comprobante N.º CI-${String(input.id).padStart(6, "0")}</p></div></div><div class="meta"><p class="receipt">CARTA DE INVITACIÓN</p><p>Emitido: ${esc(created)}</p></div></header><section class="summary"><div class="card"><h2>PERSONA INVITANTE</h2><p><strong>${esc(inviter)}</strong></p><p>${esc(input.data.inviter.passport || input.data.inviter.identityCard)}</p><p>${esc(input.data.inviter.phone)}</p></div><div class="card"><h2>PERSONA INVITADA</h2><p><strong>${esc(invited)}</strong></p><p>${esc(input.data.invitee.passport)}</p><p>Estadía: ${esc(input.data.arrivalDate)} al ${esc(input.data.departureDate)}</p></div></section><table class="prices"><thead><tr><th>CONCEPTO</th><th>IMPORTE</th></tr></thead><tbody><tr><td>${input.pricing.manualPriceEur === null || input.pricing.manualPriceEur === undefined ? "Creación de Carta de invitación" : "Precio manual de Carta de invitación"}</td><td>${money(base)}</td></tr>${extras.map(item => `<tr><td>${esc(item.description || "Extra")}</td><td>${money(Number(item.amountEur) || 0)}</td></tr>`).join("")}<tr class="total"><td>TOTAL A COBRAR</td><td>${money(total)}</td></tr></tbody></table><p class="status">${input.signature?.status === "signed" ? `Firma electrónica registrada por ${esc(input.signature.signerName || inviter)}.` : "Carta creada. La firma electrónica queda pendiente cuando corresponda."}</p><p class="foot">Este comprobante está vinculado a la Carta de invitación N.º CI-${String(input.id).padStart(6, "0")} y se conserva mientras la Carta permanezca activa o en papelera.</p></main></body></html>`;
}

function openReceipt(input: { id: number; data: InvitationLetterData; pricing: InvitationLetterPricing; createdAt?: string | Date; signature?: InvitationLetterSignatureView | null }) {
  const filename = buildInvitationLetterReceiptFilename(input);
  const printWindow = window.open("", "_blank", "width=860,height=900");
  if (!printWindow) throw new Error("Permite las ventanas emergentes para imprimir o guardar el comprobante.");
  printWindow.document.open();
  printWindow.document.write(buildInvitationLetterReceiptHtml(input));
  printWindow.document.close();
  printWindow.document.title = filename;
  const print = () => { if (!printWindow.closed) { printWindow.focus(); printWindow.print(); } };
  printWindow.onload = print;
  window.setTimeout(print, 250);
  window.setTimeout(() => { if (!printWindow.closed) printWindow.close(); }, 1200);
  return `${filename}.pdf`;
}

export function downloadInvitationLetterReceipt(input: { id: number; data: InvitationLetterData; pricing: InvitationLetterPricing; createdAt?: string | Date; signature?: InvitationLetterSignatureView | null }) { return openReceipt(input); }
export function printInvitationLetterReceipt(input: { id: number; data: InvitationLetterData; pricing: InvitationLetterPricing; createdAt?: string | Date; signature?: InvitationLetterSignatureView | null }) { openReceipt(input); }
