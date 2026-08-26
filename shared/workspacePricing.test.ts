import { describe, expect, it } from "vitest";
import { calculateAdminShipmentPricing } from "./adminPricing";
import { KASEGA_PARCEL_RATE_EUR_PER_KG, SERVICOM_PARCEL_RATE_EUR_PER_KG, getParcelRateEurPerKg, isKasegaPricingWorkspace } from "./workspacePricing";

describe("tarifa de encomiendas por entorno", () => {
  it("reconoce únicamente a Magdalena y Kasega Tour como entornos de tarifa exclusiva", () => {
    expect(isKasegaPricingWorkspace({ workspaceAdminEmail: "magda.barreto.alv@gmail.com" })).toBe(true);
    expect(isKasegaPricingWorkspace({ workspaceAdminEmail: "kasegatour@gmail.com" })).toBe(true);
    expect(isKasegaPricingWorkspace({ workspaceAdminId: 210001 })).toBe(true);
    expect(isKasegaPricingWorkspace({ workspaceAdminEmail: "peruservicom@gmail.com" })).toBe(false);
  });

  it("calcula 13 EUR/kg para Kasega y conserva 15 EUR/kg para Servicom", () => {
    const kasega = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, workspaceAdminEmail: "kasegatour@gmail.com" });
    const servicom = calculateAdminShipmentPricing({ shipmentType: "encomienda", weightKg: 2, workspaceAdminEmail: "peruservicom@gmail.com" });

    expect(getParcelRateEurPerKg({ workspaceAdminEmail: "magda.barreto.alv@gmail.com" })).toBe(KASEGA_PARCEL_RATE_EUR_PER_KG);
    expect(getParcelRateEurPerKg({ workspaceAdminEmail: "peruservicom@gmail.com" })).toBe(SERVICOM_PARCEL_RATE_EUR_PER_KG);
    expect(kasega).toMatchObject({ parcelRateEurPerKg: 13, totalEur: 26 });
    expect(kasega.notes).toContain("2 kg @ 13 EUR/kg");
    expect(servicom).toMatchObject({ parcelRateEurPerKg: 15, totalEur: 30 });
    expect(servicom.notes).toContain("2 kg @ 15 EUR/kg");
  });
});
