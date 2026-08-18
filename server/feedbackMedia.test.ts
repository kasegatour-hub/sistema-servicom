import { describe, expect, it } from "vitest";
import { validateFeedbackAttachment } from "./feedbackMedia";

describe("validateFeedbackAttachment", () => {
  it("accepts a supported image and returns sanitized metadata", () => {
    const result = validateFeedbackAttachment({ name: "evidencia final.png", mimeType: "image/png", dataBase64: Buffer.from("imagen").toString("base64") });
    expect(result.safeName).toBe("evidencia-final.png");
    expect(result.sizeBytes).toBe(6);
  });

  it("accepts supported audio and video evidence", () => {
    expect(validateFeedbackAttachment({ name: "nota.mp3", mimeType: "audio/mpeg", dataBase64: Buffer.from("audio").toString("base64") }).sizeBytes).toBe(5);
    expect(validateFeedbackAttachment({ name: "estado.mp4", mimeType: "video/mp4", dataBase64: Buffer.from("video").toString("base64") }).sizeBytes).toBe(5);
  });

  it("rejects unsupported types and files over their media limit", () => {
    expect(() => validateFeedbackAttachment({ name: "archivo.svg", mimeType: "image/svg+xml", dataBase64: "aGVsbG8=" })).toThrow(/Adjunta una imagen/i);
    expect(() => validateFeedbackAttachment({ name: "video.mp4", mimeType: "video/mp4", dataBase64: "x".repeat(21_000_000) })).toThrow(/límite permitido/i);
  });
});
