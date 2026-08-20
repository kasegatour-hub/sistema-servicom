// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgencyDestinationPicker } from "./AgencyDestinationPicker";

describe("AgencyDestinationPicker", () => {
  it("muestra Servicom como alternativa propia y permite abrir el selector de mapa", () => {
    render(<AgencyDestinationPicker route="Torino - Lima" value="" onChange={() => undefined} />);

    expect(screen.getByRole("button", { name: "Usar sede Servicom" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Seleccionar en mapa" })).toBeTruthy();
    expect(screen.getByText(/Olva Courier/i)).toBeTruthy();
    expect(screen.getByText(/Shalom/i)).toBeTruthy();
  });
});
