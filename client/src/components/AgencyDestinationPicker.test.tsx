// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({ trpc: { agencies: { olva: { useQuery: () => ({ data: { agencies: [{ id: "olva-579", provider: "OLVA COURIER", name: "TIENDA CHACHAPOYAS", address: "JR. ORTIZ 270", department: "AMAZONAS", province: "CHACHAPOYAS", district: "CHACHAPOYAS", kind: "TIENDA", latitude: -6.22, longitude: -77.87, sourceUrl: "https://www.olvacourier.com/ubicanos/" }] }, isLoading: false, isError: false }) }, shalom: { useQuery: () => ({ data: { agencies: [{ id: "shalom-raymondi", provider: "SHALOM", name: "JR. RAYMONDI", address: "JR. ANTONIO RAYMONDI NRO. 113", department: "LIMA", province: "LIMA", district: "LA VICTORIA", kind: "AGENCIA", latitude: -12.07, longitude: -77.02, phone: "015007878", businessHours: "08:00 AM A 08:00 PM", sourceUrl: "https://shalom.com.pe/agencias/" }] }, isLoading: false, isError: false }) } } } }));
vi.mock("@/components/Map", () => ({ MapView: () => <div data-testid="agency-map" /> }));

afterEach(cleanup);

import { AgencyDestinationPicker, normalizeCarrierPlace } from "./AgencyDestinationPicker";
import { REGIONAL_TRANSPORT_BY_ID } from "@/lib/regionalTransportDirectory";

describe("AgencyDestinationPicker", () => {
  it("normaliza una ubicación de FedEx/DHL para completar el destino automáticamente", () => {
    const location = normalizeCarrierPlace({ place_id: "place-123", name: "DHL Express Torino", formatted_address: "Corso Peschiera 162A, Torino, Italia", geometry: { location: { lat: () => 45.06, lng: () => 7.66 } } } as never, "dhl");
    expect(location).toMatchObject({ id: "dhl-place-123", provider: "DHL", name: "DHL Express Torino", address: "Corso Peschiera 162A, Torino, Italia", latitude: 45.06, longitude: 7.66 });
  });
  it("mantiene el directorio oculto hasta pulsar Elegir agencia", () => {
    render(<AgencyDestinationPicker route="Torino - Lima" value="" onChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "Usar sede Servicom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Elegir agencia" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Olva Courier" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Shalom" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));
    expect(screen.getByRole("button", { name: "Olva Courier" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Shalom" })).toBeTruthy();
  });

  it("muestra y selecciona una sede oficial de Olva en el explorador", () => {
    const onChange = vi.fn();
    render(<AgencyDestinationPicker route="Lima - Torino" value="DESTINO ACTUAL" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));
    fireEvent.click(screen.getByRole("button", { name: /TIENDA CHACHAPOYAS/i }));
    expect(onChange).toHaveBeenCalledWith("OLVA COURIER — TIENDA CHACHAPOYAS · JR. ORTIZ 270");
  });

  it("muestra los datos de Shalom y completa el destino al elegir su sede", () => {
    const onChange = vi.fn();
    render(<AgencyDestinationPicker route="Torino - Lima" value="DESTINO ACTUAL" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Shalom" }));
    fireEvent.click(screen.getByRole("button", { name: /JR\. RAYMONDI/i }));
    expect(onChange).toHaveBeenCalledWith("SHALOM — JR. RAYMONDI · JR. ANTONIO RAYMONDI NRO. 113");
    expect(screen.getByRole("button", { name: "Elegir agencia" })).toBeTruthy();
    expect(screen.queryByText("015007878")).toBeNull();
    expect(screen.getAllByRole("status").some(element => element.textContent?.includes("SHALOM seleccionada"))).toBe(true);
  });

  it("ofrece FedEx y DHL con acceso a sus localizadores mundiales oficiales", () => {
    render(<AgencyDestinationPicker route="Torino - Lima" value="DESTINO ACTUAL" onChange={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));

    fireEvent.click(screen.getByRole("button", { name: "FedEx" }));
    expect(screen.getByText(/Consulta todas las sedes actuales/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Abrir localizador de FedEx/i }).getAttribute("href")).toBe("https://local.fedex.com/en");

    fireEvent.click(screen.getByRole("button", { name: "DHL" }));
    expect(screen.getByRole("link", { name: /Abrir localizador de DHL/i }).getAttribute("href")).toBe("https://locator.dhl.com/?l=en");
  });

  it("expone las sedes exactas de Expreso Lobato con dirección, referencia y teléfonos", () => {
    const lobato = REGIONAL_TRANSPORT_BY_ID["expreso-lobato"];
    expect(lobato.locations).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Mazamari", address: expect.stringContaining("Av. del Pangoa") }),
      expect.objectContaining({ name: expect.stringContaining("San Martín de Pangoa"), address: expect.stringContaining("Calle 7 de Junio") }),
      expect.objectContaining({ name: expect.stringContaining("Satipo"), address: expect.stringContaining("Terminal Terrestre Municipal") }),
    ]));
    expect(lobato.locations?.every(location => location.address.trim().length > 0)).toBe(true);
  });

  it("incluye la cobertura publicada de Grupo Palomino y su sede principal verificable", () => {
    const palomino = REGIONAL_TRANSPORT_BY_ID["grupo-palomino"];
    expect(palomino.destinations).toEqual(expect.arrayContaining(["Abancay", "Arequipa", "Cusco", "Puerto Maldonado", "Uripa"]));
    expect(palomino.locations).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Lima — Agencia principal", address: expect.stringContaining("Nicolás Arriola 906") }),
    ]));
  });

  it("permite seleccionar una empresa regional y completar uno de sus destinos", () => {
    const onChange = vi.fn();
    const onProviderChange = vi.fn();
    render(<AgencyDestinationPicker route="Torino - Lima" value="DESTINO ACTUAL" onChange={onChange} onProviderChange={onProviderChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));
    const regionalSelect = screen.getByRole("combobox", { name: "Empresas regionales" });
    fireEvent.change(regionalSelect, { target: { value: "flores-hermanos" } });
    expect(onProviderChange).toHaveBeenCalledWith("flores-hermanos");
    expect(screen.getByText(/Rutas hacia el sur del país/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Arequipa/i }));
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining("Flores Hermanos — Arequipa"));
  });

  it("filtra los destinos regionales por texto sin cargar un mapa externo", () => {
    render(<AgencyDestinationPicker route="Torino - Lima" value="" onChange={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Empresas regionales" }), { target: { value: "perubus-soyuz" } });
    const search = screen.getByLabelText(/Busca un destino de PeruBus \/ Soyuz/i);
    fireEvent.change(search, { target: { value: "Ica" } });
    expect(screen.getByRole("button", { name: /Ica/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Cañete/i })).toBeNull();
  });

  it("permite guardar una sede manual cuando no se dispone del directorio", () => {
    const onChange = vi.fn();
    render(<AgencyDestinationPicker route="Torino - Lima" value="DESTINO ACTUAL" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir agencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Escribir sede manual" }));
    fireEvent.change(screen.getByLabelText("Nombre de sede (opcional)"), { target: { value: "Sede indicada" } });
    fireEvent.change(screen.getByLabelText("Dirección de sede *"), { target: { value: "Av. Principal 123, Lima" } });
    fireEvent.click(screen.getByRole("button", { name: "Usar esta sede" }));
    expect(onChange).toHaveBeenCalledWith("SEDE MANUAL — Sede indicada · Av. Principal 123, Lima");
  });
});
