import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const userSettingsRouter = createTRPCRouter({
    completeOnboarding: protectedProcedure
    .mutation(async ({ ctx }) => {
      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { hasCompletedOnboarding: true },
      });
    }),
});