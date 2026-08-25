// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    feedback: {
      listAdmin: { useQuery: mocks.useQuery },
    },
  },
}));

import { AdminFeedbackInbox } from "./AdminFeedbackInbox";

afterEach(() => {
  cleanup();
  mocks.useQuery.mockReset();
});

describe("AdminFeedbackInbox", () => {
  it("muestra el autor, rol, entorno y fecha de cada observación", () => {
    mocks.useQuery.mockReturnValue({
      data: [{
        id: 18,
        authorType: "account",
        authorId: 42,
        authorLabel: "Ana Pérez (ana@example.com)",
        authorEmail: "ana@example.com",
        authorRole: "client",
        workspaceKey: "servicom",
        workspaceLabel: "Servicom Internacional",
        message: "La sede de destino necesita actualizarse.",
        attachmentUrl: null,
        createdAt: new Date("2026-08-25T12:00:00Z"),
      }],
      isLoading: false,
      error: null,
    });

    render(<AdminFeedbackInbox />);

    expect(screen.getByRole("heading", { name: "Feedback recibido" })).toBeTruthy();
    expect(screen.getByText("Ana Pérez (ana@example.com)")).toBeTruthy();
    expect(screen.getByText("Cliente")).toBeTruthy();
    expect(screen.getByText("Servicom Internacional")).toBeTruthy();
    expect(screen.getByText("La sede de destino necesita actualizarse.")).toBeTruthy();
  });

  it("envía el texto de búsqueda al procedimiento administrativo", () => {
    mocks.useQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<AdminFeedbackInbox />);

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar feedback" }), { target: { value: "DNI" } });

    expect(mocks.useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ search: "DNI", limit: 300 }), expect.anything());
  });
});
