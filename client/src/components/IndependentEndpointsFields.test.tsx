// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
vi.mock("@/lib/trpc", () => ({
  trpc: {
    agencies: {
      olva: { useQuery: () => ({ data: { agencies: [{ id: "olva-lima", provider: "OLVA COURIER", name: "LIMA CENTRO", address: "Jr. de la Unión 518, Lima, Perú", department: "Lima", province: "Lima", district: "Cercado de Lima", kind: "TIENDA" }] }, isLoading: false, isFetching: false, isError: false }) },
      shalom: { useQuery: () => ({ data: { agencies: [{ id: "shalom-arequipa", provider: "SHALOM", name: "AREQUIPA", address: "Av. Independencia 123, Arequipa, Perú", department: "Arequipa", province: "Arequipa", district: "Arequipa", kind: "AGENCIA" }] }, isLoading: false, isFetching: false, isError: false }) },
    },
  },
}));

import { IndependentEndpointsFields } from "./IndependentEndpointsFields";

describe("IndependentEndpointsFields", () => {
  it("permite buscar sedes con pequeñas diferencias y deriva Provincia → Lima", () => {
    const onRouteChange = vi.fn();
    render(<IndependentEndpointsFields route="Lima - Torino" onRouteChange={onRouteChange} />);

    const origin = screen.getAllByLabelText("Punto de origen").find(element => element.tagName === "INPUT") as HTMLInputElement;
    const destination = screen.getAllByLabelText("Punto de destino").find(element => element.tagName === "INPUT") as HTMLInputElement;
    fireEvent.change(origin, { target: { value: "satipo" } });
    fireEvent.keyDown(origin, { key: "Enter", code: "Enter" });
    fireEvent.change(destination, { target: { value: "lima" } });
    fireEvent.keyDown(destination, { key: "Enter", code: "Enter" });

    expect(onRouteChange).toHaveBeenLastCalledWith("Provincia - Lima", { originPoint: "Provincia (Perú)", destinationPoint: "Lima" }, expect.objectContaining({ origin: expect.objectContaining({ label: expect.stringMatching(/Satipo/i) }), destination: expect.anything() }));
    expect(origin.value).toMatch(/Satipo/i);
    expect(destination.value).toMatch(/Lima/i);
  });

  it("encuentra una sede fija por dirección y conserva su categoría logística", () => {
    const onRouteChange = vi.fn();
    render(<IndependentEndpointsFields route="Lima - Torino" onRouteChange={onRouteChange} />);

    const origin = screen.getAllByLabelText("Punto de origen").find(element => element.tagName === "INPUT") as HTMLInputElement;
    fireEvent.change(origin, { target: { value: "union 518" } });
    fireEvent.keyDown(origin, { key: "Enter", code: "Enter" });

    expect(origin.value).toMatch(/Jr\. de la Unión/);
    expect(screen.getAllByText(/Escribe ciudad, courier, sede o dirección/).length).toBeGreaterThan(0);
  });
});
