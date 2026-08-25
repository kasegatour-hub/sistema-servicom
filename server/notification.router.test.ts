import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createAccountSession } from "./localSession";
import { createAdminSession } from "./adminSession";
import type { TrpcContext } from "./_core/context";

function contextWithCookie(cookie: string): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: { cookie } } as TrpcContext["req"],
    res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("notifications router", () => {
  it("requires an authenticated account or administrator", async () => {
    const caller = appRouter.createCaller(contextWithCookie(""));
    await expect(caller.notifications.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.notifications.markAllRead()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires fresh authentication before exposing account notifications", async () => {
    const staleToken = createAccountSession(42, false, Date.now() - 31 * 60 * 1000);
    const caller = appRouter.createCaller(contextWithCookie(`servicom_account_session=${staleToken}`));
    await expect(caller.notifications.list()).rejects.toMatchObject({ code: "UNAUTHORIZED", message: /vuelve a verificar/i });
  });

  it("accepts an authenticated administrator session as a notification recipient", async () => {
    const token = createAdminSession(90001, "registrador");
    const caller = appRouter.createCaller(contextWithCookie(`servicom_admin_session=${token}`));
    const result = await caller.notifications.list({ limit: 1 });
    expect(result).toMatchObject({ items: expect.any(Array), unreadCount: expect.any(Number) });
  });
});
