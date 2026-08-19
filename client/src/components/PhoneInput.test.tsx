/** @vitest-environment jsdom */
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneInput } from "./PhoneInput";

afterEach(() => cleanup());

function RerenderingParent() {
  const [, setRenderCount] = useState(0);
  return <PhoneInput value="+51 " onChange={() => setRenderCount(count => count + 1)} />;
}

describe("PhoneInput", () => {
  it("does not loop when the parent supplies a new onChange callback on every render", () => {
    render(<RerenderingParent />);
    expect(screen.getByRole("button").textContent).toContain("+51");
  });

  it("separates a normalized stored value when the field loads", () => {
    render(<PhoneInput value="51970188447" onChange={() => undefined} />);
    expect((screen.getByRole("textbox", { name: "Número de teléfono" }) as HTMLInputElement).value).toBe("970 188 447");
    expect(screen.getByRole("button").textContent).toContain("+51");
  });

  it("formats direct numeric typing and emits country code separately", async () => {
    const user = userEvent.setup();
    let currentValue = "";
    render(<PhoneInput value="" onChange={value => { currentValue = value; }} />);
    const input = screen.getByRole("textbox", { name: "Número de teléfono" });

    await user.type(input, "970188447");

    expect((input as HTMLInputElement).value).toBe("970 188 447");
    expect(currentValue).toBe("+51 970 188 447");
  });

  it("shows the country selector and searchable country list", async () => {
    const user = userEvent.setup();
    let currentValue = "initial";
    render(<PhoneInput value="" onChange={value => { currentValue = value; }} />);

    expect(currentValue).toBe("");
    expect(screen.getByRole("button").textContent).toContain("+51");
    await user.click(screen.getByRole("button"));

    expect(screen.getByPlaceholderText("Buscar país o código...")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Italia/ })).toBeTruthy();
  });

  it("rejects a Peru-length number when Italy is selected and accepts the required Italian length", async () => {
    const user = userEvent.setup();
    render(<PhoneInput value="" onChange={() => undefined} />);
    await user.click(screen.getByRole("button", { name: /Seleccionar país/ }));
    await user.click(screen.getByRole("button", { name: /Italia/ }));
    const input = screen.getByRole("textbox", { name: "Número de teléfono" });
    expect(input.getAttribute("placeholder")).toBe("351 278 7962");

    await user.type(input, "389766372");
    expect(screen.getByRole("alert").textContent).toContain("+39 debe tener 10 dígitos locales");
    await user.type(input, "3");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
