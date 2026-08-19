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
  it("solicita una salida estructurada y conserva una carta preparada en italiano", async () => {
    const italian = {
      inviter: { birthPlace: "LIMA", nationality: "PERUVIANA", residencePermit: "PERMESSO VALIDO", address: "VIA MURIAGLIO 12", occupation: "COMMERCIANTE" },
      invitee: { birthPlace: "LIMA", nationality: "PERUVIANA", address: "LIMA, PERÙ", occupation: "STUDENTESSA" },
      relationship: "FAMILIARE",
      purpose: "TURISMO / VISITA FAMILIARE",
      city: "TORINO",
    };
    llmMocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(italian) } }] });

    await expect(translateInvitationToItalian(input)).resolves.toEqual(italian);
    expect(llmMocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5-mini", response_format: expect.objectContaining({ type: "json_schema" }) }));
  });
});
