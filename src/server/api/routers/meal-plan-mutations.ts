import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { MealType } from "@prisma/client";

export const mealPlanMutationRouter = createTRPCRouter({
  addMealToSlot: protectedProcedure
    .input(z.object({
      recipeId: z.string(),
      mealDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      mealType: z.nativeEnum(MealType),
      mealUserIds: z.array(z.string()).min(1),
      cookResponsibleId: z.string(), // Maintenant obligatoire
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que la recette existe
      const recipe = await ctx.db.recipe.findUnique({
        where: { id: input.recipeId }
      });

      if (!recipe) {
        throw new Error('Recipe not found');
      }

      // Vérifier que tous les mealUsers existent
      const mealUsers = await ctx.db.mealUser.findMany({
        where: {
          id: { in: input.mealUserIds }
        }
      });

      if (mealUsers.length !== input.mealUserIds.length) {
        throw new Error('One or more meal users not found');
      }

      // Vérifier que le cookResponsible existe
      const cookResponsible = await ctx.db.mealUser.findUnique({
        where: { id: input.cookResponsibleId }
      });

      if (!cookResponsible) {
        throw new Error('Cook responsible not found');
      }

      // Calculer les portions consommées et les restes
      const requestedPortions = input.mealUserIds.length;
      const minimalServings = recipe.minimalServings || recipe.servings || requestedPortions;
      const actualPortions = Math.max(requestedPortions, minimalServings);
      const leftoverPortions = actualPortions - requestedPortions;

      // Créer le meal plan principal
      const mealPlan = await ctx.db.mealPlan.create({
        data: {
          recipeId: input.recipeId,
          mealDate: input.mealDate,
          mealType: input.mealType,
          cookResponsibleId: input.cookResponsibleId,
          portionsConsumed: requestedPortions,
          originalPortions: actualPortions,
          isLeftover: false,
          mealUserAssignments: {
            create: input.mealUserIds.map(mealUserId => ({
              mealUserId
            }))
          }
        },
        include: {
          recipe: {
            include: {
              types: true,
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          },
          mealUserAssignments: {
            include: {
              mealUser: true
            }
          }
        }
      });

      // Créer automatiquement un meal plan pour les restes si nécessaire
      let leftoverMealPlan = null;
      if (leftoverPortions > 0) {
        leftoverMealPlan = await ctx.db.mealPlan.create({
          data: {
            recipeId: input.recipeId,
            mealDate: input.mealDate, // Même date par défaut, l'utilisateur pourra le déplacer
            mealType: input.mealType,
            cookResponsibleId: input.cookResponsibleId, // Même cookResponsible que le meal plan principal
            portionsConsumed: leftoverPortions,
            originalPortions: actualPortions,
            isLeftover: true,
            mealPlanGroupId: mealPlan.id, // Lier au meal plan principal
            mealUserAssignments: {
              create: [] // Pas d'utilisateur assigné par défaut pour les restes
            }
          },
          include: {
            recipe: {
              include: {
                types: true,
                ingredients: {
                  include: {
                    ingredient: true
                  }
                }
              }
            },
            mealUserAssignments: {
              include: {
                mealUser: true
              }
            }
          }
        });
      }

      return {
        mainMealPlan: mealPlan,
        leftoverMealPlan,
        leftoverPortions
      };
    }),

  removeMealFromSlot: publicProcedure
    .input(z.object({
      mealPlanId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // Récupérer le meal plan à supprimer
      const mealPlan = await ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId },
        include: {
          childMealPlans: true,
          parentMealPlan: true
        }
      });

      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      // Si c'est un meal plan principal, supprimer aussi tous les restes liés
      if (!mealPlan.isLeftover && mealPlan.childMealPlans.length > 0) {
        await ctx.db.mealPlan.deleteMany({
          where: {
            mealPlanGroupId: input.mealPlanId
          }
        });
      }

      // Si c'est un reste, recalculer les portions du meal plan principal
      if (mealPlan.isLeftover && mealPlan.parentMealPlan) {
        const parentMealPlan = mealPlan.parentMealPlan;
        const newLeftoverPortions = (parentMealPlan.originalPortions || 0) - (parentMealPlan.portionsConsumed || 0) - (mealPlan.portionsConsumed || 0);

        // Si il reste encore des portions, créer un nouveau meal plan de restes
        if (newLeftoverPortions > 0) {
          await ctx.db.mealPlan.create({
            data: {
              recipeId: parentMealPlan.recipeId,
              mealDate: mealPlan.mealDate,
              mealType: mealPlan.mealType,
              cookResponsibleId: parentMealPlan.cookResponsibleId,
              portionsConsumed: newLeftoverPortions,
              originalPortions: parentMealPlan.originalPortions,
              isLeftover: true,
              mealPlanGroupId: parentMealPlan.id,
              mealUserAssignments: {
                create: []
              }
            }
          });
        }
      }

      // Supprimer le meal plan
      await ctx.db.mealPlan.delete({
        where: {
          id: input.mealPlanId
        }
      });

      return { success: true };
    }),

  duplicateWeek: publicProcedure
    .input(z.object({
      sourceMealUserIds: z.array(z.string()),
      sourceStartDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      targetMealUserIds: z.array(z.string()),
      targetStartDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .mutation(async ({ ctx, input }) => {
      // Prepare date ranges
      const sourceStart = new Date(input.sourceStartDate);
      sourceStart.setUTCHours(0, 0, 0, 0);

      const sourceEnd = new Date(sourceStart);
      sourceEnd.setUTCDate(sourceEnd.getUTCDate() + 6);
      sourceEnd.setUTCHours(23, 59, 59, 999);

      const targetStart = new Date(input.targetStartDate);
      targetStart.setUTCHours(0, 0, 0, 0);

      // Get source meal plans
      const sourceMealPlans = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
            gte: sourceStart,
            lte: sourceEnd
          },
          mealUserAssignments: {
            some: {
              mealUserId: {
                in: input.sourceMealUserIds
              }
            }
          }
        },
        include: {
          mealUserAssignments: true
        }
      });

      // Calculate date offset
      const dateOffset = targetStart.getTime() - sourceStart.getTime();

      // Create new meal plans
      const duplicatedMealPlans = await Promise.all(
        sourceMealPlans.map(async (sourceMeal) => {
          const newMealDate = new Date(sourceMeal.mealDate.getTime() + dateOffset);

          return ctx.db.mealPlan.create({
            data: {
              recipeId: sourceMeal.recipeId,
              mealDate: newMealDate,
              mealType: sourceMeal.mealType,
              cookResponsibleId: sourceMeal.cookResponsibleId,
              mealUserAssignments: {
                create: input.targetMealUserIds.map(mealUserId => ({
                  mealUserId
                }))
              }
            },
            include: {
              recipe: {
                include: {
                  types: true,
                  ingredients: true
                }
              },
              mealUserAssignments: {
                include: {
                  mealUser: true
                }
              }
            }
          });
        })
      );

      return duplicatedMealPlans;
    }),

  // Temporarily disabled - schema changes needed
  // addMealUserToMeal: protectedProcedure
  //   .input(z.object({
  //     mealPlanId: z.string(),
  //     mealUserId: z.string()
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     return { success: true };
  //   }),

  // removeMealUserFromMeal: protectedProcedure
  //   .input(z.object({
  //     mealPlanId: z.string(),
  //     mealUserId: z.string()
  //   }))
  //   .mutation(async ({ ctx, input }) => {
  //     return { success: true };
  //   }),

  moveMealPlan: protectedProcedure
    .input(z.object({
      mealPlanId: z.string(),
      newMealDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      newMealType: z.nativeEnum(MealType),
    }))
    .mutation(async ({ ctx, input }) => {
      const updatedMealPlan = await ctx.db.mealPlan.update({
        where: {
          id: input.mealPlanId
        },
        data: {
          mealDate: input.newMealDate,
          mealType: input.newMealType
        },
        include: {
          recipe: {
            include: {
              types: true,
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          },
          mealUserAssignments: {
            include: {
              mealUser: true
            }
          }
        }
      });

      return updatedMealPlan;
    }),

  updateLeftoverPortions: protectedProcedure
    .input(z.object({
      mealPlanId: z.string(),
      newPortions: z.number().min(1),
      mealUserIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que le meal plan existe et est un reste
      const mealPlan = await ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId },
        include: {
          parentMealPlan: true,
          mealUserAssignments: true
        }
      });

      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      if (!mealPlan.isLeftover) {
        throw new Error('Can only update portions for leftover meal plans');
      }

      // Vérifier que les nouvelles portions ne dépassent pas le total disponible
      const parentMealPlan = mealPlan.parentMealPlan;
      if (parentMealPlan) {
        const totalOriginalPortions = parentMealPlan.originalPortions || 0;
        const parentPortions = parentMealPlan.portionsConsumed || 0;
        const availablePortions = totalOriginalPortions - parentPortions;

        if (input.newPortions > availablePortions) {
          throw new Error('Not enough leftover portions available');
        }
      }

      // Mettre à jour le meal plan
      const updateData: any = {
        portionsConsumed: input.newPortions,
      };

      // Si des utilisateurs sont fournis, les assigner
      if (input.mealUserIds) {
        // Supprimer les assignations existantes
        await ctx.db.mealPlanAssignment.deleteMany({
          where: { mealPlanId: input.mealPlanId }
        });

        // Créer les nouvelles assignations
        updateData.mealUserAssignments = {
          create: input.mealUserIds.map(mealUserId => ({
            mealUserId
          }))
        };
      }

      const updatedMealPlan = await ctx.db.mealPlan.update({
        where: { id: input.mealPlanId },
        data: updateData,
        include: {
          recipe: {
            include: {
              types: true,
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          },
          mealUserAssignments: {
            include: {
              mealUser: true
            }
          }
        }
      });

      // Calculer les nouvelles portions restantes et créer un nouveau meal plan si nécessaire
      if (parentMealPlan) {
        const remainingPortions = (parentMealPlan.originalPortions || 0) - (parentMealPlan.portionsConsumed || 0) - input.newPortions;

        if (remainingPortions > 0) {
          await ctx.db.mealPlan.create({
            data: {
              recipeId: mealPlan.recipeId,
              mealDate: mealPlan.mealDate,
              mealType: mealPlan.mealType,
              cookResponsibleId: parentMealPlan.cookResponsibleId,
              portionsConsumed: remainingPortions,
              originalPortions: parentMealPlan.originalPortions,
              isLeftover: true,
              mealPlanGroupId: parentMealPlan.id,
              mealUserAssignments: {
                create: []
              }
            }
          });
        }
      }

      return updatedMealPlan;
    }),
});