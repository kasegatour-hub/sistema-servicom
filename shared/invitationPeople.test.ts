import { describe, expect, it } from "vitest";
import { searchInvitationPeople } from "./invitationPeople";

describe("searchInvitationPeople", () => {
  it("combina datos de cartas, directorio y envíos sin borrar los detalles disponibles", () => {
    const results = searchInvitationPeople([
      { source: "carta", firstName: "LUCÍA", lastName: "SÁNCHEZ", identityCard: "", passport: "AB123456", residencePermit: "PERMISO", address: "VIA ROMA 1", occupation: "COMERCIANTE", phone: "+39 351 278 7962", email: "lucia@example.com", birthDate: "1980-01-01", birthPlace: "LIMA", nationality: "PERUANA" },
      { source: "envio", firstName: "LUCÍA", lastName: "SÁNCHEZ", identityCard: "", passport: "AB123456", residencePermit: "", address: "", occupation: "", phone: "+39 351 278 7962", email: "", birthDate: "", birthPlace: "", nationality: "" },
    ], "sanches");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ passport: "AB123456", residencePermit: "PERMISO", address: "VIA ROMA 1", nationality: "PERUANA" });
    expect(results[0].sources).toEqual(expect.arrayContaining(["carta", "envio"]));
  });

  it("encuentra una persona por documento de identidad", () => {
    const results = searchInvitationPeople([{ source: "directorio", firstName: "CESARIA", lastName: "QUISPE", identityCard: "3580640671", passport: "", residencePermit: "", address: "", occupation: "", phone: "", email: "", birthDate: "", birthPlace: "", nationality: "" }], "3580640671");
    expect(results[0]?.firstName).toBe("CESARIA");
  });
});
