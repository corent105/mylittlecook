import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userSettingsRouter = createTRPCRouter({
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const settings = await ctx.db.userSettings.findUnique({
        where: { userId: ctx.session.user.id },
      });

      if (!settings) {
        // Create default settings if they don't exist
        return await ctx.db.userSettings.create({
          data: {
            userId: ctx.session.user.id,
            defaultPeopleCount: 2,
          },
        });
      }

      return settings;
    }),

  update: protectedProcedure
    .input(z.object({
      defaultPeopleCount: z.number().min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userSettings.upsert({
        where: { userId: ctx.session.user.id },
        update: {
          defaultPeopleCount: input.defaultPeopleCount,
        },
        create: {
          userId: ctx.session.user.id,
          defaultPeopleCount: input.defaultPeopleCount,
        },
      });
    }),
});