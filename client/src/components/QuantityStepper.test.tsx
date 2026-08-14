// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "./QuantityStepper";

afterEach(() => cleanup());

describe("QuantityStepper", () => {
  it("increments and decrements with large accessible buttons", async () => {
    const user = userEvent.setup();
    let value = 2;
    const { rerender } = render(<QuantityStepper label="Cantidad de Hojas / Documentos" value={value} min={1} max={8} onChange={next => { value = next; }} />);

    await user.click(screen.getByRole("button", { name: /Aumentar/ }));
    expect(value).toBe(3);
    rerender(<QuantityStepper label="Cantidad de Hojas / Documentos" value={value} min={1} max={8} onChange={next => { value = next; }} />);
    await user.click(screen.getByRole("button", { name: /Disminuir/ }));
    expect(value).toBe(2);
  });

  it("replaces the initial value when typing directly and clamps to the maximum", async () => {
    const user = userEvent.setup();
    let value = 1;
    render(<QuantityStepper label="Cantidad de Hojas / Documentos" value={value} min={1} max={8} onChange={next => { value = next; }} />);
    const input = screen.getByRole("textbox", { name: "Cantidad de Hojas / Documentos" });

    await user.click(input);
    await user.keyboard("4");
    expect((input as HTMLInputElement).value).toBe("4");
    expect(value).toBe(4);

    await user.clear(input);
    await user.type(input, "12");
    expect(value).toBe(8);
  });
});
