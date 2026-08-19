import { describe, expect, it, vi } from "vitest";

const recordInteractionEventMock = vi.hoisted(() => vi.fn().mockResolvedValue(false));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, recordInteractionEvent: recordInteractionEventMock };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

const createRoleContext = (): TrpcContext => ({
  user: null,
  req: { protocol: "https", headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(9, "registrador"))}` } } as TrpcContext["req"],
  res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
});

describe("admin.reportPdfDownloadFailure", () => {
  it("registra la anomalía y devuelve un error interno HTTP 500", async () => {
    const caller = appRouter.createCaller(createRoleContext());

    await expect(caller.admin.reportPdfDownloadFailure({ shipmentId: 91, orderNumber: "3520992723", code: "DOC-2026-TEST", message: "Fallo de generación", attempts: 2 })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(recordInteractionEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventName: "pdf_download_failed", surface: "admin", metadata: expect.objectContaining({ shipmentId: 91, attempts: 2 }) }));
  });
});
