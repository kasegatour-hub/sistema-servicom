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
  createShipment: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({ shipmentId: 1 }) },
  uploadShipmentPhoto: { isPending: false, mutateAsync: vi.fn().mockResolvedValue({ success: true }) },
  updateStatus: { isPending: false, mutateAsync: vi.fn() },
  requestShipmentSignature: { isPending: false, mutate: vi.fn() },
  deleteShipment: { isPending: false, mutateAsync: vi.fn() },
  setShipmentRegistradorVisibility: { isPending: false, mutateAsync: vi.fn() },
  reportPdfDownloadFailure: { isPending: false, mutate: vi.fn() },
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
  translateInvitationLetter: { isPending: false, mutate: vi.fn() },
  saveInvitationLetter: { isPending: false, mutate: vi.fn() },
  listInvitationLetters: { data: [] as any[], isLoading: false, refetch: vi.fn() },
  searchInvitationPeople: { data: [] as any[], isFetching: false },
  refetchAdminSession: vi.fn().mockResolvedValue({ data: null }),
  refetchShipments: vi.fn(),
  refetchAdminUsers: vi.fn(),
  refetchCoupons: vi.fn(),
  shipments: [] as any[],
  deletedShipments: [] as any[],
  deliveryShipment: { data: null as any, isLoading: false, error: null as any },
  searchClients: {
    useQuery: (input: { query?: string }) => ({
      data: input.query?.trim() ? [{ id: 21, name: "Ana", lastName: "Pérez", dni: "71234567", phone: "+51 970188447", email: null }] : [],
      isFetching: false,
    }),
  },
}));
const receiptMocks = vi.hoisted(() => ({
  download: vi.fn().mockResolvedValue("recibo-documento-giselle-garcia-orden-6352627659.pdf"),
}));
const adminReceiptDocumentMocks = vi.hoisted(() => ({
  download: vi.fn().mockResolvedValue("recibo-documento-giselle-garcia-orden-6352627659.pdf"),
  build: vi.fn().mockResolvedValue({ filename: "recibo-documento-giselle-garcia-orden-6352627659", html: "<!doctype html><html><body>recibo</body></html>" }),
}));
const qrScannerMocks = vi.hoisted(() => ({
  onScan: null as ((value: string) => void) | null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ shipment: { search: { fetch: vi.fn() } } }),
    admin: {
      me: { useQuery: () => ({ data: null, isLoading: false, refetch: mocks.refetchAdminSession }) },
      getAllShipments: { useQuery: () => ({ data: mocks.shipments, isLoading: false, refetch: mocks.refetchShipments }) },
      getShipmentForDeliveryUpdate: { useQuery: () => mocks.deliveryShipment },
      listDeletedShipments: { useQuery: () => ({ data: mocks.deletedShipments, isLoading: false, refetch: vi.fn() }) },
      shipmentAudit: { useQuery: () => ({ data: [], isFetching: false }) },
      listAdmins: { useQuery: () => ({ data: [], isLoading: false, refetch: mocks.refetchAdminUsers }) },
      listCoupons: { useQuery: () => ({ data: mocks.listCoupons.data, isLoading: false, refetch: mocks.refetchCoupons }) },
      getLimaTorinoEncomiendaPolicy: { useQuery: () => ({ data: mocks.limaTorinoPolicy.data, isLoading: false, refetch: mocks.limaTorinoPolicy.refetch }) },
      searchClients: mocks.searchClients,
      login: { useMutation: () => mocks.login },
      logout: { useMutation: () => mocks.logout },
      createShipment: { useMutation: () => mocks.createShipment },
      uploadShipmentPhoto: { useMutation: () => mocks.uploadShipmentPhoto },
      updateStatus: { useMutation: () => mocks.updateStatus },
      deleteShipment: { useMutation: () => mocks.deleteShipment },
      setShipmentRegistradorVisibility: { useMutation: () => mocks.setShipmentRegistradorVisibility },
      reportPdfDownloadFailure: { useMutation: () => mocks.reportPdfDownloadFailure },
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
      translateInvitationLetter: { useMutation: () => mocks.translateInvitationLetter },
      saveInvitationLetter: { useMutation: () => mocks.saveInvitationLetter },
      listInvitationLetters: { useQuery: () => mocks.listInvitationLetters },
      searchInvitationPeople: { useQuery: () => mocks.searchInvitationPeople },
    },
    shipment: {
      requestSignature: { useMutation: () => mocks.requestShipmentSignature },
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

vi.mock("@/lib/userReceipt", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/userReceipt")>();
  return { ...actual, downloadShipmentReceipt: receiptMocks.download };
});

vi.mock("@/lib/adminReceiptDocument", () => ({
  downloadAdminReceiptUsingPrintTemplate: adminReceiptDocumentMocks.download,
  buildAdminReceiptDocument: adminReceiptDocumentMocks.build,
  printAdminReceiptPdf: vi.fn().mockResolvedValue("recibo-prueba.pdf"),
}));

vi.mock("@/components/QRScanner", () => ({
  QRScanner: ({ isOpen, onScan }: { isOpen: boolean; onScan: (value: string) => void }) => {
    qrScannerMocks.onScan = onScan;
    return isOpen ? React.createElement("div", { role: "dialog", "aria-label": "Lector QR administrativo" }, "Lector QR administrativo") : null;
  },
}));

import AdminDashboard from "./AdminDashboard";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/admin");
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listCoupons.data = [];
  mocks.shipments = [];
  mocks.deletedShipments = [];
  mocks.deliveryShipment = { data: null, isLoading: false, error: null };
  qrScannerMocks.onScan = null;
  mocks.login.mutateAsync.mockResolvedValue({ id: 1, email: "admin@servicom.pe", name: "Operador", role: "registrador" });
});

describe("AdminDashboard Nueva Encomienda", () => {
  it("permite mostrar u ocultar la contraseña administrativa antes de iniciar sesión", () => {
    render(<AdminDashboard />);
    const password = screen.getByPlaceholderText("Contraseña") as HTMLInputElement;
    expect(password.type).toBe("password");
    const reveal = screen.getByRole("button", { name: "Mostrar contraseña" });
    fireEvent.click(reveal);
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password.type).toBe("password");
  });

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

  it("explica cómo buscar registros y conserva coincidencias difusas", async () => {
    mocks.shipments = [
      { id: 51, shipmentType: "documento", senderName: "Sánchez", senderLastName: "Arias", recipientName: "Luisa", recipientLastName: "Ramos", status: "En agencia", paymentStatus: "Falta cancelar", createdAt: new Date("2026-08-17T10:00:00.000Z"), orderNumber: "6352627659", code: "DOC-SAN" },
      { id: 52, shipmentType: "documento", senderName: "María", senderLastName: "Ramos", recipientName: "Ana", recipientLastName: "López", status: "En agencia", paymentStatus: "Falta cancelar", createdAt: new Date("2026-08-16T10:00:00.000Z"), orderNumber: "6352627660", code: "DOC-RAM" },
    ];
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    const search = await screen.findByRole("textbox", { name: "Buscar registros" });
    expect(screen.getByText("Buscar en registros")).toBeTruthy();
    expect(screen.getByText(/Busca por orden, código, DNI, nombre o apellido/)).toBeTruthy();
    fireEvent.change(search, { target: { value: "sanches ar" } });
    expect(screen.getByText("Luisa Ramos")).toBeTruthy();
    expect(screen.queryByText("Ana López")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("permite al Registrador escanear un control y abrir directamente la actualización del envío", async () => {
    const shipment = { id: 87, shipmentType: "documento", senderName: "Mirian", senderLastName: "Astete", recipientName: "Miguel", recipientLastName: "Díaz", status: "En destino", paymentStatus: "Pagado", createdAt: new Date("2026-08-20T10:00:00.000Z"), orderNumber: "3289150504", code: "07900824", events: [] };
    mocks.deliveryShipment = { data: shipment, isLoading: false, error: null };
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "operador@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    const scanButton = await screen.findByRole("button", { name: "Escanear QR de control para actualizar un envío" });
    fireEvent.click(scanButton);
    expect(screen.getByRole("dialog", { name: "Lector QR administrativo" })).toBeTruthy();
    qrScannerMocks.onScan?.("https://servicom.test/admin?order=3289150504&code=07900824&open=status");

    await waitFor(() => expect(screen.getByRole("heading", { name: "Actualizar Estado de Documento" })).toBeTruthy());
    expect(window.location.pathname).toBe("/admin");
    expect(window.location.search).toBe("");
  });

  it("mantiene el acceso de escaneo QR disponible para el Master Admin", async () => {
    mocks.login.mutateAsync.mockResolvedValue({ id: 2, email: "master@servicom.pe", name: "Master", role: "superadmin" });
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "master@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    expect(await screen.findByRole("button", { name: "Escanear QR de control para actualizar un envío" })).toBeTruthy();
  });

  it("abre la actualización del envío al ingresar desde el QR de control de entrega", async () => {
    mocks.shipments = [{ id: 88, shipmentType: "documento", senderName: "Mirian", senderLastName: "Astete", recipientName: "Miguel", recipientLastName: "Díaz Ojitos", status: "En destino", paymentStatus: "Pagado", createdAt: new Date("2026-08-17T10:00:00.000Z"), orderNumber: "3289150504", code: "07900824", events: [] }];
    mocks.deliveryShipment = { data: mocks.shipments[0], isLoading: false, error: null };
    window.history.replaceState({}, "", "/admin?order=3289150504&code=07900824&open=update");
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Actualizar Estado de Documento" })).toBeTruthy();
    expect(screen.getByLabelText("Tipo de documento")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Cantidad de Hojas / Documentos" })).toBeTruthy();
    expect(screen.queryByLabelText("Peso (kg)")).toBeNull();
    expect((screen.getByRole("combobox", { name: "Estado de Pago" }) as HTMLSelectElement).value).toBe("Pagado");
  });

  it("espera el envío objetivo del QR y abre su actualización cuando la consulta directa termina", async () => {
    const shipment = { id: 89, shipmentType: "encomienda", senderName: "Iván", senderLastName: "Romero", recipientName: "Freddy", recipientLastName: "Grabel", status: "En destino", paymentStatus: "Falta cancelar", createdAt: new Date("2026-08-19T10:00:00.000Z"), orderNumber: "5211941098", code: "DOC-2026-HDXBV", events: [] };
    mocks.deliveryShipment = { data: null, isLoading: true, error: null };
    window.history.replaceState({}, "", "/admin?order=5211941098&code=DOC-2026-HDXBV&open=update");
    const view = render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    mocks.deliveryShipment = { data: shipment, isLoading: false, error: null };
    view.rerender(<AdminDashboard />);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Actualizar Estado de Encomienda" })).toBeTruthy();
    expect(window.location.pathname).toBe("/admin");
    expect(window.location.search).toBe("");
  });

  it("abre primero el estado del envío escaneado y permite continuar con la actualización completa", async () => {
    const shipment = { id: 90, shipmentType: "documento", senderName: "Ana", senderLastName: "Pérez", recipientName: "Miguel", recipientLastName: "Díaz", status: "En destino", paymentStatus: "Pagado", createdAt: new Date("2026-08-19T10:00:00.000Z"), orderNumber: "8582224585", code: "ENC-2026-JVZU4", events: [] };
    mocks.deliveryShipment = { data: shipment, isLoading: false, error: null };
    window.history.replaceState({}, "", "/admin?order=8582224585&code=ENC-2026-JVZU4&open=status");
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Actualizar estado del envío" })).toBeTruthy());
    expect((screen.getByLabelText("Nuevo estado del envío") as HTMLSelectElement).value).toBe("En destino");
    expect(screen.getByText("Orden 8582224585 · Código ENC-2026-JVZU4 · Miguel Díaz")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar actualización rápida y abrir formulario completo" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Actualizar Estado de Documento" })).toBeTruthy());
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

  it("downloads a named PDF from the administrative receipt preview instead of using the print dialog", async () => {
    const shipment = {
      id: 42,
      shipmentType: "documento",
      recipientName: "Giselle",
      recipientLastName: "García",
      senderName: "Ana",
      senderLastName: "Pérez",
      recipientPhone: "+51 970188447",
      senderPhone: "+51 908722617",
      status: "En agencia",
      paymentStatus: "Falta cancelar",
      createdAt: new Date("2026-08-17T10:00:00.000Z"),
      orderNumber: "6352627659",
      code: "DOC-2026-XPF2A",
      events: [],
      hiddenFromRegistradoresAt: null,
    };
    mocks.shipments = [shipment];
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Imprimir" })).toBeTruthy());
    expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Imprimir" }));
    expect(await screen.findByText("Vista Previa de Recibo")).toBeTruthy();
    expect(screen.getAllByText("RUC 20615004708")).toHaveLength(1);
    expect(screen.queryByText("RUC: 20615004708")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Formato de descarga administrativa" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Descargar PDF" }).at(-1)!);
    await waitFor(() => expect(adminReceiptDocumentMocks.download).toHaveBeenCalledWith(expect.objectContaining({ shipment, origin: window.location.origin })));
    expect(screen.queryByText("Vista Previa de Recibo")).toBeNull();
  });

  it("reintenta automáticamente una descarga PDF administrativa que falla de forma transitoria", async () => {
    const shipment = { id: 76, shipmentType: "documento", recipientName: "Luis", recipientLastName: "Mendoza", status: "En agencia", paymentStatus: "Pagado", createdAt: new Date("2026-08-18T10:00:00.000Z"), orderNumber: "8002224585", code: "DOC-2026-RETRY", events: [] };
    mocks.shipments = [shipment];
    adminReceiptDocumentMocks.download.mockRejectedValueOnce(new Error("Fallo temporal")).mockResolvedValueOnce("recibo-documento-luis-mendoza-orden-8002224585.pdf");
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Descargar PDF" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));
    await waitFor(() => expect(adminReceiptDocumentMocks.download).toHaveBeenCalledTimes(2));
    expect(mocks.reportPdfDownloadFailure.mutate).not.toHaveBeenCalled();
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
      status: index === 6 ? "Entregado" : "En agencia",
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
    const logisticsSelect = screen.getByLabelText("Filtro de estado del envío") as HTMLSelectElement;
    expect(Array.from(logisticsSelect.options).map(option => option.value)).toContain("Entregado");
    fireEvent.change(logisticsSelect, { target: { value: "Entregado" } });
    expect(screen.getByText("Cliente 7 Prueba")).toBeTruthy();
    expect(screen.queryByText("Cliente 5 Prueba")).toBeNull();
  });

  it("mantiene la calculadora disponible al cambiar de área de trabajo", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));

    const calculatorButton = await screen.findByRole("button", { name: "Calculadora" });
    fireEvent.click(calculatorButton);
    expect(screen.getByLabelText("Operación de calculadora")).toBeTruthy();
    expect(screen.getByRole("button", { name: "%" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "sin(" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver funciones científicas y trigonométricas" }));
    expect(screen.getByRole("button", { name: "sin(" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "cos(" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "tan(" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cupones" }));
    expect(screen.getByLabelText("Operación de calculadora")).toBeTruthy();
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
    expect(screen.getByRole("button", { name: "Carta de invitación" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(screen.getAllByText("Nuevo documento").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tipo de registro")).toBeNull();
    expect(screen.queryByDisplayValue("Documentos")).toBeNull();
    expect(screen.getByText("Tipo de Documento")).toBeTruthy();
    expect(screen.getByText("Precio manual en EUR (opcional)")).toBeTruthy();
    expect((screen.getByLabelText("Importe extra en EUR") as HTMLInputElement).value).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "Nueva encomienda" }));
    expect(screen.getAllByText("Nueva encomienda").length).toBeGreaterThan(0);
    expect(screen.getByText("Peso de la encomienda (kg)")).toBeTruthy();
    expect(screen.getByText("Total automático: 13.50 €")).toBeTruthy();
    expect(screen.getByText(/Tarifa automática Torino–Lima: 13,5 EUR\/kg/)).toBeTruthy();
    expect(screen.queryByDisplayValue("Documentos")).toBeNull();
    const checklistHeading = screen.getByText("Checklist de contenido");
    const notesLabel = screen.getByText("Notas");
    expect(checklistHeading.compareDocumentPosition(notesLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("marca en rojo el checklist obligatorio antes de crear un documento", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await screen.findByRole("button", { name: "Nuevo documento" });

    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear Documento" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Agrega al menos un elemento/i));
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
    expect((screen.getByLabelText("Documento de remitente - número de identificación") as HTMLInputElement).value).toBe("71234567");
    expect(screen.queryByRole("button", { name: /Ana Pérez/ })).toBeNull();
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
      extraPriceEur: 0,
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
      extraPriceEur: 0,
    });
  });

  it("limits administrative DNI input to eight digits and displays the payment selector", async () => {
    render(<AdminDashboard />);
    fireEvent.change(screen.getByPlaceholderText("Ingresa tu correo administrativo"), { target: { value: "admin@servicom.pe" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Sesión" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Nuevo documento" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));

    const senderDni = screen.getByLabelText("Documento de remitente - número de identificación") as HTMLInputElement;
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
