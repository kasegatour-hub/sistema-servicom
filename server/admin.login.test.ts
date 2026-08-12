import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createRoleContext(role: "registrador" | "superadmin"): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { cookie: `servicom_admin_session=${encodeURIComponent(createAdminSession(9, role))}` },
    } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("admin.login", () => {
  it("accepts the configured administrator credential", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.admin.login({
      email: "peruservicom@gmail.com",
      password: "@m*M.mTt@~ADkHpvBbLm+5CD=3ao@DngYa+3Kea6U=qX%r9EJ8-1QFc#,hD3r4Dsis9:9^i-zZJ}pT#aQAcnm^+XMAhV9u3VdrZ3.",
    });

    expect(result.email).toBe("peruservicom@gmail.com");
    expect(result.role).toBe("superadmin");
  });

  it("accepts the credential even with trailing spaces or newline", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.admin.login({
      email: "PERUSERVICOM@GMAIL.COM",
      password: "  @m*M.mTt@~ADkHpvBbLm+5CD=3ao@DngYa+3Kea6U=qX%r9EJ8-1QFc#,hD3r4Dsis9:9^i-zZJ}pT#aQAcnm^+XMAhV9u3VdrZ3. \n",
    });

    expect(result.email).toBe("peruservicom@gmail.com");
  });

  it("rejects the old mistyped credential", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.admin.login({
        email: "peruservicom@gmail.com",
        password: "wrongpassword",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Credenciales inválidas",
    });
  });

  it("protects shipment queries when no admin session exists", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.admin.getAllShipments()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Sesión administrativa requerida",
    });
  });

  it("prevents a Registrador from managing admin users", async () => {
    const caller = appRouter.createCaller(createRoleContext("registrador"));

    await expect(caller.admin.listAdmins()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Solo el Master Admin puede gestionar usuarios",
    });
    await expect(caller.admin.createAdmin({ email: "nuevo@servicom.pe", password: "password123", name: "Nuevo Operador", role: "registrador" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deactivateAdmin({ id: 30001 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deleteAdmin({ id: 30001 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow the create form to elevate an operator to Master Admin", async () => {
    const caller = appRouter.createCaller(createRoleContext("superadmin"));

    await expect(caller.admin.createAdmin({ email: "elevacion@servicom.pe", password: "password123", name: "Operador Valido", role: "superadmin" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

