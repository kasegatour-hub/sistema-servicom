import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("admin.login", () => {
  it("accepts the configured administrator credential", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.admin.login({
      email: "yeslygian2030@gmail.com",
      password: "Y3sl1G1an2035",
    });

    expect(result.email).toBe("yeslygian2030@gmail.com");
    expect(result.role).toBe("superadmin");
  });

  it("rejects the old mistyped credential", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.admin.login({
        email: "yeslygian2030@gmail.com",
        password: "Y3sl1G1ian2035",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Credenciales inválidas",
    });
  });
});

