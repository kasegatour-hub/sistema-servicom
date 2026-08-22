import { describe, expect, it, vi } from "vitest";
import { buildInvitationLetterReceiptFilename, buildInvitationLetterReceiptHtml, getInvitationLetterTotal } from "./invitationLetterReceipt";

const data = {
  inviter: { firstName: "ANA", lastName: "ROSSI", birthDate: "", birthPlace: "", nationality: "", identityCard: "AA123", passport: "AB123", residencePermit: "", address: "", occupation: "", phone: "+39 351 278 7962", email: "" },
  invitee: { firstName: "MARÍA", lastName: "BIANCHI", birthDate: "", birthPlace: "", nationality: "", identityCard: "", passport: "CD456", residencePermit: "", address: "", occupation: "", phone: "", email: "" },
  relationship: "FAMILIAR", purpose: "TURISMO", arrivalDate: "01/09/2026", departureDate: "30/09/2026", city: "TORINO", date: "19/08/2026", financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "", companyAnnexes: "",
};

describe("invitationLetterReceipt", () => {
  it("suma el precio manual y extras, y conserva el detalle en el comprobante", () => {
    const pricing = { basePriceEur: 15, manualPriceEur: 20, extras: [{ description: "TRÁMITE URGENTE", amountEur: 5 }] };
    expect(getInvitationLetterTotal(pricing)).toBe(25);
    const html = buildInvitationLetterReceiptHtml({ id: 41, data, pricing, signature: { status: "signed", signerName: "ANA ROSSI" } });
    expect(html).toContain("RECIBO DE CARTA DE INVITACIÓN");
    expect(html).toContain("TRÁMITE URGENTE");
    expect(html).toContain("EUR 25.00");
    expect(html).toContain("servicom_logo_final");
  });

  it("diferencia el comprobante de una Carta firmada", () => {
    expect(buildInvitationLetterReceiptFilename({ id: 41, data, signature: { status: "signed" } })).toContain("-firmada");
  });
});
