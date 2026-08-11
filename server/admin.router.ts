import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getAdminByEmail, getAllShipments, createShipment, updateShipmentStatus, deleteShipment } from "./db";

export const adminRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verificar que sea el email correcto
      if (input.email !== 'yeslygian2030@gmail.com') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }
      
      const admin = await getAdminByEmail(input.email);
      if (!admin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }

      // Validación sencilla para la cuenta administrativa configurada.
      // Se recortan espacios accidentales sin registrar nunca la contraseña.
      const receivedPassword = input.password.trim();
      const expectedPassword = 'Y3sl1G1an2035';
      console.log('[Auth] Admin login attempt', {
        emailMatches: input.email === 'yeslygian2030@gmail.com',
        passwordLength: receivedPassword.length,
        passwordMatches: receivedPassword === expectedPassword,
      });
      if (receivedPassword !== expectedPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      };
    }),

  getAllShipments: publicProcedure
    .query(async () => {
      const shipments = await getAllShipments();
      return shipments.map(s => ({
        ...s,
        events: JSON.parse(s.events),
      }));
    }),

  createShipment: publicProcedure
    .input(z.object({
      orderNumber: z.string().min(1),
      code: z.string().min(1),
      status: z.enum(["En agencia", "En tránsito", "En destino", "Entregado"]),
      senderName: z.string().optional(),
      senderLastName: z.string().optional(),
      senderDni: z.string().optional(),
      senderPhone: z.string().optional(),
      recipientName: z.string().optional(),
      recipientLastName: z.string().optional(),
      recipientDni: z.string().optional(),
      recipientPhone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createShipment(
        input.orderNumber,
        input.code,
        input.status,
        input.senderName,
        input.senderLastName,
        input.senderDni,
        input.senderPhone,
        input.recipientName,
        input.recipientLastName,
        input.recipientDni,
        input.recipientPhone,
        input.notes
      );
      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al crear encomienda',
        });
      }
      const trackingUrl = `/?order=${encodeURIComponent(input.orderNumber)}&code=${encodeURIComponent(input.code)}`;
      return { success: true, message: 'Encomienda creada exitosamente', trackingUrl };
    }),

  updateStatus: publicProcedure
    .input(z.object({
      shipmentId: z.number(),
      newStatus: z.enum(["En agencia", "En tránsito", "En destino", "Entregado"]),
      description: z.string().optional(),
      senderName: z.string().optional(),
      senderLastName: z.string().optional(),
      senderDni: z.string().optional(),
      senderPhone: z.string().optional(),
      recipientName: z.string().optional(),
      recipientLastName: z.string().optional(),
      recipientDni: z.string().optional(),
      recipientPhone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await updateShipmentStatus(
        input.shipmentId,
        input.newStatus,
        input.description || '',
        input.senderName,
        input.senderLastName,
        input.senderDni,
        input.senderPhone,
        input.recipientName,
        input.recipientLastName,
        input.recipientDni,
        input.recipientPhone,
        input.notes
      );
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encomienda no encontrada',
        });
      }
      return { success: true };
    }),

  deleteShipment: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await deleteShipment(input.id);
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encomienda eliminada exitosamente',
        });
      }
      return { success: true, message: 'Encomienda eliminada exitosamente' };
    }),
});
