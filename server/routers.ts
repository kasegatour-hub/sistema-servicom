import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getShipmentByOrderAndCode, getShipmentById } from "./db";
import { adminRouter } from "./admin.router";
import { accountRouter } from "./account.router";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  admin: adminRouter,
  account: accountRouter,

  shipment: router({
    search: publicProcedure
      .input(z.object({
        orderNumber: z.string().min(1, "Número de orden requerido"),
        code: z.string().min(1, "Código requerido"),
      }))
      .query(async ({ input }) => {
        const shipment = await getShipmentByOrderAndCode(input.orderNumber, input.code);
        if (!shipment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Envío no encontrado',
          });
        }
        return {
          ...shipment,
          events: JSON.parse(shipment.events),
        };
      }),

    getById: publicProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ input }) => {
        const shipment = await getShipmentById(input.id);
        if (!shipment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Envío no encontrado',
          });
        }
        return {
          ...shipment,
          events: JSON.parse(shipment.events),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
