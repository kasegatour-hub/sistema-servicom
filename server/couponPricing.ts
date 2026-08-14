export const PROMOTIONAL_DISCOUNT_PERCENT = 25;

export type CouponWindow = {
  isActive: number;
  discountPercent: string | number;
  startsAt: Date | string;
  endsAt: Date | string;
};

export function normalizeCouponCode(code?: string | null): string {
  return String(code ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

export function isCouponCurrentlyValid(coupon: CouponWindow | null | undefined, now = new Date()): boolean {
  if (!coupon || Number(coupon.isActive) !== 1 || Number(coupon.discountPercent) !== PROMOTIONAL_DISCOUNT_PERCENT) return false;
  const startsAt = new Date(coupon.startsAt).getTime();
  const endsAt = new Date(coupon.endsAt).getTime();
  const current = now.getTime();
  return Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt <= current && current <= endsAt;
}

export function applyCouponDiscount(basePriceEur: number, coupon: CouponWindow | null | undefined) {
  const safeBasePrice = Math.max(0, Number(basePriceEur) || 0);
  if (!isCouponCurrentlyValid(coupon)) {
    return {
      basePriceEur: Number(safeBasePrice.toFixed(2)),
      discountPercent: 0,
      discountAmountEur: 0,
      finalPriceEur: Number(safeBasePrice.toFixed(2)),
    };
  }

  const discountAmountEur = Number((safeBasePrice * PROMOTIONAL_DISCOUNT_PERCENT / 100).toFixed(2));
  const finalPriceEur = Number((safeBasePrice - discountAmountEur).toFixed(2));
  return {
    basePriceEur: Number(safeBasePrice.toFixed(2)),
    discountPercent: PROMOTIONAL_DISCOUNT_PERCENT,
    discountAmountEur,
    finalPriceEur,
  };
}
