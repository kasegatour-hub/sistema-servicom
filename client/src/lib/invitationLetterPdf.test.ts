/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadInvitationLetterPdf, type InvitationLetterData } from "./invitationLetter";

const data: InvitationLetterData = {
  inviter: { firstName: "ELISABETH", lastName: "MALLQUI CHAVEZ", birthDate: "1997-11-09", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "CA40175TF", passport: "222052411", residencePermit: "I23368849", address: "VIA DEI MAISTREFRATELLI 9", occupation: "BADANTE", phone: "+39 348 730 0259", email: "elisabeth@example.com" },
  invitee: { firstName: "JUAN", lastName: "CHAVEZ RONDINEL", birthDate: "1995-04-17", birthPlace: "LIMA", nationality: "PERUANA", identityCard: "AA12345BB", passport: "AB1234567", residencePermit: "", address: "LIMA", occupation: "ESTUDIANTE", phone: "+51 970 188 447", email: "" },
  relationship: "FAMILIAR", purpose: "TURISMO", arrivalDate: "2026-09-01", departureDate: "2026-09-30", city: "TORINO", date: "2026-08-19", financialSupport: true, healthInsurance: true, financialGuarantee: false, accommodationDeclared: true, accommodationAtHome: true, accommodationAtOtherAddress: false, inviteeIdAttached: true, financialGuaranteeAttached: false, otherAnnexes: "Copia de pasaporte", companyAnnexes: "Carta de la entidad\nConstancia registral",
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

describe("downloadInvitationLetterPdf", () => {
  it("abre el diálogo nativo con la misma maqueta completa que se imprime", async () => {
    const printWindow = {
      closed: false,
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn(), title: "" },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
      onload: null as null | (() => void),
      onafterprint: null as null | (() => void),
    };
    vi.spyOn(window, "open").mockReturnValue(printWindow as unknown as Window);

    await expect(downloadInvitationLetterPdf(data, undefined, { status: "signed", signerName: "ELISABETH", signedAt: "2026-08-20" })).resolves.toBe("carta-invitacion-juan-chavez-rondinel-2026-08-19-firmada.pdf");

    expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining("DICHIARAZIONE GARANZIA E/O"));
    printWindow.onload?.();
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    expect(printWindow.document.title).toBe("carta-invitacion-juan-chavez-rondinel-2026-08-19-firmada");
  });
});
