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
  city: string;
  date: string;
  financialSupport: boolean;
  healthInsurance: boolean;
  financialGuarantee: boolean;
  inviteeIdAttached: boolean;
  financialGuaranteeAttached: boolean;
};

export type InvitationLetterItalian = {
  inviter: Pick<InvitationPerson, "birthPlace" | "nationality" | "residencePermit" | "address" | "occupation">;
  invitee: Pick<InvitationPerson, "birthPlace" | "nationality" | "address" | "occupation">;
  relationship: string;
  purpose: string;
  city: string;
};

const display = (value?: string) => value?.trim() || "Non specificato";
const personName = (person: InvitationPerson) => `${person.firstName} ${person.lastName}`.trim() || "invitato";
const safeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "invitato";
const uppercase = (value: string) => value.toLocaleUpperCase("es-PE");

export const buildInvitationLetterFilename = (data: InvitationLetterData) => `carta-invitacion-${safeName(personName(data.invitee))}-${data.date || "sin-fecha"}`;

export function buildInvitationLetterItalianFallback(data: InvitationLetterData): InvitationLetterItalian {
  return {
    inviter: {
      birthPlace: uppercase(data.inviter.birthPlace),
      nationality: uppercase(data.inviter.nationality),
      residencePermit: uppercase(data.inviter.residencePermit),
      address: uppercase(data.inviter.address),
      occupation: uppercase(data.inviter.occupation),
    },
    invitee: {
      birthPlace: uppercase(data.invitee.birthPlace),
      nationality: uppercase(data.invitee.nationality),
      address: uppercase(data.invitee.address),
      occupation: uppercase(data.invitee.occupation),
    },
    relationship: uppercase(data.relationship),
    purpose: uppercase(data.purpose),
    city: uppercase(data.city),
  };
}

export function buildInvitationLetterText(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)): string {
  const inviter = data.inviter;
  const invitee = data.invitee;
  return `DICHIARAZIONE DI GARANZIA E/O ALLOGGIO
PROOF OF SPONSORSHIP AND/OR PRIVATE ACCOMMODATION

DATI DELL'INVITANTE / HOST
Nome e cognome: ${display(personName(inviter))}
Data e luogo di nascita: ${display(inviter.birthDate)} · ${display(italian.inviter.birthPlace)}
Nazionalità: ${display(italian.inviter.nationality)}
Documento d'identità: ${display(inviter.identityCard)}
Passaporto: ${display(inviter.passport)}
Permesso di soggiorno: ${display(italian.inviter.residencePermit)}
Indirizzo: ${display(italian.inviter.address)}
Professione: ${display(italian.inviter.occupation)}
Telefono: ${display(inviter.phone)}
E-mail: ${display(inviter.email)}

DICHIARAZIONE DI ALLOGGIO
Dichiaro di poter ospitare la persona invitata al seguente indirizzo: ${display(italian.inviter.address)}.

DATI DELLA PERSONA INVITATA / INVITEE
Nome e cognome: ${display(personName(invitee))}
Data e luogo di nascita: ${display(invitee.birthDate)} · ${display(italian.invitee.birthPlace)}
Nazionalità: ${display(italian.invitee.nationality)}
Documento d'identità: ${display(invitee.identityCard)}
Passaporto: ${display(invitee.passport)}
Indirizzo: ${display(italian.invitee.address)}
Professione: ${display(italian.invitee.occupation)}
Telefono: ${display(invitee.phone)}
E-mail: ${display(invitee.email)}

Rapporto con la persona invitata: ${display(italian.relationship)}
Scopo della visita: ${display(italian.purpose)}
Periodo di soggiorno: dal ${display(data.arrivalDate)} al ${display(data.departureDate)}

DICHIARAZIONI
- ${data.financialSupport ? "Sì" : "No"}: mi assumo le spese di mantenimento durante il soggiorno.
- ${data.healthInsurance ? "Sì" : "No"}: la persona invitata dispone di assicurazione sanitaria.
- ${data.financialGuarantee ? "Sì" : "No"}: dichiaro una garanzia economica aggiuntiva.
- Mi impegno a comunicare alle autorità locali la presenza del cittadino straniero nei termini previsti dalla legge.

ALLEGATI
- ${data.inviteeIdAttached ? "Sì" : "No"}: documento d'identità dell'invitante.
- ${data.financialGuaranteeAttached ? "Sì" : "No"}: garanzia finanziaria.

Luogo: ${display(italian.city)}
Data: ${display(data.date)}

Firma dell'invitante: ______________________________`;
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

export async function downloadInvitationLetterPdf(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)): Promise<string> {
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
  pdf.text("DICHIARAZIONE DI GARANZIA E/O ALLOGGIO", 105, 12, { align: "center" });
  pdf.setFontSize(10);
  pdf.text("PROOF OF SPONSORSHIP AND/OR PRIVATE ACCOMMODATION", 105, 20, { align: "center" });
  let y = 40;
  y = writeSection(pdf, "DATI DELL'INVITANTE / HOST", [
    `Nome e cognome: ${display(personName(inviter))}`,
    `Data e luogo di nascita: ${display(inviter.birthDate)} · ${display(italian.inviter.birthPlace)}`,
    `Nazionalità: ${display(italian.inviter.nationality)} · Documento d'identità: ${display(inviter.identityCard)}`,
    `Passaporto: ${display(inviter.passport)} · Permesso di soggiorno: ${display(italian.inviter.residencePermit)}`,
    `Indirizzo: ${display(italian.inviter.address)}`,
    `Professione: ${display(italian.inviter.occupation)} · Telefono: ${display(inviter.phone)} · E-mail: ${display(inviter.email)}`,
  ], y);
  y = writeSection(pdf, "DICHIARAZIONE DI ALLOGGIO", [
    `Dichiaro di poter ospitare la persona invitata al seguente indirizzo: ${display(italian.inviter.address)}.`,
  ], y);
  y = writeSection(pdf, "DATI DELLA PERSONA INVITATA / INVITEE", [
    `Nome e cognome: ${display(personName(invitee))}`,
    `Data e luogo di nascita: ${display(invitee.birthDate)} · ${display(italian.invitee.birthPlace)}`,
    `Nazionalità: ${display(italian.invitee.nationality)} · Documento d'identità: ${display(invitee.identityCard)}`,
    `Passaporto: ${display(invitee.passport)}`,
    `Indirizzo: ${display(italian.invitee.address)}`,
    `Professione: ${display(italian.invitee.occupation)} · Telefono: ${display(invitee.phone)} · E-mail: ${display(invitee.email)}`,
  ], y);
  y = writeSection(pdf, "VISITA E DICHIARAZIONI", [
    `Rapporto: ${display(italian.relationship)}. Scopo: ${display(italian.purpose)}.`,
    `Periodo di soggiorno: dal ${display(data.arrivalDate)} al ${display(data.departureDate)}.`,
    `${data.financialSupport ? "[X]" : "[ ]"} Mi assumo le spese di mantenimento durante il soggiorno.`,
    `${data.healthInsurance ? "[X]" : "[ ]"} La persona invitata dispone di assicurazione sanitaria.`,
    `${data.financialGuarantee ? "[X]" : "[ ]"} Dichiaro una garanzia economica aggiuntiva.`,
    "Mi impegno a comunicare alle autorità locali la presenza del cittadino straniero nei termini previsti dalla legge.",
  ], y);
  y = writeSection(pdf, "ALLEGATI", [
    `${data.inviteeIdAttached ? "[X]" : "[ ]"} Documento d'identità dell'invitante.`,
    `${data.financialGuaranteeAttached ? "[X]" : "[ ]"} Garanzia finanziaria.`,
  ], y);
  if (y + 26 > 276) { pdf.addPage(); y = 28; }
  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Luogo / Place: ${display(italian.city)}`, 20, y + 8);
  pdf.text(`Data / Date: ${display(data.date)}`, 105, y + 8);
  pdf.line(132, y + 23, 190, y + 23);
  pdf.text("Firma / Signature", 145, y + 28);
  pdf.save(filename);
  return filename;
}

export function printInvitationLetter(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)) {
  const filename = buildInvitationLetterFilename(data);
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) throw new Error("Permite las ventanas emergentes para imprimir la carta.");
  const content = buildInvitationLetterText(data, italian)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  printWindow.document.write(`<!doctype html><html><head><title>${filename}</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#0f172a;line-height:1.45}h1{font-size:17px;color:#0b2b5e;border-bottom:3px solid #f28c00;padding-bottom:8px}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11px}</style></head><body><h1>DICHIARAZIONE DI GARANZIA E/O ALLOGGIO</h1><pre>${content}</pre></body></html>`);
  printWindow.document.close();
  printWindow.onafterprint = () => { if (!printWindow.closed) printWindow.close(); };
  printWindow.focus();
  printWindow.print();
  window.setTimeout(() => { if (!printWindow.closed) printWindow.close(); }, 1200);
}
