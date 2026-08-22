import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;
const CODE_TTL_MINUTES = 10;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "").trim();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hashHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length === 0) return false;
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateVerificationCode(): string {
  return String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
}

export function generateTemporaryPassword(): string {
  return `Si!${randomBytes(9).toString("base64url")}9a`;
}

export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function verificationExpiry(): Date {
  return new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();

  if (!host || !user || !password) {
    throw new Error("El servicio de correo no está configurado.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    tls: { minVersion: "TLSv1.2" },
    auth: { user, pass: password },
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const from = process.env.SMTP_FROM?.trim() || "peruservicom@gmail.com";
  const transporter = getSmtpTransport();
  await transporter.sendMail({
    from,
    to: email,
    subject: "Código de recuperación — Servicom Internacional",
    text: `Tu código de verificación es ${code}. Vence en ${CODE_TTL_MINUTES} minutos. Si no solicitaste este código, ignora este mensaje.`,
    html: `<p>Tu código de verificación es <strong>${code}</strong>.</p><p>Vence en ${CODE_TTL_MINUTES} minutos. Si no solicitaste este código, ignora este mensaje.</p>`,
  });
}

export async function sendInvitationLetterSignatureEmail(input: { email: string; signerName: string; signatureUrl: string }): Promise<void> {
  const from = process.env.SMTP_FROM?.trim() || "peruservicom@gmail.com";
  const transporter = getSmtpTransport();
  await transporter.sendMail({
    from,
    to: input.email,
    subject: "Firma pendiente — Carta de invitación | Servicom Internacional",
    text: `Hola ${input.signerName}. Tienes una Carta de invitación pendiente de firma electrónica. Abre el enlace seguro para revisar y firmar: ${input.signatureUrl}`,
    html: `<p>Hola <strong>${input.signerName}</strong>.</p><p>Tienes una <strong>Carta de invitación</strong> pendiente de firma electrónica.</p><p><a href="${input.signatureUrl}">Revisar y firmar la Carta</a></p><p>Si no reconoces esta solicitud, ignora este correo.</p>`,
  });
}

export async function sendShipmentSignatureEmail(input: { email: string; signerName: string; signatureUrl: string }): Promise<void> {
  const from = process.env.SMTP_FROM?.trim() || "peruservicom@gmail.com";
  const transporter = getSmtpTransport();
  await transporter.sendMail({
    from,
    to: input.email,
    subject: "Firma pendiente de envío | Servicom Internacional",
    text: `Hola ${input.signerName}. Un Administrador o Registrador de Servicom te envió una solicitud de firma electrónica. Inicia sesión con tu cuenta Cliente y abre este enlace seguro para revisar y firmar: ${input.signatureUrl}`,
    html: `<p>Hola <strong>${input.signerName}</strong>.</p><p>Un <strong>Administrador o Registrador</strong> te envió una solicitud de firma electrónica para tu envío.</p><p>Inicia sesión con tu cuenta Cliente y luego abre el enlace seguro:</p><p><a href="${input.signatureUrl}">Revisar y firmar el envío</a></p><p>Si no reconoces esta solicitud, ignora este correo.</p>`,
  });
}

export async function sendVerificationSms(phone: string, code: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !authToken || !from) {
    throw new Error("El servicio SMS no está configurado.");
  }

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: `Servicom Internacional: tu código de recuperación es ${code}. Vence en ${CODE_TTL_MINUTES} minutos.`,
  });
  const authorization = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`No se pudo enviar el SMS de verificación (${response.status}).`);
  }
}
