import { afterEach, describe, expect, it, vi } from "vitest";
import { filterAgencies, getOfficialOlvaAgencies, getOfficialShalomAgencies, normalizeOlvaStore, normalizeShalomOffice } from "./agencyDirectory";

afterEach(() => vi.unstubAllGlobals());

describe("agencyDirectory", () => {
  it("normaliza una sede oficial de Olva manteniendo dirección y coordenadas", () => {
    expect(normalizeOlvaStore({ office_id: "579", nombres: "TIENDA CHACHAPOYAS", direccion: "JR. ORTIZ 270", tipo: "TIENDAS", department: "AMAZONAS", province: "CHACHAPOYAS", district: "CHACHAPOYAS", lat: "-6.22", lng: "-77.87" })).toMatchObject({ id: "olva-579", provider: "OLVA COURIER", kind: "TIENDA", latitude: -6.22, longitude: -77.87 });
  });

  it("permite buscar por agencia, dirección o distrito sin inventar sedes", () => {
    const entry = normalizeOlvaStore({ office_id: "1", nombres: "TIENDA LIMA CENTRO", direccion: "AV. EJEMPLO 1", tipo: "TIENDAS", department: "LIMA", province: "LIMA", district: "BREÑA" })!;
    expect(filterAgencies([entry], "BREÑA")).toEqual([entry]);
    expect(filterAgencies([entry], "CUSCO")).toEqual([]);
  });

  it("normaliza los datos útiles del directorio oficial de Shalom", () => {
    expect(normalizeShalomOffice({ ter_id: "48", lugar_over: "JR. RAYMONDI", nombre: "JR. RAYMONDI", direccion: "JR. ANTONIO RAYMONDI NRO. 113", departamento: "LIMA", provincia: "LIMA", zona: "LA VICTORIA", telefono: "015007878", hora_atencion: "08:00 AM A 08:00 PM", latitud: "-12.07", longitud: "-77.02" })).toMatchObject({ id: "shalom-48", provider: "SHALOM", kind: "AGENCIA", phone: "015007878", latitude: -12.07, longitude: -77.02 });
  });

  it("mantiene las sedes verificadas de Shalom cuando su servicio público está temporalmente indisponible", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const agencies = await getOfficialShalomAgencies();
    expect(agencies.length).toBeGreaterThan(500);
    expect(agencies.some(agency => agency.provider === "SHALOM" && agency.name.includes("CHACHAPOYAS"))).toBe(true);
  });

  it("usa el snapshot oficial de Olva cuando su servicio público responde 503", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const agencies = await getOfficialOlvaAgencies();
    expect(agencies.length).toBeGreaterThan(100);
    expect(agencies.some(agency => agency.provider === "OLVA COURIER" && agency.name.includes("CHACHAPOYAS"))).toBe(true);
  });
});

  it("combina términos de ciudad y distrito para no ocultar sedes provinciales", () => {
    const shalom = normalizeShalomOffice({ ter_id: "trujillo-1", nombre: "AGENCIA EL PORVENIR", direccion: "AV. SÁNCHEZ CARRIÓN 123", departamento: "LA LIBERTAD", provincia: "TRUJILLO", zona: "EL PORVENIR" })!;
    const olva = normalizeOlvaStore({ office_id: "trujillo-2", nombres: "OLVA TRUJILLO CENTRO", direccion: "JR. INDEPENDENCIA 456", tipo: "TIENDAS", department: "LA LIBERTAD", province: "TRUJILLO", district: "TRUJILLO" })!;
    expect(filterAgencies([shalom, olva], "Trujillo El Porvenir")).toEqual([shalom]);
    expect(filterAgencies([shalom, olva], "TRUJILLO")).toEqual([shalom, olva]);
  });
