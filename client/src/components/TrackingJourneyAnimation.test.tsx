// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrackingJourneyAnimation } from "./TrackingJourneyAnimation";

describe("TrackingJourneyAnimation", () => {
  it("muestra avión y vehículo en ruta cuando el envío está en tránsito", () => {
    const { container } = render(<TrackingJourneyAnimation status="En tránsito" />);
    expect(screen.getByLabelText("Trayecto del envío: En ruta hacia el destino")).toBeTruthy();
    expect(container.querySelector(".tracking-journey-plane")).toBeTruthy();
    expect(container.querySelector(".tracking-journey-car")).toBeTruthy();
  });

  it("marca visualmente la llegada cuando el envío fue entregado", () => {
    const { container } = render(<TrackingJourneyAnimation status="Entregado" />);
    expect(screen.getByText("Envío entregado correctamente")).toBeTruthy();
    expect(container.querySelector(".tracking-journey-car")?.getAttribute("class")).toContain("is-delivered");
  });
});
