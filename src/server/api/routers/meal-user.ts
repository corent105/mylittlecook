import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";

export const mealUserRouter = createTRPCRouter({
  // Récupérer tous les profils du foyer de l'utilisateur connecté
  getMyHouseholdProfiles: protectedProcedure
    .query(async ({ ctx }) => {
      // Vérifier si l'utilisateur a au moins un MealUser
      const existingMealUsers = await ctx.db.mealUser.findMany({
        where: { ownerId: ctx.session.user.id },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          owner: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: "asc" }
      });

      // Si l'utilisateur n'a aucun MealUser, en créer un automatiquement
      if (existingMealUsers.length === 0) {
        const pseudo = ctx.session.user.name || "Moi";

        const newMealUser = await ctx.db.mealUser.create({
          data: {
            pseudo,
            userId: ctx.session.user.id,
            ownerId: ctx.session.user.id,
          },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            },
            owner: {
              select: { id: true, name: true, email: true }
            }
          }
        });

        return [newMealUser];
      }

      return existingMealUsers;
    }),

  // Créer le profil initial lors de l'onboarding
  createInitialProfile: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Vérifier si l'utilisateur a déjà des profils
      const existingProfiles = await ctx.db.mealUser.count({
        where: { ownerId: ctx.session.user.id }
      });

      if (existingProfiles > 0) {
        throw new Error("L'utilisateur a déjà des profils configurés");
      }

      // Créer le premier profil avec le nom de l'utilisateur
      const profile = await ctx.db.mealUser.create({
        data: {
          pseudo: ctx.session.user.name || "Moi",
          userId: ctx.session.user.id,
          ownerId: ctx.session.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      return profile;
    }),

  // Ajouter un nouveau profil au foyer
  create: protectedProcedure
    .input(z.object({
      pseudo: z.string().min(1),
      userId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealUser.create({
        data: {
          pseudo: input.pseudo,
          userId: input.userId,
          ownerId: ctx.session.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),

  // Modifier un profil (seulement le propriétaire peut modifier ses profils)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      pseudo: z.string().min(1),
      userId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est le propriétaire du profil
      const profile = await ctx.db.mealUser.findUnique({
        where: { id: input.id },
        select: { ownerId: true }
      });

      if (!profile || profile.ownerId !== ctx.session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à modifier ce profil");
      }

      return ctx.db.mealUser.update({
        where: { id: input.id },
        data: {
          pseudo: input.pseudo,
          userId: input.userId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),

  // Supprimer un profil (seulement le propriétaire peut supprimer ses profils)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est le propriétaire du profil
      const profile = await ctx.db.mealUser.findUnique({
        where: { id: input.id },
        select: { ownerId: true }
      });

      if (!profile || profile.ownerId !== ctx.session.user.id) {
        throw new Error("Vous n'êtes pas autorisé à supprimer ce profil");
      }

      return ctx.db.mealUser.delete({
        where: { id: input.id }
      });
    }),
 
});