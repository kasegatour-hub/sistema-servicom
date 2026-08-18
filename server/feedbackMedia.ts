export const FEEDBACK_MEDIA_LIMITS = {
  image: 5 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 15 * 1024 * 1024,
} as const;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm",
  "video/mp4", "video/webm", "video/quicktime",
]);

export type FeedbackAttachmentInput = {
  name: string;
  mimeType: string;
  dataBase64: string;
};

export function validateFeedbackAttachment(input: FeedbackAttachmentInput) {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new Error("Adjunta una imagen JPG, PNG o WEBP; un audio MP3, M4A, OGG, WAV o WEBM; o un video MP4, WEBM o MOV.");
  }
  const normalizedBase64 = input.dataBase64.replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalizedBase64)) {
    throw new Error("El archivo adjunto no tiene un formato válido.");
  }
  const bytes = Buffer.from(normalizedBase64, "base64");
  const category = input.mimeType.split("/")[0] as keyof typeof FEEDBACK_MEDIA_LIMITS;
  const maximumBytes = FEEDBACK_MEDIA_LIMITS[category];
  if (!maximumBytes || bytes.length === 0 || bytes.length > maximumBytes) {
    const limitMb = Math.round((maximumBytes || 0) / 1024 / 1024);
    throw new Error(`El archivo supera el límite permitido de ${limitMb} MB.`);
  }
  const safeName = input.name.trim().replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120) || "adjunto";
  return { bytes, safeName, sizeBytes: bytes.length };
}
