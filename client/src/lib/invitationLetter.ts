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
  accommodationDeclared: boolean;
  accommodationAtHome: boolean;
  accommodationAtOtherAddress: boolean;
  inviteeIdAttached: boolean;
  financialGuaranteeAttached: boolean;
  otherAnnexes: string;
  companyAnnexes: string;
};

export type InvitationLetterItalian = {
  inviter: Pick<InvitationPerson, "birthPlace" | "nationality" | "residencePermit" | "address" | "occupation">;
  invitee: Pick<InvitationPerson, "birthPlace" | "nationality" | "address" | "occupation">;
  relationship: string;
  purpose: string;
  city: string;
};

const safeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "invitato";
const escapeHtml = (value?: string) => String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const display = (value?: string) => escapeHtml(value?.trim() || "");
const displayMultiline = (value?: string) => display(value).replace(/\n/g, "<br/>");
const check = (value: boolean) => value ? "☑" : "☐";
const titleCaseDate = (value: string) => {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
};
const personName = (person: InvitationPerson) => `${person.firstName} ${person.lastName}`.trim();

export const buildInvitationLetterFilename = (data: InvitationLetterData) => `carta-invitacion-${safeName(personName(data.invitee))}-${data.date || "sin-fecha"}`;

export function buildInvitationLetterItalianFallback(data: InvitationLetterData): InvitationLetterItalian {
  const upper = (value: string) => value.toLocaleUpperCase("it-IT");
  return {
    inviter: { birthPlace: upper(data.inviter.birthPlace), nationality: upper(data.inviter.nationality), residencePermit: upper(data.inviter.residencePermit), address: upper(data.inviter.address), occupation: upper(data.inviter.occupation) },
    invitee: { birthPlace: upper(data.invitee.birthPlace), nationality: upper(data.invitee.nationality), address: upper(data.invitee.address), occupation: upper(data.invitee.occupation) },
    relationship: upper(data.relationship), purpose: upper(data.purpose), city: upper(data.city),
  };
}

const templateStyles = `
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: white; color: #111; font-family: "Times New Roman", Times, serif; }
    .invitation-document { width: 210mm; margin: 0 auto; }
    .invitation-paper-page { width: 210mm; min-height: 297mm; padding: 16mm 17mm 15mm; background: white; page-break-after: always; overflow: hidden; }
    .invitation-paper-page:last-child { page-break-after: auto; }
    .invitation-header { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 13mm; min-height: 34mm; padding-left: 36mm; }
    .italian-flag { position: absolute; top: 0; left: 0; width: 33mm; height: 22mm; display: block; }
    .header-block { text-align: center; }
    .header-block strong { display: block; font-size: 11pt; line-height: 1.07; }
    .header-block span { display: block; margin-top: 2mm; font-size: 8pt; line-height: 1.2; }
    .intro-grid { display: grid; grid-template-columns: 1fr 1fr; margin: 4mm 0 5mm; }
    .intro-grid strong { font-size: 12pt; }
    .intro-grid em { font-size: 12pt; text-align: right; }
    .form-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 4mm; font-size: 8.2pt; }
    .form-table td { border: .28mm solid #111; height: 5.25mm; padding: .55mm 1.4mm; vertical-align: middle; }
    .form-table td.value { background: white; font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: .05mm; }
    .person-label { white-space: nowrap; }
    .company-heading { display: grid; grid-template-columns: 1fr 1fr; margin: 4mm 0 3mm; font-size: 9pt; }
    .company-heading strong { font-size: 10pt; }
    .company-heading em { text-align: right; }
    .declaration { margin: 4mm 0; font-size: 9.6pt; line-height: 1.13; }
    .declaration .box { display: inline-block; width: 5.2mm; font-family: Arial, sans-serif; font-size: 11pt; vertical-align: baseline; }
    .declaration em { font-size: 9.3pt; }
    .accommodation-subline { margin-left: 12mm; }
    .template-page-two { padding-top: 7mm; }
    .template-page-two .form-table { margin-bottom: 5mm; }
    .legal-declaration { margin: 9mm 0; font-size: 10.4pt; line-height: 1.16; }
    .legal-declaration em { font-size: 9.8pt; }
    .privacy-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4.5mm; margin-top: 6mm; }
    .privacy-box { min-height: 101mm; border: .3mm solid #111; padding: 2.7mm; font-size: 7.25pt; line-height: 1.13; text-align: left; font-weight: 700; }
    .privacy-box h3 { margin: 0 0 3.5mm; font-size: 8.1pt; line-height: 1.04; }
    .template-page-three { padding-top: 17mm; }
    .footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; margin: 18mm 3mm 8mm; font-size: 8.4pt; }
    .footer-grid span:nth-child(2) { text-align: center; }
    .footer-grid span:nth-child(3) { text-align: right; padding-top: 9mm; }
    .annexes { margin: 0 3mm; font-size: 8.5pt; line-height: 1.45; }
    .annexes .line { display: inline-block; width: 88mm; border-bottom: .25mm solid #111; transform: translateY(-1mm); }
    .annexes-company { margin-top: 6mm; }
    .annexes-company .empty { width: 85mm; height: 4.6mm; margin: 1.5mm 0; background: #f6f7ff; }
    @media print { body { background: white; } .invitation-document { margin: 0; } }
  </style>`;

const privacyItalian = `I dati forniti con questo modulo sono obbligatori per l'esame della domanda di/dei visto/i e essi saranno comunicati alle autorità competenti degli Stati membri Schengen e trattati dalle stesse, ai fini dell'adozione di una decisione in merito alla domanda di visto.<br/>Tali dati saranno inseriti e conservati nel sistema d'informazione visti (VIS) per un periodo massimo di cinque anni, durante il quale essi saranno accessibili: alle autorità competenti per i visti; alle autorità competenti in materia di controlli ai valichi di frontiera esterni; alle autorità competenti al controllo all'interno degli Stati membri al fine di verificare che siano soddisfatte le condizioni d'ingresso, di soggiorno o di residenza nel territorio degli Stati membri; alle autorità competenti in materia di asilo ai fini della determinazione dello Stato membro competente per l'esame di una domanda di asilo e/o ai fini dell'esame di una domanda di asilo.<br/><br/>A determinate condizioni, i dati saranno anche accessibili alle autorità designate degli Stati membri (per l'Italia il Ministero dell'Interno e le autorità di Polizia) e ad EUROPOL a fini di prevenzione, individuazione ed investigazione sui reati di terrorismo ed altri reati gravi. Il Ministero degli Affari Esteri e della Cooperazione internazionale (Piazzale della Farnesina 1, 00135 Roma, www.esteri.it, dgit6@esteri.it) è l'autorità italiana responsabile (titolare) del trattamento dei dati.<br/>E' suo diritto ottenere, in qualsiasi Stato membro, la comunicazione dei dati relativi alla sua persona registrati nel VIS e l'indicazione dello Stato membro che li ha trasmessi e chiedere che i dati inesatti relativi alla sua persona vengano rettificati e che quelli relativi alla sua persona trattati illecitamente vengano cancellati. Per informazioni sull'esercizio del suo diritto a verificare i suoi dati anagrafici e a rettificarli o sopprimerli, così come sulle vie di ricorso previste a tale riguardo dalla legislazione nazionale dello Stato interessato, vedi http://www.esteri.it e http://vistoperitalia.esteri.it.<br/>Ulteriori informazioni saranno fornite su sua richiesta dall'autorità che esamina la sua domanda. L'autorità di controllo nazionale italiana competente in materia di tutela dei dati personali è il Garante per la Protezione dei Dati Personali (Piazza di Montecitorio 121, 00186 Roma, http://www.garanteprivacy.it; tel.: +3906 696771).`;
const privacyEnglish = `The collection of the data required by this application form is mandatory for the examination of the visa application; they will be supplied to the relevant authorities of the Member States and processed by those authorities, for the purposes of a decision on your visa application.<br/>Such data, as well as data concerning the decision taken on your application or a decision whether to annul, revoke or extend a visa issued, will be entered into, and stored, in the Visa Information System (VIS) for a maximum period of five years, during which it will be accessible to the visa authorities and the authorities competent for carrying out checks on visas at external borders and within the Member States, immigration and asylum authorities in the Member States for the purposes of verifying whether the conditions for the legal entry into, stay and residence on the territory of the Member States are fulfilled, of identifying persons who do not or who no longer fulfil these conditions, of examining an asylum application and of determining responsibility for such examination.<br/><br/>Under certain conditions the data will be also available to designated authorities of the Member States (for Italy: the Ministry of Interior and the Police authority) and to Europol for the purposes of the prevention, detection and investigation of terrorist offences and of other serious criminal offences. The Ministry of Foreign Affairs and International Cooperation (Piazzale della Farnesina 1, 00135 Roma, www.esteri.it, dgit6@esteri.it) is the Italian authority responsible (controller) for processing the data.<br/>You have the right to obtain in any of the Member States communication of the data relating to you recorded in the VIS and of the Member State which transmitted the data, and to request that the data relating to you which are inaccurate be corrected, and that the data relating to you processed unlawfully be deleted. For information on the exercise of your right to check your personal data and have them corrected or deleted, as well as on legal remedies according to the national law of the State concerned, see http://www.esteri.it and http://vistoperitalia.esteri.it.<br/>Further information will be provided upon request by the authority examining your application. The Italian national supervisory competent authority on the protection of personal data is the Italian Authority for Data Protection (Piazza di Montecitorio 121, 00186 Roma, http://www.garanteprivacy.it; tel.: +3906 696771).`;

export function buildInvitationLetterHtml(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)): string {
  const inviter = data.inviter;
  const invitee = data.invitee;
  return `${templateStyles}<div class="invitation-document">
    <section class="invitation-paper-page">
      <header class="invitation-header"><svg class="italian-flag" viewBox="0 0 3 2" role="img" aria-label="Bandera de Italia"><rect width="1" height="2" x="0" fill="#009246"/><rect width="1" height="2" x="1" fill="#ffffff"/><rect width="1" height="2" x="2" fill="#ce2b37"/></svg><div class="header-block"><strong>DICHIARAZIONE GARANZIA E/O<br/>ALLOGGIO</strong><span>Ai sensi dell’art. 14 p.4 Codice Visti e dell’art. 9<br/>p. 4 Regolamento VIS</span></div><div class="header-block"><strong>PROOF OF SPONSORSHIP AND/OR<br/>PRIVATE ACCOMMODATION</strong><span>According to art. 14 p.4 Visa Code and to art. 9<br/>p. 4 VIS Regulation</span></div></header>
      <div class="intro-grid"><strong>Io Sottoscritto/a</strong><em>I, the undersigned</em></div>
      <table class="form-table"><tbody>
        <tr><td class="person-label">Nome/Name</td><td class="value" colspan="3">${display(inviter.firstName)}</td></tr><tr><td class="person-label">Cognome/Surname</td><td class="value" colspan="3">${display(inviter.lastName)}</td></tr><tr><td>Data di nascita/Date of birth</td><td class="value">${display(titleCaseDate(inviter.birthDate))}</td><td>Luogo di nascita/ Place of birth</td><td class="value">${display(italian.inviter.birthPlace)}</td></tr><tr><td>Nazionalità/Nationality</td><td class="value" colspan="3">${display(italian.inviter.nationality)}</td></tr><tr><td>Documento di identità/Identity card</td><td class="value" colspan="3">${display(inviter.identityCard)}</td></tr><tr><td>Passaporto/Passport</td><td class="value" colspan="3">${display(inviter.passport)}</td></tr><tr><td>Permesso di soggiorno/Residence permit</td><td class="value" colspan="3">${display(italian.inviter.residencePermit)}</td></tr><tr><td>Indirizzo/Address</td><td class="value" colspan="3">${display(italian.inviter.address)}</td></tr><tr><td>Professione/Occupation</td><td class="value" colspan="3">${display(italian.inviter.occupation)}</td></tr><tr><td>Tel: <span class="value">${display(inviter.phone)}</span></td><td colspan="3">email: <span class="value">${display(inviter.email)}</span></td></tr>
      </tbody></table>
      <div class="company-heading"><strong>Solo per le Società o Organizzazione</strong><em>Only for Companies or Organizations</em></div><table class="form-table"><tbody><tr><td>Ragione sociale /Company Name</td><td class="value"></td></tr><tr><td>Sede legale /Company Address</td><td class="value"></td></tr><tr><td>Qualifica e nome /Position and Name:</td><td class="value"></td></tr><tr><td>Tel:</td><td>email:</td></tr></tbody></table>
      <div class="declaration"><span class="box">${check(data.accommodationDeclared)}</span>dichiaro di voler ospitare/<em>declare being able to accomodate:</em><br/><span class="accommodation-subline"><span class="box">${check(data.accommodationAtHome)}</span>presso la mia abitazione / <em>at my abovementioned address</em></span><br/><span class="accommodation-subline"><span class="box">${check(data.accommodationAtOtherAddress)}</span>al seguente indirizzo/ <em>at the following address</em></span></div>
      <table class="form-table"><tbody>
        <tr><td>Nome/Name</td><td class="value" colspan="3">${display(invitee.firstName)}</td></tr><tr><td>Cognome/Surname</td><td class="value" colspan="3">${display(invitee.lastName)}</td></tr><tr><td>Data di nascita/Date of birth</td><td class="value">${display(titleCaseDate(invitee.birthDate))}</td><td>Luogo di nascita/ Place of birth</td><td class="value">${display(italian.invitee.birthPlace)}</td></tr><tr><td>Nazionalità/Nationality</td><td class="value" colspan="3">${display(italian.invitee.nationality)}</td></tr><tr><td>Passaporto/Passport</td><td class="value" colspan="3">${display(invitee.passport)}</td></tr><tr><td>Indirizzo/Address</td><td class="value" colspan="3">${display(italian.invitee.address)}</td></tr><tr><td>Professione/Occupation</td><td class="value" colspan="3">${display(italian.invitee.occupation)}</td></tr>
      </tbody></table>
    </section>
    <section class="invitation-paper-page template-page-two">
      <table class="form-table"><tbody><tr><td>Relazione con l’invitante/Relationship to the invitee familiare/family member</td><td class="value">${display(italian.relationship)}</td></tr><tr><td>per la seguente finalità/ for the following reason</td><td class="value">${display(italian.purpose)}</td></tr><tr><td>per il periodo dal/from <span class="value">${display(titleCaseDate(data.arrivalDate))}</span> al/to <span class="value">${display(titleCaseDate(data.departureDate))}</span></td><td></td></tr></tbody></table>
      <div class="legal-declaration"><span class="box">${check(data.financialSupport)}</span>dichiaro di farmi carico delle sue spese di sostentamento durante il soggiorno / <em>declare being able to bear his\her living costs during the abovementioned period of stay</em></div>
      <div class="legal-declaration"><span class="box">${check(data.healthInsurance)}</span>dichiaro di avere stipulato in suo nome l’assicurazione sanitaria / <em>declare to have subscribed health insurance on his\her behalf</em></div>
      <div class="legal-declaration"><span class="box">${check(data.financialGuarantee)}</span>dichiaro di aver messo a sua disposizione, a titolo di garanzia economica, sotto forma di “fideiussione bancaria” (v. allegato), la somma di euro &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; presso l’Istituto bancario &nbsp;&nbsp;&nbsp;&nbsp; Agenzia n. &nbsp;&nbsp;&nbsp;&nbsp; sita in &nbsp;&nbsp;&nbsp;&nbsp; / <em>declare to have made available on his\her, as financial guarantee (see annex), the sum of € &nbsp;&nbsp;&nbsp;&nbsp; in the following bank &nbsp;&nbsp;&nbsp;&nbsp; branch &nbsp;&nbsp;&nbsp;&nbsp; address</em></div>
      <div class="legal-declaration"><span class="box">☑</span>sono consapevole che, ai sensi dell’art. 7 del D. Lgs. n. 286/1998 e s.m.i., sono tenuto a comunicare all’autorità di P.S. di zona, la presenza del cittadino straniero presso la mia abitazione, entro 48 ore dalla sua entrata nel territorio italiano/ <em>am aware that, in accordance with Art. 7 of Legislative Decree n. 286/1998 and subsequent modifications, I shall notify the local police headquarters of the presence of the foreign national in my home, within 48 hours from the time he \ she entered Italian territory</em></div>
      <div class="legal-declaration"><span class="box">☑</span>sono consapevole delle responsabilità penali previste dall’art. 12 del D. Lgs. n. 286/98 e s.m.i. / &nbsp; <em>am aware of the penal responsibilities foreseen by art. 12 of Legislative Decree n. 286/1998 and subsequent modifications.</em></div>
    </section>
    <section class="invitation-paper-page template-page-three">
      <div class="privacy-grid"><div class="privacy-box"><h3>INFORMATIVA SUL TRATTAMENTO DEI<br/>DATI PERSONALI:</h3>${privacyItalian}</div><div class="privacy-box"><h3>INFORMATION ON THE PROCESSING OF<br/>PERSONAL DATA</h3>${privacyEnglish}</div></div>
      <div class="footer-grid"><span>Luogo/Place &nbsp;<b>${display(italian.city)}</b></span><span>Data/ Date &nbsp; <b>${display(titleCaseDate(data.date))}</b></span><span>Firma/ Signature</span></div>
      <div class="annexes">Allegati/Annexes:<br/><span>${check(data.inviteeIdAttached)}</span> documento d’identità dell’invitante/ identity card of the person issuing the invitation<br/><span>${check(data.financialGuaranteeAttached)}</span> fideiussione bancaria / financial guarantee<br/><span>${check(Boolean(data.otherAnnexes?.trim()))}</span> altri documenti/ other documents: <span class="line">${display(data.otherAnnexes)}</span><div class="annexes-company">Allegati per le Società-Enti / Annexes for<div class="empty">${displayMultiline(data.companyAnnexes)}</div></div></div>
    </section>
  </div>`;
}

export function buildInvitationLetterText(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)): string {
  return buildInvitationLetterHtml(data, italian).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function createLetterContainer(data: InvitationLetterData, italian: InvitationLetterItalian) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.innerHTML = buildInvitationLetterHtml(data, italian);
  document.body.appendChild(container);
  await new Promise(resolve => window.setTimeout(resolve, 120));
  return container;
}

export async function downloadInvitationLetterPdf(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const container = await createLetterContainer(data, italian);
  try {
    const pages = Array.from(container.querySelectorAll<HTMLElement>(".invitation-paper-page"));
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    for (let index = 0; index < pages.length; index += 1) {
      const canvas = await html2canvas(pages[index], { backgroundColor: "#ffffff", scale: 2, logging: false, useCORS: true });
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
    const filename = `${buildInvitationLetterFilename(data)}.pdf`;
    pdf.save(filename);
    return filename;
  } finally { container.remove(); }
}

export function printInvitationLetter(data: InvitationLetterData, italian: InvitationLetterItalian = buildInvitationLetterItalianFallback(data)) {
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) throw new Error("Permite las ventanas emergentes para imprimir la carta.");
  printWindow.document.write(`<!doctype html><html><head><title>${buildInvitationLetterFilename(data)}</title></head><body>${buildInvitationLetterHtml(data, italian)}</body></html>`);
  printWindow.document.close();
  printWindow.onload = () => { printWindow.focus(); printWindow.print(); };
  printWindow.onafterprint = () => { if (!printWindow.closed) printWindow.close(); };
  window.setTimeout(() => { if (!printWindow.closed) printWindow.close(); }, 1200);
}
