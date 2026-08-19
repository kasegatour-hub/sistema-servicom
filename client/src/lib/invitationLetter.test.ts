import { describe, expect, it } from "vitest";
import { buildInvitationLetterFilename, buildInvitationLetterHtml, buildInvitationLetterText, type InvitationLetterData } from "./invitationLetter";

const data: InvitationLetterData = {
  inviter: { firstName: "Elisabeth", lastName: "Angela", birthDate: "1970-11-09", birthPlace: "Lima, Perú", nationality: "Peruana", identityCard: "CA40175TF", passport: "22252411", residencePermit: "123368849", address: "Via dei Maistreffatelli 9, Torino", occupation: "Comerciante", phone: "+39 348 730 0259", email: "elisabeth@example.com" },
  invitee: { firstName: "María", lastName: "Rossi", birthDate: "1995-04-17", birthPlace: "Lima, Perú", nationality: "Peruana", identityCard: "", passport: "AB1234567", residencePermit: "", address: "Lima, Perú", occupation: "Estudiante", phone: "+51 970188447", email: "maria@example.com" },
  relationship: "Familiar", purpose: "Turismo / visita familiar", arrivalDate: "2026-09-01", departureDate: "2026-09-30", city: "Torino", date: "2026-08-19", financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "Copia de pasaporte", companyAnnexes: "Constancia registral\nCarta de la entidad",
};

describe("carta de invitación", () => {
  it("uses the invited person's name and date in the PDF filename", () => {
    expect(buildInvitationLetterFilename(data)).toBe("carta-invitacion-maria-rossi-2026-08-19");
  });

  it("reproduces the supplied Italian and English template blocks without extra text", () => {
    const letter = buildInvitationLetterText(data);
    const html = buildInvitationLetterHtml(data);
    expect(letter).toContain("Elisabeth");
    expect(letter).toContain("Angela");
    expect(letter).toContain("María");
    expect(letter).toContain("Rossi");
    expect(letter).toContain("01/09/2026");
    expect(letter).toContain("19/08/2026");
    expect(letter).toContain("dichiaro di farmi carico delle sue spese di sostentamento");
    expect(letter).toContain("Firma/ Signature");
    expect(html).toContain("DICHIARAZIONE GARANZIA E/O");
    expect(html).toContain("PROOF OF SPONSORSHIP AND/OR");
    expect(html).toContain('viewBox="0 0 3 2"');
    expect(html).toContain("#009246");
    const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
    expect(header.indexOf('class="italian-flag"')).toBeLessThan(header.indexOf("DICHIARAZIONE GARANZIA E/O"));
    expect(header).toContain('class="header-block italian-header"');
    expect(header).toContain('class="header-block english-header"');
    expect(html).toContain('per il periodo dal/from <strong class="period-value">01/09/2026</strong> al/to <strong class="period-value">30/09/2026</strong>');
    expect(html).toContain("Copia de pasaporte");
    expect(html).toContain("Constancia registral");
    expect(html).toContain("Carta de la entidad");
    expect((html.match(/company-annex-line/g) || []).length).toBe(4);
    expect(letter).toContain("presso la mia abitazione");
    expect(letter).not.toContain("Servicom Internacional");
  });
});
