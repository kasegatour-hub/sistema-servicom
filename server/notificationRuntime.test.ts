import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyAccountEvent, notifyShipmentEvent } from "./db";
import { notifyOwner } from "./_core/notification";
import { shouldSuppressNotifications } from "./notificationRuntime";

describe("aislamiento de notificaciones durante pruebas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reconoce el entorno Vitest como un contexto sin entregas reales", () => {
    expect(shouldSuppressNotifications()).toBe(true);
  });

  it("no realiza solicitudes externas al notificar al propietario", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(notifyOwner({ title: "Prueba", content: "No entregar" })).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no persiste notificaciones de envíos o cuentas durante pruebas", async () => {
    await expect(notifyShipmentEvent({ shipmentId: 1, orderNumber: "0826-0001", code: "TEST", shipmentType: "documento", action: "updated", actor: { actorType: "system" } })).resolves.toBe(true);
    await expect(notifyAccountEvent({ accountId: 1, title: "Prueba", message: "No persistir", kind: "account_updated", actor: { actorType: "system" } })).resolves.toBe(true);
  });
});

