import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { createSignatureToken, hashSignatureToken, isSignatureTokenExpired, signatureTokenMatches } from "./signatureTokens";

const dbMocks = vi.hoisted(() => ({
  getShipmentByOrderAndCode: vi.fn(),
  getShipmentSignatureByShipmentId: vi.fn(),
  createOrRefreshShipmentSignatureRequest: vi.fn(),
  completeShipmentSignature: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getShipmentByOrderAndCode: dbMocks.getShipmentByOrderAndCode,
    getShipmentSignatureByShipmentId: dbMocks.getShipmentSignatureByShipmentId,
    createOrRefreshShipmentSignatureRequest: dbMocks.createOrRefreshShipmentSignatureRequest,
    completeShipmentSignature: dbMocks.completeShipmentSignature,
  };
});

function publicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

const shipment = { id: 81, orderNumber: "3520992723", code: "CA06721WB", events: "[]", shipmentType: "documento", deliveryMode: "remoto" } as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signature token security", () => {
  it("creates a random hash and an expiration window", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");
    const result = createSignatureToken(now);
    expect(result.token).toHaveLength(43);
    expect(result.tokenHash).toBe(hashSignatureToken(result.token));
    expect(result.expiresAt.getTime() - now.getTime()).toBe(30 * 60 * 1000);
    expect(signatureTokenMatches(result.token, result.tokenHash)).toBe(true);
    expect(signatureTokenMatches("token-diferente", result.tokenHash)).toBe(false);
    expect(isSignatureTokenExpired(result.expiresAt, now)).toBe(false);
    expect(isSignatureTokenExpired(result.expiresAt, new Date(result.expiresAt.getTime() + 1))).toBe(true);
  });

  it("issues a public signing session for a shipment created by an operator", async () => {
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue(shipment);
    dbMocks.getShipmentSignatureByShipmentId.mockResolvedValue(undefined);
    dbMocks.createOrRefreshShipmentSignatureRequest.mockImplementation(async ({ shipmentId, tokenHash, expiresAt }) => ({
      shipmentId,
      requestTokenHash: tokenHash,
      requestTokenExpiresAt: expiresAt,
      status: "pending",
    }));

    const caller = appRouter.createCaller(publicContext());
    const result = await caller.shipment.requestSignature({ orderNumber: shipment.orderNumber, code: shipment.code });

    expect(result.status).toBe("pending");
    expect(result.token).toBeTruthy();
    expect(dbMocks.createOrRefreshShipmentSignatureRequest).toHaveBeenCalledWith(expect.objectContaining({ shipmentId: 81 }));
  });

  it("rejects an invalid token before writing a signature", async () => {
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue(shipment);
    dbMocks.getShipmentSignatureByShipmentId.mockResolvedValue({
      shipmentId: 81,
      status: "pending",
      requestTokenHash: hashSignatureToken("token-correcto-1234567890"),
      requestTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const caller = appRouter.createCaller(publicContext());
    await expect(caller.shipment.completeSignature({
      orderNumber: shipment.orderNumber,
      code: shipment.code,
      token: "token-incorrecto-1234567890",
      signerName: "Ana Pérez",
      signatureStrokes: JSON.stringify([[{ x: 10, y: 20 }, { x: 80, y: 40 }]]),
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.completeShipmentSignature).not.toHaveBeenCalled();
  });

  it("completes a valid signature and rejects a second signature state", async () => {
    const token = "token-correcto-1234567890";
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue(shipment);
    dbMocks.getShipmentSignatureByShipmentId
      .mockResolvedValueOnce({
        shipmentId: 81,
        status: "pending",
        requestTokenHash: hashSignatureToken(token),
        requestTokenExpiresAt: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({ shipmentId: 81, status: "signed", signerName: "Ana Pérez", signedAt: new Date() });
    dbMocks.completeShipmentSignature.mockResolvedValue({ shipmentId: 81, status: "signed", signerName: "Ana Pérez", signedAt: new Date() });

    const caller = appRouter.createCaller(publicContext());
    const result = await caller.shipment.completeSignature({
      orderNumber: shipment.orderNumber,
      code: shipment.code,
      token,
      signerName: "Ana Pérez",
      signerDni: "70445566",
      signatureStrokes: JSON.stringify([[{ x: 10, y: 20 }, { x: 80, y: 40 }]]),
    });

    expect(result.status).toBe("signed");
    expect(dbMocks.completeShipmentSignature).toHaveBeenCalledWith(expect.objectContaining({ shipmentId: 81, signerName: "Ana Pérez" }));
  });
});
