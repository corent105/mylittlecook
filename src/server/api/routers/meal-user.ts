import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const mealUserRouter = createTRPCRouter({
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.mealUser.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          mealPlanAssignments: {
            include: {
              mealPlan: {
                include: {
                  recipe: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });
    }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mealUser.findMany({
        where: { userId: input.userId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          mealPlanAssignments: {
            include: {
              mealPlan: {
                include: {
                  recipe: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      });
    }),

  create: publicProcedure
    .input(z.object({
      pseudo: z.string().min(1),
      userId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealUser.create({
        data: {
          pseudo: input.pseudo,
          userId: input.userId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      pseudo: z.string().min(1),
      userId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealUser.update({
        where: { id: input.id },
        data: {
          pseudo: input.pseudo,
          userId: input.userId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealUser.delete({
        where: { id: input.id }
      });
    }),
});