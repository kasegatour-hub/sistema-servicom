import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getAdminByEmail, getAllShipments, createShipment, updateShipmentStatus } from "./db";

export const adminRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Verificar que sea el email correcto
      if (input.email !== 'kasegatour@gmail.com') {
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

      // Simple password check (in production, use bcrypt)
      if (input.password !== '$Justina2025') {
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
      status: z.enum(["En agencia", "En tránsito", "En destino"]),
    }))
    .mutation(async ({ input }) => {
      const result = await createShipment(input.orderNumber, input.code, input.status);
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
      newStatus: z.enum(["En agencia", "En tránsito", "En destino"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await updateShipmentStatus(input.shipmentId, input.newStatus, input.description || '');
      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Encomienda no encontrada',
        });
      }
      return { success: true };
    }),
});
