import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const profileInvitationRouter = createTRPCRouter({
  // Créer une invitation pour un profil
  createInvitation: protectedProcedure
    .input(z.object({
      mealUserId: z.string(),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est le propriétaire du profil
      const mealUser = await ctx.db.mealUser.findUnique({
        where: { id: input.mealUserId },
        select: { ownerId: true, pseudo: true }
      });

      if (!mealUser || mealUser.ownerId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à inviter pour ce profil"
        });
      }

      // Vérifier qu'il n'y a pas déjà une invitation en cours pour ce profil
      const existingInvitation = await ctx.db.profileInvitation.findFirst({
        where: {
          mealUserId: input.mealUserId,
          usedAt: null,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      if (existingInvitation) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Une invitation est déjà en cours pour ce profil"
        });
      }

      // Créer l'invitation avec expiration dans 7 jours
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await ctx.db.profileInvitation.create({
        data: {
          email: input.email,
          profileName: mealUser.pseudo,
          expiresAt,
          inviterId: ctx.session.user.id,
          mealUserId: input.mealUserId,
        },
        include: {
          inviter: {
            select: { name: true, email: true }
          },
          mealUser: {
            select: { pseudo: true }
          }
        }
      });

      return invitation;
    }),

  // Accepter une invitation
  acceptInvitation: protectedProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Trouver l'invitation
      const invitation = await ctx.db.profileInvitation.findUnique({
        where: { token: input.token },
        include: {
          mealUser: true,
          inviter: {
            select: { name: true, email: true }
          }
        }
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation non trouvée"
        });
      }

      // Vérifier que l'invitation n'a pas expiré
      if (invitation.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette invitation a expiré"
        });
      }

      // Vérifier que l'invitation n'a pas déjà été utilisée
      if (invitation.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cette invitation a déjà été utilisée"
        });
      }

      // Vérifier que l'email correspond à l'utilisateur connecté
      if (invitation.email !== ctx.session.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cette invitation n'est pas pour votre compte"
        });
      }

      // Lier le profil à l'utilisateur et marquer l'invitation comme utilisée
      const [updatedMealUser] = await ctx.db.$transaction([
        ctx.db.mealUser.update({
          where: { id: invitation.mealUserId },
          data: { userId: ctx.session.user.id },
          include: {
            owner: {
              select: { name: true, email: true }
            }
          }
        }),
        ctx.db.profileInvitation.update({
          where: { id: invitation.id },
          data: { usedAt: new Date() }
        })
      ]);

      return updatedMealUser;
    }),

  // Obtenir les invitations envoyées par l'utilisateur
  getMySentInvitations: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.profileInvitation.findMany({
        where: {
          inviterId: ctx.session.user.id
        },
        include: {
          mealUser: {
            select: { pseudo: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }),

  // Obtenir les détails d'une invitation par token (pour la page d'acceptation)
  getInvitationByToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const invitation = await ctx.db.profileInvitation.findUnique({
        where: { token: input.token },
        include: {
          inviter: {
            select: { name: true, email: true }
          },
          mealUser: {
            select: { pseudo: true }
          }
        }
      });

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation non trouvée"
        });
      }

      return invitation;
    }),

  // Annuler une invitation
  cancelInvitation: protectedProcedure
    .input(z.object({
      invitationId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'auteur de l'invitation
      const invitation = await ctx.db.profileInvitation.findUnique({
        where: { id: input.invitationId },
        select: { inviterId: true }
      });

      if (!invitation || invitation.inviterId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous n'êtes pas autorisé à annuler cette invitation"
        });
      }

      return ctx.db.profileInvitation.delete({
        where: { id: input.invitationId }
      });
    }),
});