import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/mysql-core";
import { shipments } from "../drizzle/schema";

describe("restricción de rastreo de shipments", () => {
  it("distingue los registros por la pareja orden y código, no por la orden global", () => {
    const indexes = getTableConfig(shipments).indexes;
    const trackingIndex = indexes.find(index => index.config.name === "shipments_order_code_unique");

    expect(trackingIndex?.config.unique).toBe(true);
    expect(trackingIndex?.config.columns.map(column => "name" in column ? column.name : String(column))).toEqual(["orderNumber", "code"]);
    expect(indexes.some(index => index.config.unique && index.config.columns.map(column => "name" in column ? column.name : String(column)).join(",") === "orderNumber")).toBe(false);
  });
});
