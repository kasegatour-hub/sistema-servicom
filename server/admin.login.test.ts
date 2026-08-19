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

  it("requires an authenticated administrative account and its registered email to change a password", async () => {
    const publicCaller = appRouter.createCaller(createPublicContext());
    await expect(publicCaller.admin.changeMyPassword({ email: "admin@servicom.pe", currentPassword: "old-password", newPassword: "NuevaClave#2026" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Sesión administrativa requerida",
    });

    const sessionCaller = appRouter.createCaller(createRoleContext("registrador"));
    await expect(sessionCaller.admin.changeMyPassword({ email: "otra@servicom.pe", currentPassword: "old-password", newPassword: "NuevaClave#2026" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "El correo no coincide con la cuenta administrativa activa.",
    });
  });

  it("requires the selected Registrador email when a Master Admin resets it", async () => {
    const caller = appRouter.createCaller(createRoleContext("superadmin"));
    await expect(caller.admin.updateAdminPassword({ id: 90001, email: "otra@servicom.pe", newPassword: "NuevaClave#2026" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "El correo no coincide con el Registrador seleccionado.",
    });
  });

  it("prevents a Registrador from managing admin users", async () => {
    const caller = appRouter.createCaller(createRoleContext("registrador"));

    await expect(caller.admin.listAdmins()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Solo el Master Admin puede gestionar usuarios",
    });
    await expect(caller.admin.createAdmin({ email: "nuevo@servicom.pe", password: "NuevaClave#2026", name: "Nuevo Operador", role: "registrador" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deactivateAdmin({ id: 30001 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.deleteAdmin({ id: 30001 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow the create form to elevate an operator to Master Admin", async () => {
    const caller = appRouter.createCaller(createRoleContext("superadmin"));

    await expect(caller.admin.createAdmin({ email: "elevacion@servicom.pe", password: "NuevaClave#2026", name: "Operador Valido", role: "superadmin" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
