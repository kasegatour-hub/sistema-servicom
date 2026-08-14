import { describe, expect, it } from "vitest";
import { applyCouponDiscount, isCouponCurrentlyValid, normalizeCouponCode, PROMOTIONAL_DISCOUNT_PERCENT } from "./couponPricing";

describe("couponPricing", () => {
  const activeCoupon = {
    isActive: 1,
    discountPercent: "25.00",
    startsAt: "2026-08-01T00:00:00.000Z",
    endsAt: "2026-08-31T23:59:59.999Z",
  };

  it("normalizes codes for lookup", () => {
    expect(normalizeCouponCode(" servi25-verano ")).toBe("SERVI25-VERANO");
  });

  it("accepts a coupon inside its calendar window", () => {
    expect(isCouponCurrentlyValid(activeCoupon, new Date("2026-08-14T12:00:00.000Z"))).toBe(true);
    expect(PROMOTIONAL_DISCOUNT_PERCENT).toBe(25);
  });

  it("rejects inactive and out-of-window coupons", () => {
    expect(isCouponCurrentlyValid({ ...activeCoupon, isActive: 0 }, new Date("2026-08-14T12:00:00.000Z"))).toBe(false);
    expect(isCouponCurrentlyValid(activeCoupon, new Date("2026-09-01T00:00:00.000Z"))).toBe(false);
  });

  it("calculates a rounded 25 percent discount and final total", () => {
    expect(applyCouponDiscount(50, activeCoupon)).toEqual({
      basePriceEur: 50,
      discountPercent: 25,
      discountAmountEur: 12.5,
      finalPriceEur: 37.5,
    });
  });

  it("does not discount when the coupon is missing or invalid", () => {
    expect(applyCouponDiscount(45, null)).toEqual({
      basePriceEur: 45,
      discountPercent: 0,
      discountAmountEur: 0,
      finalPriceEur: 45,
    });
  });
});
