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
});

