import { describe, expect, it } from "vitest";
import { buildInvitationLetterFilename, buildInvitationLetterText, type InvitationLetterData } from "./invitationLetter";

const data: InvitationLetterData = {
  inviter: { firstName: "Elisabeth", lastName: "Angela", birthDate: "1970-11-09", birthPlace: "Lima, Perú", nationality: "Peruana", identityCard: "CA40175TF", passport: "22252411", residencePermit: "123368849", address: "Via dei Maistreffatelli 9, Torino", occupation: "Comerciante", phone: "+39 348 730 0259", email: "elisabeth@example.com" },
  invitee: { firstName: "María", lastName: "Rossi", birthDate: "1995-04-17", birthPlace: "Lima, Perú", nationality: "Peruana", identityCard: "", passport: "AB1234567", residencePermit: "", address: "Lima, Perú", occupation: "Estudiante", phone: "+51 970188447", email: "maria@example.com" },
  relationship: "Familiar", purpose: "Turismo / visita familiar", arrivalDate: "2026-09-01", departureDate: "2026-09-30", hostingAddress: "Via dei Maistreffatelli 9, Torino", city: "Torino", date: "2026-08-19", financialSupport: true, healthInsurance: true, financialGuarantee: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAttachment: "Copia de contrato de alquiler",
};

describe("carta de invitación", () => {
  it("uses the invited person's name and date in the PDF filename", () => {
    expect(buildInvitationLetterFilename(data)).toBe("carta-invitacion-maria-rossi-2026-08-19");
  });

  it("includes the inviter, invitee, stay period, declarations and attachments", () => {
    const letter = buildInvitationLetterText(data);
    expect(letter).toContain("Elisabeth Angela");
    expect(letter).toContain("María Rossi");
    expect(letter).toContain("2026-09-01 al 2026-09-30");
    expect(letter).toContain("asumir los gastos de sostenimiento");
    expect(letter).toContain("Copia de contrato de alquiler");
    expect(letter).toContain("Firma del invitante");
  });
});
