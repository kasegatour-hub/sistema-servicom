import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { hashSignatureToken } from "./signatureTokens";

const dbMocks = vi.hoisted(() => ({
  getRecipientChangeRequestById: vi.fn(),
  getShipmentById: vi.fn(),
  getLocalAccountById: vi.fn(),
  completeRecipientChangeRequest: vi.fn(),
  getDb: vi.fn(),
  shipmentSenderMatchesAccount: vi.fn(),
  createRecipientChangeRequest: vi.fn(),
  markRecipientChangeRequestNotified: vi.fn(),
  notifyAccountEvent: vi.fn(),
  updateShipmentStatus: vi.fn(),
  recordShipmentAudit: vi.fn(),
  recordInteractionEvent: vi.fn(),
}));
const sessionMocks = vi.hoisted(() => ({ getAccountSession: vi.fn(), getAdminSession: vi.fn() }));
const mailMocks = vi.hoisted(() => ({ sendRecipientChangeSignatureEmail: vi.fn() }));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});
vi.mock("./localSession", () => ({ getAccountSession: sessionMocks.getAccountSession }));
vi.mock("./adminSession", () => ({ getAdminSession: sessionMocks.getAdminSession }));
vi.mock("./localAuth", async () => {
  const actual = await vi.importActual<typeof import("./localAuth")>("./localAuth");
  return { ...actual, sendRecipientChangeSignatureEmail: mailMocks.sendRecipientChangeSignatureEmail };
});

function context(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: { host: "servicom.test" }, get: () => "servicom.test" } as TrpcContext["req"], res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"] };
}

const validToken = "cambio-destinatario-token-seguro-1234567890";
const request = {
  id: 44,
  shipmentId: 81,
  accountId: 77,
  status: "pending",
  requestTokenHash: hashSignatureToken(validToken),
  requestTokenExpiresAt: new Date(Date.now() + 60_000),
  senderName: "Ana",
  senderLastName: "Pérez",
  newRecipientName: "Luis",
  newRecipientLastName: "Torres",
  newRecipientDni: "70445566",
  newRecipientDocumentType: "dni_peru",
  newRecipientPhone: "+51999111222",
} as any;
const shipment = { id: 81, orderNumber: "0826-0019", code: "7ABC", registeredByEmail: "magda.barreto.alv@gmail.com", registeredById: 210001 } as any;

beforeEach(() => {
  vi.clearAllMocks();
  sessionMocks.getAccountSession.mockReturnValue(undefined);
  sessionMocks.getAdminSession.mockReturnValue(undefined);
  dbMocks.getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) });
  dbMocks.getRecipientChangeRequestById.mockResolvedValue(request);
  dbMocks.getShipmentById.mockResolvedValue(shipment);
  dbMocks.shipmentSenderMatchesAccount.mockReturnValue(false);
  dbMocks.createRecipientChangeRequest.mockResolvedValue({ id: 44 });
  dbMocks.updateShipmentStatus.mockResolvedValue(true);
  dbMocks.recordShipmentAudit.mockResolvedValue(undefined);
  dbMocks.recordInteractionEvent.mockResolvedValue(undefined);
  mailMocks.sendRecipientChangeSignatureEmail.mockResolvedValue(undefined);
});

describe("firma de cambio de destinatario", () => {
  it("rechaza un token incorrecto antes de revelar la declaración", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.recipientChangeSignature.get({ requestId: 44, token: "token-incorrecto-para-cambio-123456" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("mantiene protegida la declaración ya firmada frente a enlaces distintos", async () => {
    dbMocks.getRecipientChangeRequestById.mockResolvedValue({ ...request, status: "signed", signedAt: new Date() });
    const caller = appRouter.createCaller(context());
    await expect(caller.recipientChangeSignature.get({ requestId: 44, token: "token-incorrecto-para-cambio-123456" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requiere la cuenta Cliente vinculada cuando el remitente fue validado", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.recipientChangeSignature.complete({ requestId: 44, token: validToken, signatureStrokes: JSON.stringify([[{ x: 10, y: 20 }, { x: 90, y: 60 }]]) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.completeRecipientChangeRequest).not.toHaveBeenCalled();
  });

  it("aplica el cambio solo después de una firma válida de la cuenta remitente", async () => {
    sessionMocks.getAccountSession.mockReturnValue({ accountId: 77 });
    dbMocks.getLocalAccountById.mockResolvedValue({ id: 77, name: "Ana", lastName: "Pérez", email: "ana@example.com" });
    dbMocks.completeRecipientChangeRequest.mockResolvedValue({ status: "signed", signedAt: new Date(), signerName: "Ana Pérez" });
    const caller = appRouter.createCaller(context());
    const result = await caller.recipientChangeSignature.complete({ requestId: 44, token: validToken, signatureStrokes: JSON.stringify([[{ x: 10, y: 20 }, { x: 90, y: 60 }]]) });
    expect(result.status).toBe("signed");
    expect(dbMocks.completeRecipientChangeRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 44, signerAccountId: 77, signerEmail: "ana@example.com" }));
  });

  it("notifica por cuenta y correo solo cuando el remitente coincide con la cuenta Cliente", async () => {
    sessionMocks.getAdminSession.mockReturnValue({ adminId: 4, role: "registrador", reauthRequired: false, isWorkspaceIsolated: false });
    dbMocks.getShipmentById.mockResolvedValue({ ...shipment, registeredByType: "account", registeredById: null, accountId: 77, senderName: "Ana", senderLastName: "Pérez", senderDni: "70445566", senderDocumentType: "dni_peru", senderPhone: "+51999111222", recipientName: "Marco", recipientLastName: "Rossi", recipientDni: "70111222", recipientDocumentType: "dni_peru", recipientPhone: "+39350111222" });
    dbMocks.getLocalAccountById.mockResolvedValue({ id: 77, name: "Ana", lastName: "Pérez", email: "ana@example.com" });
    dbMocks.shipmentSenderMatchesAccount.mockReturnValue(true);
    const caller = appRouter.createCaller(context());
    const result = await caller.admin.requestRecipientChange({ shipmentId: 81, recipientName: "Luis", recipientLastName: "Torres", recipientDni: "70445566", recipientDocumentType: "dni_peru", recipientPhone: "+51999111222" });
    expect(result.accountNotified).toBe(true);
    expect(result.requiresManualDelivery).toBe(false);
    expect(dbMocks.notifyAccountEvent).toHaveBeenCalledWith(expect.objectContaining({ accountId: 77, kind: "recipient_change_signature" }));
    expect(mailMocks.sendRecipientChangeSignatureEmail).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@example.com", signatureUrl: expect.stringContaining("cambio-destinatario") }));
  });

  it("conserva el entorno de Magdalena al notificar una firma a la cuenta Cliente", async () => {
    sessionMocks.getAdminSession.mockReturnValue({ adminId: 210001, role: "superadmin", reauthRequired: false, isWorkspaceIsolated: true });
    dbMocks.getShipmentById.mockResolvedValue({ ...shipment, registeredByType: "admin", registeredById: 210001, accountId: 77, senderName: "Ana", senderLastName: "Pérez", senderDni: "70445566", senderDocumentType: "dni_peru", senderPhone: "+51999111222", recipientName: "Marco", recipientLastName: "Rossi", recipientDni: "70111222", recipientDocumentType: "dni_peru", recipientPhone: "+39350111222" });
    dbMocks.getLocalAccountById.mockResolvedValue({ id: 77, name: "Ana", lastName: "Pérez", email: "ana@example.com" });
    dbMocks.shipmentSenderMatchesAccount.mockReturnValue(true);
    const caller = appRouter.createCaller(context());
    await caller.admin.requestRecipientChange({ shipmentId: 81, recipientName: "Luis", recipientLastName: "Torres", recipientDni: "70445566", recipientDocumentType: "dni_peru", recipientPhone: "+51999111222" });
    expect(dbMocks.notifyAccountEvent).toHaveBeenCalledWith(expect.objectContaining({ accountId: 77, workspaceAdminId: 210001 }));
  });

  it("solo entrega el enlace manualmente cuando no puede validar al remitente contra la cuenta", async () => {
    sessionMocks.getAdminSession.mockReturnValue({ adminId: 4, role: "registrador", reauthRequired: false, isWorkspaceIsolated: false });
    dbMocks.getShipmentById.mockResolvedValue({ ...shipment, registeredByType: "account", registeredById: null, accountId: 77, senderName: "Ana", senderLastName: "Pérez", senderDni: "70445566", senderDocumentType: "dni_peru", senderPhone: "+51999111222", recipientName: "Marco", recipientLastName: "Rossi", recipientDni: "70111222", recipientDocumentType: "dni_peru", recipientPhone: "+39350111222" });
    dbMocks.getLocalAccountById.mockResolvedValue({ id: 77, name: "Otra", lastName: "Persona", email: "otra@example.com" });
    const caller = appRouter.createCaller(context());
    const result = await caller.admin.requestRecipientChange({ shipmentId: 81, recipientName: "Luis", recipientLastName: "Torres", recipientDni: "70445566", recipientDocumentType: "dni_peru", recipientPhone: "+51999111222" });
    expect(result.accountNotified).toBe(false);
    expect(result.requiresManualDelivery).toBe(true);
    expect(result.deliveryMode).toBe("manual");
    expect(result.accountMatched).toBe(false);
    expect(result.signatureUrl).toContain("cambio-destinatario");
    expect(dbMocks.notifyAccountEvent).not.toHaveBeenCalled();
    expect(mailMocks.sendRecipientChangeSignatureEmail).not.toHaveBeenCalled();
  });

  it("genera un enlace manual para un remitente sin cuenta y permite firmar sin sesión", async () => {
    sessionMocks.getAdminSession.mockReturnValue({ adminId: 4, role: "registrador", reauthRequired: false, isWorkspaceIsolated: false });
    dbMocks.getShipmentById.mockResolvedValue({ ...shipment, accountId: null, senderName: "Remitente", senderLastName: "Sin Cuenta", senderDni: "70445566", senderDocumentType: "dni_peru", senderPhone: "+51999111222", recipientName: "Marco", recipientLastName: "Rossi", recipientDni: "70111222", recipientDocumentType: "dni_peru", recipientPhone: "+39350111222" });
    dbMocks.completeRecipientChangeRequest.mockResolvedValue({ status: "signed", signedAt: new Date(), signerName: "Remitente Sin Cuenta" });
    dbMocks.getRecipientChangeRequestById.mockResolvedValue({ ...request, accountId: null, senderName: "Remitente", senderLastName: "Sin Cuenta" });
    const caller = appRouter.createCaller(context());
    const generated = await caller.admin.requestRecipientChange({ shipmentId: 81, recipientName: "Luis", recipientLastName: "Torres", recipientDni: "70445566", recipientDocumentType: "dni_peru", recipientPhone: "+51999111222" });
    expect(generated.deliveryMode).toBe("manual");
    expect(generated.requiresManualDelivery).toBe(true);
    expect(generated.accountNotified).toBe(false);
    expect(generated.emailSent).toBe(false);
    expect(dbMocks.createRecipientChangeRequest).toHaveBeenCalledWith(expect.objectContaining({ accountId: null }));
    expect(dbMocks.notifyAccountEvent).not.toHaveBeenCalled();
    expect(mailMocks.sendRecipientChangeSignatureEmail).not.toHaveBeenCalled();

    const signed = await caller.recipientChangeSignature.complete({ requestId: 44, token: validToken, signatureStrokes: JSON.stringify([[{ x: 10, y: 20 }, { x: 90, y: 60 }]]) });
    expect(signed.status).toBe("signed");
    expect(dbMocks.completeRecipientChangeRequest).toHaveBeenCalledWith(expect.objectContaining({ requestId: 44, signerAccountId: null, signerEmail: null }));
  });

  it("permite modificar directamente el destinatario desde la actualización operativa", async () => {
    sessionMocks.getAdminSession.mockReturnValue({ adminId: 4, role: "registrador", reauthRequired: false, isWorkspaceIsolated: false });
    dbMocks.getShipmentById.mockResolvedValue({ ...shipment, registeredByType: "account", registeredById: null, shipmentType: "documento", documentKind: "simple", documentSheetCount: 3, route: "Lima - Torino", status: "En agencia", senderName: "Ana", senderLastName: "Pérez", senderDni: "70445566", senderDocumentType: "dni_peru", senderPhone: "+51999111222", recipientName: "Marco", recipientLastName: "Rossi", recipientDni: "70111222", recipientDocumentType: "dni_peru", recipientPhone: "+39350111222" });
    const caller = appRouter.createCaller(context());
    await expect(caller.admin.updateStatus({ shipmentId: 81, newStatus: "En tránsito", recipientName: "Luis", recipientLastName: "Torres", recipientDni: "70445566", recipientDocumentType: "dni_peru", recipientPhone: "+51999111222" })).resolves.toMatchObject({ success: true });
    expect(dbMocks.updateShipmentStatus).toHaveBeenCalled();
  });
});
