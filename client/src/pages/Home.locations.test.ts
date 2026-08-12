import { describe, expect, it } from "vitest";
import { LOCATION_DETAILS } from "./Home";

describe("public location details", () => {
  it("exposes the Lima location with the requested map link, reference, hours, and phone", () => {
    expect(LOCATION_DETAILS.lima).toMatchObject({
      label: "Jr. de la Unión 518",
      reference: "Referencia: Jr. de la Unión 518",
      hours: "Lunes a sábado, de 10:00 a. m. a 8:30 p. m.",
      phone: "01 390 7269",
      mapsUrl: "https://share.google/F5wrStU2oICvKgIWx",
    });
  });

  it("exposes the Torino location with a searchable Google Maps link and schedule", () => {
    expect(LOCATION_DETAILS.torino.label).toBe("Corso Peschiera");
    expect(LOCATION_DETAILS.torino.address).toContain("162A");
    expect(LOCATION_DETAILS.torino.reference).toBe("Referencia: Corso Peschiera");
    expect(LOCATION_DETAILS.torino.hours).toBe("Lunes a sábado, de 9:00 a. m. a 8:30 p. m.");
    expect(LOCATION_DETAILS.torino.contact).toBe("WhatsApp general: +51 970 188 447");
    expect(LOCATION_DETAILS.torino.mapsUrl).toContain("google.com/maps/search");
  });
});
