import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  searchClients: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, searchClients: dbMocks.searchClients };
});

import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(9, "registrador"))}` },
    } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("admin.searchClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.searchClients.mockResolvedValue([
      {
        id: 21,
        name: "Ana",
        lastName: "Pérez",
        dni: "71234567",
        phone: "+51 970188447",
        email: null,
      },
    ]);
  });

  it("returns persistent client matches for a registrador query", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.searchClients({ query: "71234567", limit: 8 });

    expect(result[0]).toMatchObject({ id: 21, name: "Ana", lastName: "Pérez", dni: "71234567" });
    expect(dbMocks.searchClients).toHaveBeenCalledWith("71234567", 8);
  });

  it("rejects queries shorter than two characters", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.admin.searchClients({ query: "A", limit: 8 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.searchClients).not.toHaveBeenCalled();
  });
});
