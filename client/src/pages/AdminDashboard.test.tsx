/** @vitest-environment jsdom */
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  login: {
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" }),
  },
  logout: { isPending: false, mutateAsync: vi.fn() },
  createShipment: { isPending: false, mutateAsync: vi.fn() },
  updateStatus: { isPending: false, mutateAsync: vi.fn() },
  deleteShipment: { isPending: false, mutateAsync: vi.fn() },
  setShipmentRegistradorVisibility: { isPending: false, mutateAsync: vi.fn() },
  restoreShipment: { isPending: false, mutate: vi.fn() },
  createAdmin: { isPending: false, mutateAsync: vi.fn() },
  deleteAdmin: { isPending: false, mutateAsync: vi.fn() },
  deactivateAdmin: { isPending: false, mutateAsync: vi.fn() },
  listCoupons: { data: [] as any[], refetch: vi.fn() },
  createCoupon: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({ code: "SERVI25-TEST", discountPercent: 25 }) },
  updateCoupon: { isPending: false, mutateAsync: vi.fn() },
  deactivateCoupon: { isPending: false, mutateAsync: vi.fn() },
  limaTorinoPolicy: { data: { route: "Lima - Torino", encomiendasEnabled: true, updatedAt: null }, refetch: vi.fn() },
  setLimaTorinoEncomiendasEnabled: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({ success: true, enabled: false }) },
  changeMyPassword: { isPending: false, mutate: vi.fn() },
  requestPasswordReset: { isPending: false, mutate: vi.fn() },
  resetPassword: { isPending: false, mutate: vi.fn() },
  reauthenticate: { isPending: false, mutate: vi.fn() },
  refetchAdminSession: vi.fn().mockResolvedValue({ data: null }),
  refetchShipments: vi.fn(),
  refetchAdminUsers: vi.fn(),
  refetchCoupons: vi.fn(),
  shipments: [] as any[],
  deletedShipments: [] as any[],
  searchClients: {
    useQuery: (input: { query?: string }) => ({
      data: input.query?.trim() ? [{ id: 21, name: "Ana", lastName: "Pérez", dni: "71234567", phone: "+51 970188447", email: null }] : [],
      isFetching: false,
    }),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ shipment: { search: { fetch: vi.fn() } } }),
    admin: {
      me: { useQuery: () => ({ data: null, isLoading: false, refetch: mocks.refetchAdminSession }) },
      getAllShipments: { useQuery: () => ({ data: mocks.shipments, isLoading: false, refetch: mocks.refetchShipments }) },
      listDeletedShipments: { useQuery: () => ({ data: mocks.deletedShipments, isLoading: false, refetch: vi.fn() }) },
      shipmentAudit: { useQuery: () => ({ data: [], isFetching: false }) },
      listAdmins: { useQuery: () => ({ data: [], isLoading: false, refetch: mocks.refetchAdminUsers }) },
      listCoupons: { useQuery: () => ({ data: mocks.listCoupons.data, isLoading: false, refetch: mocks.refetchCoupons }) },
      getLimaTorinoEncomiendaPolicy: { useQuery: () => ({ data: mocks.limaTorinoPolicy.data, isLoading: false, refetch: mocks.limaTorinoPolicy.refetch }) },
      searchClients: mocks.searchClients,
      login: { useMutation: () => mocks.login },
      logout: { useMutation: () => mocks.logout },
      createShipment: { useMutation: () => mocks.createShipment },
      updateStatus: { useMutation: () => mocks.updateStatus },
      deleteShipment: { useMutation: () => mocks.deleteShipment },
      setShipmentRegistradorVisibility: { useMutation: () => mocks.setShipmentRegistradorVisibility },
      restoreShipment: { useMutation: () => mocks.restoreShipment },
      createAdmin: { useMutation: () => mocks.createAdmin },
      deleteAdmin: { useMutation: () => mocks.deleteAdmin },
      deactivateAdmin: { useMutation: () => mocks.deactivateAdmin },
      createCoupon: { useMutation: () => mocks.createCoupon },
      updateCoupon: { useMutation: () => mocks.updateCoupon },
      deactivateCoupon: { useMutation: () => mocks.deactivateCoupon },
      setLimaTorinoEncomiendasEnabled: { useMutation: () => mocks.setLimaTorinoEncomiendasEnabled },
      changeMyPassword: { useMutation: () => mocks.changeMyPassword },
      requestPasswordReset: { useMutation: (options?: { onSuccess?: (result: { message: string; retryAfterSeconds: number }) => void }) => ({ ...mocks.requestPasswordReset, mutate: (input: { email: string }) => { mocks.requestPasswordReset.mutate(input); options?.onSuccess?.({ message: "Código enviado", retryAfterSeconds: 60 }); } }) },
      resetPassword: { useMutation: () => mocks.resetPassword },
      reauthenticate: { useMutation: () => mocks.reauthenticate },
    },
    analytics: {
      adminInsights: { useQuery: () => ({ data: null }) },
    },
    feedback: {
      list: { useQuery: () => ({ data: [], isLoading: false, refetch: vi.fn() }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

import AdminDashboard from "./AdminDashboard";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listCoupons.data = [];
  mocks.shipments = [];
  mocks.deletedShipments = [];
  mocks.login.mutateAsync.mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" });
});

describe("AdminDashboard Nueva Encomienda", () => {
  it("shows escape links and the administrative password form", async () => {
    render(<AdminDashboard />);
    expect(screen.getByRole("link", { name: /Volver al inicio/ }).getAttribute("href")).toBe("/");
    expect(screen.queryByText("peruservicom@gmail.com")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Cambiar contraseña" })).toBeTruthy());

    expect(screen.getByRole("link", { name: "Inicio" }).getAttribute("href")).toBe("/");
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));
    expect(screen.getByRole("heading", { name: "Actualizar contraseña administrativa" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("heading", { name: "Actualizar contraseña administrativa" })).toBeNull();
  });

  it("offers administrative password recovery by the registered email", () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    expect(screen.getByRole("heading", { name: "Recuperar acceso administrativo" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar código" }));
    expect(mocks.requestPasswordReset.mutate).toHaveBeenCalledWith({ email: "admin@servicom.pe" });
    expect(screen.getByLabelText("Código de 6 dígitos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reenviar código en 60s" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ya tengo un código" })).toBeNull();
  });

  it("shows coupon management for an authenticated operator", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Cupones promocionales" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Cupones" }));
    fireEvent.click(screen.getByRole("button", { name: "Nuevo cupón" }));
    expect(screen.getByRole("button", { name: "Generar cupón" })).toBeTruthy();
    expect(screen.getByText("Descuento (%)")).toBeTruthy();
    expect(screen.getByText("Aplica a")).toBeTruthy();
    expect(screen.getByText("Válido desde")).toBeTruthy();
    expect(screen.getByText("Válido hasta")).toBeTruthy();
  });

  it("shows the reversible hiding action only to the Master Admin", async () => {
    mocks.shipments = [{ id: 42, shipmentType: "documento", recipientName: "Giselle", recipientLastName: "García", status: "En agencia", paymentStatus: "Falta cancelar", createdAt: new Date("2026-08-17T10:00:00.000Z"), orderNumber: "6352627659", code: "DOC-2026-XPF2A", events: [], hiddenFromRegistradoresAt: null }];
    mocks.login.mutateAsync.mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Master", role: "superadmin" });
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Ocultar a Registradores" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Ocultar a Registradores" }));
    await waitFor(() => expect(mocks.setShipmentRegistradorVisibility.mutateAsync).toHaveBeenCalledWith({ shipmentId: 42, hidden: true }));
  });

  it("hides, orders and paginates promotional coupons five at a time", async () => {
    mocks.listCoupons.data = Array.from({ length: 7 }, (_, index) => {
      const number = index + 1;
      return {
        id: number,
        code: `CUPON-${number}`,
        discountPercent: "25",
        appliesTo: "ambos",
        startsAt: new Date(`2026-08-0${number}T10:00:00.000Z`),
        endsAt: new Date(`2026-09-0${number}T10:00:00.000Z`),
        createdAt: new Date(`2026-08-0${number}T09:00:00.000Z`),
        redeemedCount: 0,
        isActive: 1,
      };
    });
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Cupones" })).toBeTruthy());
    expect(screen.queryByText("CUPON-7")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cupones" }));
    fireEvent.click(screen.getByRole("button", { name: "Mostrar cupones" }));
    await waitFor(() => expect(screen.getByText("CUPON-7")).toBeTruthy());
    expect(screen.getByText("Mostrando 1–5 de 7 cupones")).toBeTruthy();
    expect(screen.queryByText("CUPON-1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("CUPON-1")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Orden de cupones"), { target: { value: "asc" } });
    expect(screen.getByText("CUPON-1")).toBeTruthy();
    expect(screen.queryByText("CUPON-7")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar cupones" }));
    expect(screen.getByRole("button", { name: "Mostrar cupones" })).toBeTruthy();
    expect(screen.queryByText("CUPON-1")).toBeNull();
  });

  it("paginates active records six at a time and filters by payment and logistics state", async () => {
    mocks.shipments = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      shipmentType: "documento",
      recipientName: `Cliente ${index + 1}`,
      recipientLastName: "Prueba",
      recipientDni: `7000000${index}`,
      status: index === 6 ? "En destino" : "En agencia",
      paymentStatus: index % 2 === 0 ? "Pagado" : "Falta cancelar",
      createdAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`),
      orderNumber: `35209927${index}`,
      code: `DOC-${index}`,
      events: [],
    }));
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByText("Mostrando 1–6 de 7 envíos")).toBeTruthy());
    expect(screen.getByText("Cliente 7 Prueba")).toBeTruthy();
    expect(screen.queryByText("Cliente 1 Prueba")).toBeNull();
    fireEvent.change(screen.getByLabelText("Filtro de pago"), { target: { value: "paid" } });
    expect(screen.getByText("Cliente 7 Prueba")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Filtro de estado del envío"), { target: { value: "En destino" } });
    expect(screen.getByText("Cliente 7 Prueba")).toBeTruthy();
    expect(screen.queryByText("Cliente 5 Prueba")).toBeNull();
  });

  it("keeps the trash encapsulated and paginates filtered deleted records", async () => {
    mocks.deletedShipments = Array.from({ length: 7 }, (_, index) => ({
      id: index + 1,
      shipmentType: index % 2 === 0 ? "documento" : "encomienda",
      recipientName: `Eliminado ${index + 1}`,
      recipientLastName: "Prueba",
      recipientDni: `6000000${index}`,
      status: "En agencia",
      paymentStatus: index % 2 === 0 ? "Pagado" : "Falta cancelar",
      deletedAt: new Date(`2026-08-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`),
      orderNumber: `45209927${index}`,
      code: `DEL-${index}`,
    }));
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Papelera (7)" })).toBeTruthy());
    expect(screen.getByLabelText("Buscar en papelera").closest("[data-slot='card']")?.getAttribute("class")).toContain("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Papelera (7)" }));
    expect(screen.getByLabelText("Buscar en papelera")).toBeTruthy();
    expect(screen.getByText("Mostrando 1–6 de 7 eliminados")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Buscar en papelera"), { target: { value: "452099270" } });
    expect(screen.getByText("Mostrando 1–1 de 1 eliminados")).toBeTruthy();
  });

  it("shows the registration author and opens the general comments channel for an operator", async () => {
    mocks.shipments = [{ id: 70, shipmentType: "documento", recipientName: "Giselle", recipientLastName: "García", status: "En agencia", paymentStatus: "Pagado", registeredByLabel: "Operador Servicom", createdAt: new Date("2026-08-18T10:00:00.000Z"), orderNumber: "6352627659", code: "DOC-2026-XPF2A", events: [] }];
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByText("Operador Servicom")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Comentarios" }));
    expect(screen.getByRole("heading", { name: "Enviar comentarios" })).toBeTruthy();
    expect(screen.getByLabelText("Adjuntar evidencia multimedia")).toBeTruthy();
  });

  it("opens each creation type directly without a redundant selector", async () => {
    render(<AdminDashboard />);

    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Nueva encomienda" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(screen.getAllByText("Nuevo documento").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tipo de registro")).toBeNull();
    expect(screen.queryByDisplayValue("Documentos")).toBeNull();
    expect(screen.getByText("Tipo de Documento")).toBeTruthy();
    expect(screen.getByText("Precio manual en EUR (opcional)")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nueva encomienda" }));
    expect(screen.getAllByText("Nueva encomienda").length).toBeGreaterThan(0);
    expect(screen.getByText("Peso de la encomienda (kg)")).toBeTruthy();
    expect(screen.getByText("Total automático: 13.50 €")).toBeTruthy();
    expect(screen.queryByDisplayValue("Documentos")).toBeNull();
  });

  it("fills sender data from a persistent client match by DNI", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar remitente guardado" }), { target: { value: "71234567" } });
    const match = await screen.findByRole("button", { name: /Ana Pérez/ });
    fireEvent.click(match);

    expect((screen.getAllByPlaceholderText("Nombre")[0] as HTMLInputElement).value).toBe("Ana");
    expect((screen.getAllByPlaceholderText("Apellido")[0] as HTMLInputElement).value).toBe("Pérez");
    expect((screen.getAllByPlaceholderText("DNI")[0] as HTMLInputElement).value).toBe("71234567");
  });

  it("submits document and parcel payloads through the administrative mutation", async () => {
    mocks.createShipment.mutateAsync
      .mockResolvedValueOnce({ orderNumber: "1234567890", code: "DOC-2026-ABCDE", trackingUrl: "/?order=1234567890&code=DOC-2026-ABCDE" })
      .mockResolvedValueOnce({ orderNumber: "1234567891", code: "ENC-2026-ABCDF", trackingUrl: "/?order=1234567891&code=ENC-2026-ABCDF" });

    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
        await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    fireEvent.click(screen.getByLabelText("Acta de nacimiento"));
    fireEvent.click(screen.getByRole("combobox", { name: "Estado de Pago" }));
    fireEvent.click(screen.getByRole("option", { name: "Pagado" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear Documento" }));
    await waitFor(() => expect(mocks.createShipment.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.createShipment.mutateAsync.mock.calls[0][0]).toMatchObject({
      shipmentType: "documento",
      docType: "apostillado",
      sheetCount: 1,
      weightKg: 1,
      manualPriceEur: "",
      paymentStatus: "Pagado",
      contentChecklist: ["1 × Acta de nacimiento"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Nueva encomienda" }));
    fireEvent.change(screen.getByDisplayValue("1"), { target: { value: "2.5" } });
    fireEvent.change(screen.getByPlaceholderText("Ej. 75.00"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir ítem" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ítem de checklist 1" }), { target: { value: "Paquete sellado" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear Encomienda" }));

    await waitFor(() => expect(mocks.createShipment.mutateAsync).toHaveBeenCalledTimes(2));
    expect(mocks.createShipment.mutateAsync.mock.calls[1][0]).toMatchObject({
      shipmentType: "encomienda",
      weightKg: 2.5,
      manualPriceEur: "40",
    });
  });

  it("limits administrative DNI input to eight digits and displays the payment selector", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));

    const senderDni = screen.getAllByPlaceholderText("DNI")[0] as HTMLInputElement;
    fireEvent.change(senderDni, { target: { value: "1234567890" } });

    expect(senderDni.value).toBe("12345678");
    expect(senderDni.maxLength).toBe(8);
    expect(screen.getByRole("combobox", { name: "Estado de Pago" })).toBeTruthy();
    expect(screen.getByText("Define si el envío se registra como pagado o pendiente de pago.")).toBeTruthy();
  });

  it("separa las vistas de documentos y encomiendas en pestañas", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("tab", { name: /Documentos/ })).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Documentos Registrados" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Encomiendas/ }));
    expect(screen.getByRole("heading", { name: "Encomiendas Registradas" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Documentos/ }));
    expect(screen.getByRole("heading", { name: "Documentos Registrados" })).toBeTruthy();
  });
});
