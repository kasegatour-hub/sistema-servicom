import { describe, expect, it } from "vitest";
import { buildInvitationLetterFilename, buildInvitationLetterHtml, buildInvitationLetterText, type InvitationLetterData } from "./invitationLetter";

const data: InvitationLetterData = {
  inviter: { firstName: "Elisabeth", lastName: "Angela", birthDate: "1970-11-09", birthPlace: "Lima, Perú", nationality: "Peruana", identityCard: "CA40175TF", passport: "22252411", residencePermit: "123368849", address: "Via dei Maistreffatelli 9, Torino", occupation: "Comerciante", phone: "+39 348 730 0259", email: "elisabeth@example.com" },
  invitee: { firstName: "María", lastName: "Rossi", birthDate: "1995-04-17", birthPlace: "Lima, Perú", nationality: "Peruana", identityCard: "", passport: "AB1234567", residencePermit: "", address: "Lima, Perú", occupation: "Estudiante", phone: "+51 970188447", email: "maria@example.com" },
  relationship: "Familiar", purpose: "Turismo / visita familiar", arrivalDate: "2026-09-01", departureDate: "2026-09-30", city: "Torino", date: "2026-08-19", financialSupport: true, healthInsurance: true, financialGuarantee: false, inviteeIdAttached: true, financialGuaranteeAttached: false,
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
    expect(letter).toContain("01/09/26");
    expect(letter).toContain("dichiaro di farmi carico delle sue spese di sostentamento");
    expect(letter).toContain("Firma/ Signature");
    expect(html).toContain("DICHIARAZIONE GARANZIA E/O");
    expect(html).toContain("PROOF OF SPONSORSHIP AND/OR");
    expect(html).toContain("/manus-storage/bandera-italiana-carta_95ecacf7.webp");
    expect(letter).not.toContain("Servicom Internacional");
  });
});
