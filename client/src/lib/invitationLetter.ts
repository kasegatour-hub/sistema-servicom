export type InvitationPerson = {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  nationality: string;
  identityCard: string;
  passport: string;
  residencePermit: string;
  address: string;
  occupation: string;
  phone: string;
  email: string;
};

export type InvitationLetterData = {
  inviter: InvitationPerson;
  invitee: InvitationPerson;
  relationship: string;
  purpose: string;
  arrivalDate: string;
  departureDate: string;
  hostingAddress: string;
  city: string;
  date: string;
  financialSupport: boolean;
  healthInsurance: boolean;
  financialGuarantee: boolean;
  inviteeIdAttached: boolean;
  financialGuaranteeAttached: boolean;
  otherAttachment: string;
};

const display = (value?: string) => value?.trim() || "No especificado";
const personName = (person: InvitationPerson) => `${person.firstName} ${person.lastName}`.trim() || "invitado";
const safeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "invitado";

export const buildInvitationLetterFilename = (data: InvitationLetterData) => `carta-invitacion-${safeName(personName(data.invitee))}-${data.date || "sin-fecha"}`;

export function buildInvitationLetterText(data: InvitationLetterData): string {
  const inviter = data.inviter;
  const invitee = data.invitee;
  return `DICHIARAZIONE GARANZIA E/O ALLOGGIAMENTO
PROOF OF SPONSORSHIP AND/OR PRIVATE ACCOMMODATION

DATOS DEL INVITANTE / UNDERSIGNED
Nombre: ${display(personName(inviter))}
Fecha y lugar de nacimiento: ${display(inviter.birthDate)} · ${display(inviter.birthPlace)}
Nacionalidad: ${display(inviter.nationality)}
Documento de identidad: ${display(inviter.identityCard)}
Pasaporte: ${display(inviter.passport)}
Permiso de residencia: ${display(inviter.residencePermit)}
Dirección: ${display(inviter.address)}
Ocupación: ${display(inviter.occupation)}
Teléfono / Email: ${display(inviter.phone)} · ${display(inviter.email)}

DECLARACIÓN DE HOSPEDAJE / ACCOMMODATION DECLARATION
Declaro poder hospedar a la siguiente persona en la dirección: ${display(data.hostingAddress || inviter.address)}.

DATOS DEL INVITADO / INVITEE
Nombre: ${display(personName(invitee))}
Fecha y lugar de nacimiento: ${display(invitee.birthDate)} · ${display(invitee.birthPlace)}
Nacionalidad: ${display(invitee.nationality)}
Documento de identidad: ${display(invitee.identityCard)}
Pasaporte: ${display(invitee.passport)}
Dirección: ${display(invitee.address)}
Ocupación: ${display(invitee.occupation)}
Teléfono / Email: ${display(invitee.phone)} · ${display(invitee.email)}

Relación con el invitado: ${display(data.relationship)}
Finalidad de la visita: ${display(data.purpose)}
Periodo de estadía: ${display(data.arrivalDate)} al ${display(data.departureDate)}

DECLARACIONES
- ${data.financialSupport ? "Sí" : "No"}: asumir los gastos de sostenimiento durante la estadía.
- ${data.healthInsurance ? "Sí" : "No"}: seguro sanitario del invitado.
- ${data.financialGuarantee ? "Sí" : "No"}: garantía económica adicional.
- Me comprometo a comunicar a las autoridades locales la presencia del ciudadano extranjero dentro de los plazos legales aplicables.

ANEXOS
- ${data.inviteeIdAttached ? "Sí" : "No"}: documento de identidad del invitante.
- ${data.financialGuaranteeAttached ? "Sí" : "No"}: garantía financiera.
- Otros documentos: ${display(data.otherAttachment)}

Lugar: ${display(data.city)}
Fecha: ${display(data.date)}

Firma del invitante: ______________________________`;
}

function writeSection(pdf: any, title: string, lines: string[], y: number) {
  pdf.setFillColor(11, 43, 94);
  pdf.rect(18, y - 5, 174, 7, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(title, 21, y);
  y += 8;
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line, 170);
    if (y + wrapped.length * 4.8 > 276) { pdf.addPage(); y = 20; }
    pdf.text(wrapped, 20, y);
    y += wrapped.length * 4.8 + 2;
  }
  return y + 3;
}

export async function downloadInvitationLetterPdf(data: InvitationLetterData): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const filename = `${buildInvitationLetterFilename(data)}.pdf`;
  const inviter = data.inviter;
  const invitee = data.invitee;
  pdf.setFillColor(11, 43, 94);
  pdf.rect(0, 0, 210, 28, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("DICHIARAZIONE GARANZIA E/O ALLOGGIAMENTO", 105, 12, { align: "center" });
  pdf.setFontSize(10);
  pdf.text("PROOF OF SPONSORSHIP AND/OR PRIVATE ACCOMMODATION", 105, 20, { align: "center" });
  let y = 40;
  y = writeSection(pdf, "DATOS DEL INVITANTE / UNDERSIGNED", [
    `Nombre: ${display(personName(inviter))}`,
    `Fecha y lugar de nacimiento: ${display(inviter.birthDate)} · ${display(inviter.birthPlace)}`,
    `Nacionalidad: ${display(inviter.nationality)} · Documento: ${display(inviter.identityCard)}`,
    `Pasaporte: ${display(inviter.passport)} · Permiso de residencia: ${display(inviter.residencePermit)}`,
    `Dirección: ${display(inviter.address)}`,
    `Ocupación: ${display(inviter.occupation)} · Teléfono: ${display(inviter.phone)} · Email: ${display(inviter.email)}`,
  ], y);
  y = writeSection(pdf, "DECLARACIÓN DE HOSPEDAJE / ACCOMMODATION", [
    `Declaro poder hospedar a la persona invitada en: ${display(data.hostingAddress || inviter.address)}.`,
  ], y);
  y = writeSection(pdf, "DATOS DEL INVITADO / INVITEE", [
    `Nombre: ${display(personName(invitee))}`,
    `Fecha y lugar de nacimiento: ${display(invitee.birthDate)} · ${display(invitee.birthPlace)}`,
    `Nacionalidad: ${display(invitee.nationality)} · Documento: ${display(invitee.identityCard)}`,
    `Pasaporte: ${display(invitee.passport)}`,
    `Dirección: ${display(invitee.address)}`,
    `Ocupación: ${display(invitee.occupation)} · Teléfono: ${display(invitee.phone)} · Email: ${display(invitee.email)}`,
  ], y);
  y = writeSection(pdf, "VISITA Y DECLARACIONES", [
    `Relación: ${display(data.relationship)}. Finalidad: ${display(data.purpose)}.`,
    `Periodo de estadía: ${display(data.arrivalDate)} al ${display(data.departureDate)}.`,
    `${data.financialSupport ? "[X]" : "[ ]"} Asumo los gastos de sostenimiento durante la estadía.`,
    `${data.healthInsurance ? "[X]" : "[ ]"} El invitado cuenta con seguro sanitario.`,
    `${data.financialGuarantee ? "[X]" : "[ ]"} Declaro una garantía económica adicional.`,
    "Me comprometo a comunicar a las autoridades locales la presencia del ciudadano extranjero dentro de los plazos legales aplicables.",
  ], y);
  y = writeSection(pdf, "ANEXOS", [
    `${data.inviteeIdAttached ? "[X]" : "[ ]"} Documento de identidad del invitante.`,
    `${data.financialGuaranteeAttached ? "[X]" : "[ ]"} Garantía financiera.`,
    `Otros documentos: ${display(data.otherAttachment)}`,
  ], y);
  if (y + 26 > 276) { pdf.addPage(); y = 28; }
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Luogo / Place: ${display(data.city)}`, 20, y + 8);
  pdf.text(`Data / Date: ${display(data.date)}`, 105, y + 8);
  pdf.line(132, y + 23, 190, y + 23);
  pdf.text("Firma / Signature", 145, y + 28);
  pdf.save(filename);
  return filename;
}

export function printInvitationLetter(data: InvitationLetterData) {
  const filename = buildInvitationLetterFilename(data);
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) throw new Error("Permite las ventanas emergentes para imprimir la carta.");
  const content = buildInvitationLetterText(data)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  printWindow.document.write(`<!doctype html><html><head><title>${filename}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#0f172a;line-height:1.45}h1{font-size:17px;color:#0b2b5e;border-bottom:3px solid #f28c00;padding-bottom:8px}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11px}</style></head><body><h1>DICHIARAZIONE GARANZIA E/O ALLOGGIAMENTO</h1><pre>${content}</pre></body></html>`);
  printWindow.document.close();
  printWindow.onafterprint = () => { if (!printWindow.closed) printWindow.close(); };
  printWindow.focus();
  printWindow.print();
  window.setTimeout(() => { if (!printWindow.closed) printWindow.close(); }, 1200);
}
