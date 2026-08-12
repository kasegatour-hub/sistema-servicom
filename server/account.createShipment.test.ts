import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createShipment: vi.fn(),
  getShipmentByOrderAndCode: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    createShipment: dbMocks.createShipment,
    getShipmentByOrderAndCode: dbMocks.getShipmentByOrderAndCode,
  };
});

import { appRouter } from "./routers";
import { createAccountSession } from "./localSession";
import type { TrpcContext } from "./_core/context";

function createContext(accountId = 42): TrpcContext {
  const session = createAccountSession(accountId);
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { cookie: `servicom_account_session=${encodeURIComponent(session)}` },
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("account.createMyShipment payment policy", () => {
  beforeEach(() => {
    dbMocks.createShipment.mockReset();
    dbMocks.getShipmentByOrderAndCode.mockReset();
    dbMocks.createShipment.mockResolvedValue({ insertId: 123 });
    dbMocks.getShipmentByOrderAndCode.mockResolvedValue({
      orderNumber: "1234567890",
      code: "DOC-2026-ABCDE",
      events: "[]",
      paymentStatus: "Falta cancelar",
    });
  });

  it("persists pending payment and rejects client-selected payment fields", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.account.createMyShipment({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      docType: "simple",
      sheetCount: 1,
    });

    expect(result.shipment?.paymentStatus).toBe("Falta cancelar");
    expect(dbMocks.createShipment).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(/^DOC-\d{4}-[A-Z0-9]{5}$/),
      "Por entregar en agencia",
      undefined,
      undefined,
      undefined,
      undefined,
      "María",
      "López",
      "71234567",
      undefined,
      expect.stringContaining("Documento Simple"),
      42,
      "Pagará en ITALIA (Torino)",
      "Falta cancelar",
    );

    await expect(caller.account.createMyShipment({
      recipientName: "María",
      recipientLastName: "López",
      recipientDni: "71234567",
      paymentCondition: "Pagado en Lima (Jr. de la Unión 518)",
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
