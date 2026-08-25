import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createAccountSession } from "./localSession";
import { createAdminSession } from "./adminSession";
import { getAdminWorkspaceContext } from "./db";
import type { TrpcContext } from "./_core/context";

function contextWithCookie(cookie: string): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie } } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("feedback administrativo y trazabilidad", () => {
  it("requiere una sesión para consultar la bandeja administrativa", async () => {
    const caller = appRouter.createCaller(contextWithCookie(""));
    await expect(caller.feedback.listAdmin()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("impide que un Cliente consulte el listado global de feedback", async () => {
    const token = createAccountSession(42);
    const caller = appRouter.createCaller(contextWithCookie(`servicom_account_session=${token}`));
    await expect(caller.feedback.listAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite al equipo administrativo consultar solo su entorno", async () => {
    const token = createAdminSession(90001, "registrador");
    const caller = appRouter.createCaller(contextWithCookie(`servicom_admin_session=${token}`));
    const result = await caller.feedback.listAdmin({ authorType: "account", search: "cliente", limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.every(item => item.workspaceKey === "servicom")).toBe(true);
  });

  it("mantiene identificadores distintos para Servicom y espacios aislados", () => {
    expect(getAdminWorkspaceContext(90001, false)).toEqual({ key: "servicom", label: "Servicom Internacional" });
    expect(getAdminWorkspaceContext(210001, true, "magda.barreto.alv@gmail.com")).toEqual({ key: "admin:210001", label: "KASEGA TOUR EIRL" });
  });
});
