import { TRPCError } from "@trpc/server";
import { z } from "zod";

function buildTrackingPath(orderNumber: string, code: string): string {
  const order = orderNumber.trim().replace(/\s+/g, "").toUpperCase();
  const normalizedCode = code.trim().replace(/\s+/g, "").toUpperCase();
  return `/?order=${encodeURIComponent(order)}&code=${encodeURIComponent(normalizedCode)}`;
}
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
      const email = input.email.trim().toLowerCase();
      if (email !== 'peruservicom@gmail.com') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }
      
      const receivedPassword = input.password.trim();
      const expectedPassword = '@m*M.mTt@~ADkHpvBbLm+5CD=3ao@DngYa+3Kea6U=qX%r9EJ8-1QFc#,hD3r4Dsis9:9^i-zZJ}pT#aQAcnm^+XMAhV9u3VdrZ3.'.trim();
      if (receivedPassword !== expectedPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Credenciales inválidas',
        });
      }

      return {
        id: 1,
        email: 'peruservicom@gmail.com',
        name: 'Master Admin Servicom',
        role: 'superadmin' as const,
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
      documentCount: z.number().min(1).default(1),
    }))
    .mutation(async ({ input }) => {
      const orderNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `DOC-${new Date().getFullYear()}-${randomSuffix}`;
      
      // Modelo de negocio de tarifas documentales:
      // - Simple (hasta 4 hojas): 45 euros
      // - Apostillado (hasta 4 hojas): 50 soles o 50 euros según naturaleza. Se agregan 10 euros por cada documento adicional.
      // - Adicional simple tras 4 hojas: 2 euros más por hojas adicionales hasta 4.
      const baseFeeEur = 50;
      const additionalFeeEur = Math.max(0, input.documentCount - 1) * 10;
      const totalEur = baseFeeEur + additionalFeeEur;
      const calculatedNotes = `Tarifa: ${totalEur} EUR (${input.documentCount} doc${input.documentCount > 1 ? 's' : ''}). ${input.notes || ""}`.trim();

      const result = await createShipment(
        orderNumber,
        code,
        input.status,
        input.senderName,
        input.senderLastName,
        input.senderDni,
        input.senderPhone,
        input.recipientName,
        input.recipientLastName,
        input.recipientDni,
        input.recipientPhone,
        calculatedNotes
      );
      if (!result) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al crear envío de documento',
        });
      }
      const trackingUrl = buildTrackingPath(orderNumber, code);
      return { success: true, message: 'Envío de documento creado exitosamente con orden y código automáticos', trackingUrl };
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
