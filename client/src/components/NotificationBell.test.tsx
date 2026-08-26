// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const notificationMocks = vi.hoisted(() => ({
  data: { items: [] as any[], unreadCount: 0 },
  refetch: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    notifications: {
      list: { useQuery: () => ({ data: notificationMocks.data, isLoading: false, refetch: notificationMocks.refetch }) },
      markRead: { useMutation: () => ({ mutate: notificationMocks.markRead, isPending: false }) },
      markAllRead: { useMutation: () => ({ mutate: notificationMocks.markAllRead, isPending: false }) },
    },
  },
}));

vi.mock("@/lib/notificationChime", () => ({
  getNotificationSoundPreference: () => false,
  prepareNotificationChime: vi.fn(),
  playAscendingNotificationChime: vi.fn(),
  setNotificationSoundPreference: vi.fn(),
}));

import { NotificationBell } from "./NotificationBell";

describe("NotificationBell", () => {
  beforeEach(() => {
    notificationMocks.data = {
      unreadCount: 1,
      items: [
        { id: 1, title: "Envío actualizado", message: "Orden: 21133740", isRead: 0, createdAt: new Date() },
        { id: 2, title: "Envío entregado", message: "Orden: 21133741", isRead: 1, createdAt: new Date() },
      ],
    };
  });

  afterEach(() => cleanup());

  it("muestra un aviso superior con logo cuando llega una notificación nueva", async () => {
    notificationMocks.data = { unreadCount: 0, items: [] };
    const view = render(<NotificationBell />);
    notificationMocks.data = {
      unreadCount: 1,
      items: [{ id: 9, title: "Nueva encomienda creada", message: "Orden: 21133749", isRead: 0, createdAt: new Date() }],
    };
    view.rerender(<NotificationBell />);

    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByText("Nueva encomienda creada")).toBeTruthy();
    expect(screen.getByText("Orden: 21133749")).toBeTruthy();
    expect(screen.getByAltText("Servicom Internacional")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Notificación en la aplicación abierta")).toBeTruthy());
  });

  it("muestra etiquetas y estilos distintos para avisos nuevos y leídos", () => {
    render(<NotificationBell />);
    fireEvent.click(screen.getByRole("button", { name: /notificaciones/i }));

    const unread = screen.getByRole("button", { name: "Envío actualizado, nueva" });
    const read = screen.getByRole("button", { name: "Envío entregado, leída" });
    expect(screen.getByText("Nueva")).toBeTruthy();
    expect(screen.getByText("Leída")).toBeTruthy();
    expect(unread.className).toContain("border-blue-200");
    expect(read.className).toContain("border-slate-300");
    expect(read.className).toContain("bg-slate-100");

    const closeButton = screen.getByRole("button", { name: "Cerrar notificaciones" });
    expect(closeButton.className).toContain("border-rose-400");
    expect(closeButton.className).toContain("text-rose-700");
    expect(closeButton.className).toContain("shrink-0");
    expect(screen.getByRole("button", { name: "Marcar todas como leídas" }).textContent).toContain("Marcar leídas");
    fireEvent.click(closeButton);
    expect(screen.queryByRole("dialog", { name: "Notificaciones" })).toBeNull();
  });
});
