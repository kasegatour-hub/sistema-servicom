import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAdminByEmail: vi.fn(),
  createAdminPasswordResetCode: vi.fn(),
  getActiveAdminPasswordResetCode: vi.fn(),
  incrementAdminPasswordResetAttempts: vi.fn(),
  updateAdminPassword: vi.fn(),
  consumeAdminPasswordResetCode: vi.fn(),
}));
const emailMocks = vi.hoisted(() => ({ sendVerificationEmail: vi.fn() }));

vi.mock("./db", async () => ({ ...(await vi.importActual<typeof import("./db")>("./db")), ...dbMocks }));
vi.mock("./localAuth", async () => ({ ...(await vi.importActual<typeof import("./localAuth")>("./localAuth")), ...emailMocks }));

import { appRouter } from "./routers";
import { hashPassword, hashVerificationCode } from "./localAuth";

function createPublicContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { cookie: () => {}, clearCookie: () => {} } as TrpcContext["res"] };
}

const admin = { id: 44, email: "operador@servicom.pe", name: "Operador", role: "registrador" as const, isActive: 1, password: "scrypt$test$test", createdAt: new Date(), updatedAt: new Date() };

describe("admin password recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps unknown administrative emails private", async () => {
    dbMocks.getAdminByEmail.mockResolvedValue(undefined);
    const result = await appRouter.createCaller(createPublicContext()).admin.requestPasswordReset({ email: "missing@servicom.pe" });
    expect(result.success).toBe(true);
    expect(emailMocks.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("sends a code only to an active administrative account", async () => {
    dbMocks.getAdminByEmail.mockResolvedValue(admin);
    const result = await appRouter.createCaller(createPublicContext()).admin.requestPasswordReset({ email: admin.email });
    expect(result.success).toBe(true);
    expect(emailMocks.sendVerificationEmail).toHaveBeenCalledWith(admin.email, expect.stringMatching(/^\d{6}$/));
    expect(dbMocks.createAdminPasswordResetCode).toHaveBeenCalledWith(admin.id, admin.email, expect.any(String), expect.any(Date));
  });

  it("applies a short wait before sending another administrative recovery code", async () => {
    dbMocks.getAdminByEmail.mockResolvedValue(admin);
    dbMocks.getActiveAdminPasswordResetCode.mockResolvedValue({ id: 8, adminId: admin.id, destination: admin.email, createdAt: new Date() });
    const result = await appRouter.createCaller(createPublicContext()).admin.requestPasswordReset({ email: admin.email });
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(emailMocks.sendVerificationEmail).not.toHaveBeenCalled();
    expect(dbMocks.createAdminPasswordResetCode).not.toHaveBeenCalled();
  });

  it("updates an administrative password only after a valid unexpired code", async () => {
    dbMocks.getAdminByEmail.mockResolvedValue(admin);
    dbMocks.getActiveAdminPasswordResetCode.mockResolvedValue({ id: 9, adminId: admin.id, destination: admin.email, codeHash: hashVerificationCode("123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0 });
    const result = await appRouter.createCaller(createPublicContext()).admin.resetPassword({ email: admin.email, code: "123456", newPassword: "NuevaClave#2026" });
    expect(result.success).toBe(true);
    expect(dbMocks.updateAdminPassword).toHaveBeenCalledWith(admin.id, expect.stringMatching(/^scrypt\$/));
    expect(dbMocks.consumeAdminPasswordResetCode).toHaveBeenCalledWith(9);
  });

  it("rejects a reset that reuses the current administrative password", async () => {
    const currentPassword = "ClaveActual#2026";
    dbMocks.getAdminByEmail.mockResolvedValue({ ...admin, password: await hashPassword(currentPassword) });
    dbMocks.getActiveAdminPasswordResetCode.mockResolvedValue({ id: 9, adminId: admin.id, destination: admin.email, codeHash: hashVerificationCode("123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0 });

    await expect(appRouter.createCaller(createPublicContext()).admin.resetPassword({ email: admin.email, code: "123456", newPassword: currentPassword })).rejects.toMatchObject({ code: "BAD_REQUEST", message: /no puede ser igual/i });
    expect(dbMocks.updateAdminPassword).not.toHaveBeenCalled();
    expect(dbMocks.consumeAdminPasswordResetCode).not.toHaveBeenCalled();
  });

  it("counts failed code attempts and rejects the reset", async () => {
    dbMocks.getAdminByEmail.mockResolvedValue(admin);
    dbMocks.getActiveAdminPasswordResetCode.mockResolvedValue({ id: 9, adminId: admin.id, destination: admin.email, codeHash: hashVerificationCode("123456"), expiresAt: new Date(Date.now() + 60_000), attempts: 0 });
    await expect(appRouter.createCaller(createPublicContext()).admin.resetPassword({ email: admin.email, code: "999999", newPassword: "NuevaClave#2026" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.incrementAdminPasswordResetAttempts).toHaveBeenCalledWith(9);
    expect(dbMocks.updateAdminPassword).not.toHaveBeenCalled();
  });

  it("rejects a weak administrative password before modifying the account", async () => {
    await expect(appRouter.createCaller(createPublicContext()).admin.resetPassword({ email: admin.email, code: "123456", newPassword: "password123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateAdminPassword).not.toHaveBeenCalled();
  });
});
