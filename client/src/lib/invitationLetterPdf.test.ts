/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";

const html2canvasMock = vi.hoisted(() => vi.fn());
const addPageMock = vi.hoisted(() => vi.fn());
const addImageMock = vi.hoisted(() => vi.fn());
const saveMock = vi.hoisted(() => vi.fn());

vi.mock("html2canvas", () => ({ default: html2canvasMock }));
vi.mock("jspdf", () => ({ jsPDF: vi.fn(() => ({ addPage: addPageMock, addImage: addImageMock, save: saveMock })) }));

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
  it("renderiza las tres páginas, descarga el PDF nombrado y elimina el contenedor temporal", async () => {
    html2canvasMock.mockImplementation(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 630;
      canvas.height = 891;
      return canvas;
    });

    await expect(downloadInvitationLetterPdf(data)).resolves.toBe("carta-invitacion-juan-chavez-rondinel-2026-08-19.pdf");

    expect(html2canvasMock).toHaveBeenCalledTimes(3);
    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(addImageMock).toHaveBeenCalledTimes(3);
    expect(saveMock).toHaveBeenCalledWith("carta-invitacion-juan-chavez-rondinel-2026-08-19.pdf");
    expect(document.querySelector(".invitation-document")).toBeNull();
  });
});
