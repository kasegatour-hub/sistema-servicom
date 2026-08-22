import { describe, expect, it, vi } from "vitest";

const llmMocks = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => ({ invokeLLM: llmMocks.invokeLLM }));

import { translateInvitationToItalian } from "./admin.router";

const input = {
  inviter: { birthPlace: "LIMA", nationality: "PERUANA", residencePermit: "PERMISO VIGENTE", address: "VIA MURIAGLIO 12", occupation: "COMERCIANTE" },
  invitee: { birthPlace: "LIMA", nationality: "PERUANA", address: "LIMA, PERÚ", occupation: "ESTUDIANTE" },
  relationship: "FAMILIAR",
  purpose: "TURISMO / VISITA FAMILIAR",
  city: "TORINO",
};

describe("translateInvitationToItalian", () => {
  it("prepara la versión italiana localmente sin bloquear la creación de la Carta", async () => {
    await expect(translateInvitationToItalian(input)).resolves.toMatchObject({
      inviter: { nationality: "PERUVIANA", residencePermit: "PERMESSO VIGENTE", occupation: "COMMERCIANTE" },
      invitee: { nationality: "PERUVIANA", address: "LIMA, PERÙ", occupation: "STUDENTE" },
      relationship: "FAMILIARE",
      purpose: "TURISMO / VISITA FAMILIARE",
    });
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("conserva una ocupación ya italiana en la preparación local", async () => {
    const translated = await translateInvitationToItalian({ ...input, inviter: { ...input.inviter, occupation: "BADANTE" } });
    expect(translated.inviter.occupation).toBe("BADANTE");
  });

  it("evita la espera del traductor remoto para una Carta con ocupación italiana conocida", async () => {
    llmMocks.invokeLLM.mockReset();
    const translated = await translateInvitationToItalian({ ...input, inviter: { ...input.inviter, occupation: "BADANTE" }, invitee: { ...input.invitee, occupation: "ESTUDIANTE UNIVERSITARIO" } });

    expect(translated).toMatchObject({ inviter: { occupation: "BADANTE", nationality: "PERUVIANA" }, invitee: { occupation: "STUDENTE UNIVERSITARIO" }, relationship: "FAMILIARE" });
    expect(llmMocks.invokeLLM).not.toHaveBeenCalled();
  });
});
