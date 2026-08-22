import { describe, expect, it } from "vitest";
import { filterAgencies, normalizeOlvaStore } from "./agencyDirectory";

describe("agencyDirectory", () => {
  it("normaliza una sede oficial de Olva manteniendo dirección y coordenadas", () => {
    expect(normalizeOlvaStore({ office_id: "579", nombres: "TIENDA CHACHAPOYAS", direccion: "JR. ORTIZ 270", tipo: "TIENDAS", department: "AMAZONAS", province: "CHACHAPOYAS", district: "CHACHAPOYAS", lat: "-6.22", lng: "-77.87" })).toMatchObject({ id: "olva-579", provider: "OLVA COURIER", kind: "TIENDA", latitude: -6.22, longitude: -77.87 });
  });

  it("permite buscar por agencia, dirección o distrito sin inventar sedes", () => {
    const entry = normalizeOlvaStore({ office_id: "1", nombres: "TIENDA LIMA CENTRO", direccion: "AV. EJEMPLO 1", tipo: "TIENDAS", department: "LIMA", province: "LIMA", district: "BREÑA" })!;
    expect(filterAgencies([entry], "BREÑA")).toEqual([entry]);
    expect(filterAgencies([entry], "CUSCO")).toEqual([]);
  });
});
