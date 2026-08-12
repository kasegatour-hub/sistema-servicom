/** @vitest-environment jsdom */
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneInput } from "./PhoneInput";

afterEach(() => cleanup());

describe("PhoneInput", () => {
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
});
