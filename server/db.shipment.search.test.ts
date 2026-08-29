import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  drizzle: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: dbMocks.drizzle,
}));

import { getShipmentByOrderAndCode } from "./db";

const fixture = {
  id: 1,
  orderNumber: "3520992723",
  code: "CA06721WB",
  status: "Entregado",
  paymentStatus: "Pagado",
  events: "[]",
};

beforeEach(() => {
  process.env.DATABASE_URL = "mysql://test/test";
  const chain = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: dbMocks.limit }),
      }),
    }),
  };
  dbMocks.drizzle.mockReturnValue(chain);
  dbMocks.limit.mockResolvedValue([fixture]);
});

describe("getShipmentByOrderAndCode", () => {
  it("returns the persisted paymentStatus from the shipments query", async () => {
    const result = await getShipmentByOrderAndCode("352 099 2723", "ca06721wb");

    expect(result?.paymentStatus).toBe("Pagado");
    expect(result?.orderNumber).toBe("3520992723");
    expect(result?.code).toBe("CA06721WB");
  });

  it("permite consultar una orden histórica con y sin guion visual", async () => {
    const result = await getShipmentByOrderAndCode("3520-9927", "CA06721WB");

    expect(result?.orderNumber).toBe("3520992723");
    expect(result?.code).toBe("CA06721WB");
  });
});
