import { describe, expect, it } from "vitest";
import { invitationLetterDataSchema, invitationLetterPricingSchema } from "./admin.router";

const inviter = { firstName: "ANA", lastName: "ROSSI", birthDate: "01/01/1970", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "AA12345", passport: "AB123456", residencePermit: "PERMISO", address: "VIA ROMA 1", occupation: "COMERCIANTE", phone: "+39 351 278 7962", email: "ana@example.com" };
const invitee = { firstName: "MARÍA", lastName: "BIANCHI", birthDate: "01/01/1995", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "", passport: "AB765432", residencePermit: "", address: "LIMA", occupation: "ESTUDIANTE", phone: "", email: "" };

describe("invitationLetterDataSchema", () => {
  it("acepta al invitado con los únicos campos que figuran en la plantilla", () => {
    const result = invitationLetterDataSchema.safeParse({ inviter, invitee, relationship: "FAMILIAR", purpose: "TURISMO", arrivalDate: "01/09/2026", departureDate: "30/09/2026", city: "TORINO", date: "19/08/2026", financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "", companyAnnexes: "" });

    expect(result.success).toBe(true);
  });

  it("rechaza que el invitante se invite a sí mismo mediante el mismo pasaporte", () => {
    const result = invitationLetterDataSchema.safeParse({ inviter, invitee: { ...invitee, firstName: inviter.firstName, lastName: inviter.lastName, passport: inviter.passport }, relationship: "FAMILIAR", purpose: "TURISMO", arrivalDate: "01/09/2026", departureDate: "30/09/2026", city: "TORINO", date: "19/08/2026", financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "", companyAnnexes: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/deben ser distintas/i);
  });

  it("acepta precio manual y extras detallados, pero no importes negativos", () => {
    expect(invitationLetterPricingSchema.safeParse({ manualPriceEur: 20, extras: [{ description: "TRÁMITE URGENTE", amountEur: 5 }] }).success).toBe(true);
    expect(invitationLetterPricingSchema.safeParse({ manualPriceEur: -1, extras: [] }).success).toBe(false);
    expect(invitationLetterPricingSchema.safeParse({ extras: [{ description: "EXTRA", amountEur: -2 }] }).success).toBe(false);
  });
});
