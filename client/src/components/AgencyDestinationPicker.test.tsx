// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({ trpc: { agencies: { olva: { useQuery: () => ({ data: { agencies: [{ id: "olva-579", provider: "OLVA COURIER", name: "TIENDA CHACHAPOYAS", address: "JR. ORTIZ 270", department: "AMAZONAS", province: "CHACHAPOYAS", district: "CHACHAPOYAS", kind: "TIENDA", latitude: -6.22, longitude: -77.87, sourceUrl: "https://www.olvacourier.com/ubicanos/" }] }, isLoading: false, isError: false }) } } } }));
vi.mock("@/components/Map", () => ({ MapView: () => <div data-testid="agency-map" /> }));

afterEach(cleanup);

import { AgencyDestinationPicker } from "./AgencyDestinationPicker";

describe("AgencyDestinationPicker", () => {
  it("muestra Servicom como alternativa propia y permite abrir el selector de mapa", () => {
    render(<AgencyDestinationPicker route="Torino - Lima" value="" onChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "Usar sede Servicom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Buscar agencias" })).toBeTruthy();
    expect(screen.getByText(/Olva Courier/i)).toBeTruthy();
    expect(screen.getByText(/Shalom/i)).toBeTruthy();
  });

  it("muestra y selecciona una sede oficial de Olva en el explorador", () => {
    const onChange = vi.fn();
    render(<AgencyDestinationPicker route="Lima - Torino" value="DESTINO ACTUAL" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Buscar agencias" }));
    fireEvent.click(screen.getByRole("button", { name: /TIENDA CHACHAPOYAS/i }));
    expect(onChange).toHaveBeenCalledWith("OLVA COURIER — TIENDA CHACHAPOYAS · JR. ORTIZ 270");
  });
});
