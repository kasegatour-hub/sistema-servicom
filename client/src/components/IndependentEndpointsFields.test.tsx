// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { IndependentEndpointsFields } from "./IndependentEndpointsFields";

describe("IndependentEndpointsFields", () => {
  it("actualiza origen y destino y deriva el tramo provincial", () => {
    const onRouteChange = vi.fn();
    render(<IndependentEndpointsFields route="Lima - Torino" onRouteChange={onRouteChange} />);

    fireEvent.change(screen.getByLabelText("Punto de destino"), { target: { value: "Provincia (Perú)" } });
    expect(onRouteChange).toHaveBeenLastCalledWith("Lima - Provincia", { originPoint: "Lima", destinationPoint: "Provincia (Perú)" });

    fireEvent.change(screen.getByLabelText("Punto de origen"), { target: { value: "Torino" } });
    expect(onRouteChange).toHaveBeenLastCalledWith("Torino - Lima + provincia", { originPoint: "Torino", destinationPoint: "Provincia (Perú)" });
    expect((screen.getByLabelText("Punto de origen") as HTMLSelectElement).value).toBe("Torino");
    expect((screen.getByLabelText("Punto de destino") as HTMLSelectElement).value).toBe("Provincia (Perú)");
  });
});
