import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { MealType } from "@prisma/client";

// Fonction utilitaire pour recalculer les restes d'un groupe
async function recalculateLeftovers(ctx: any, groupRootId: string, totalOriginalPortions: number) {
  // Récupérer tous les meal plans du groupe
  const groupMealPlans = await ctx.db.mealPlan.findMany({
    where: {
      OR: [
        { id: groupRootId },
        { mealPlanGroupId: groupRootId }
      ]
    }
  });

  // Vérifier s'il y a encore des meal plans non-leftovers
  const nonLeftoverMealPlans = groupMealPlans.filter((mp: any) => !mp.isLeftover);

  // Supprimer tous les restes existants du groupe
  await ctx.db.mealPlan.deleteMany({
    where: {
      mealPlanGroupId: groupRootId,
      isLeftover: true
    }
  });

  // Si plus aucun meal plan non-leftover, ne pas créer de nouveaux restes
  if (nonLeftoverMealPlans.length === 0) {
    return;
  }

  // Calculer les portions utilisées par tous les repas (non-leftovers)
  const usedPortions = nonLeftoverMealPlans
    .reduce((sum: number, mp: any) => sum + (mp.portionsConsumed || 0), 0);

  const leftoverPortions = totalOriginalPortions - usedPortions;

  // Créer un nouveau reste si nécessaire
  if (leftoverPortions > 0) {
    const mainMealPlan = groupMealPlans.find((mp: any) => !mp.mealPlanGroupId);
    if (mainMealPlan) {
      await ctx.db.mealPlan.create({
        data: {
          recipeId: mainMealPlan.recipeId,
          mealDate: mainMealPlan.mealDate,
          mealType: mainMealPlan.mealType,
          cookResponsibleId: mainMealPlan.cookResponsibleId,
          portionsConsumed: leftoverPortions,
          originalPortions: totalOriginalPortions,
          isLeftover: true,
          mealPlanGroupId: groupRootId,
          mealUserAssignments: {
            create: []
          }
        }
      });
    }
  }
}

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
        where: { id: input.mealPlanId }
      });

      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      // Déterminer l'ID du groupe racine
      const groupRootId = mealPlan.mealPlanGroupId || mealPlan.id;
      const isMainMealPlan = !mealPlan.mealPlanGroupId;

      // Récupérer tous les meal plans du groupe AVANT suppression
      const groupMealPlans = await ctx.db.mealPlan.findMany({
        where: {
          OR: [
            { id: groupRootId },
            { mealPlanGroupId: groupRootId }
          ]
        }
      });

      // Si on supprime le meal plan principal et qu'il y a d'autres meal plans dans le groupe
      if (isMainMealPlan && groupMealPlans.length > 1) {
        // Trouver le prochain meal plan à promouvoir comme principal
        const nextMainMealPlan = groupMealPlans.find((mp: any) => mp.id !== input.mealPlanId && !mp.isLeftover);

        if (nextMainMealPlan) {
          // Promouvoir ce meal plan comme nouveau principal
          await ctx.db.mealPlan.update({
            where: { id: nextMainMealPlan.id },
            data: {
              mealPlanGroupId: null, // Devient le nouveau principal
              originalPortions: mealPlan.originalPortions // Hérite des portions originales
            }
          });

          // Mettre à jour tous les autres meal plans pour pointer vers le nouveau principal
          await ctx.db.mealPlan.updateMany({
            where: {
              mealPlanGroupId: groupRootId,
              id: { not: nextMainMealPlan.id }
            },
            data: {
              mealPlanGroupId: nextMainMealPlan.id
            }
          });

          // Nouveau groupe racine
          const newGroupRootId = nextMainMealPlan.id;

          // Supprimer le meal plan original
          await ctx.db.mealPlan.delete({
            where: { id: input.mealPlanId }
          });

          // Recalculer les restes avec le nouveau groupe
          await recalculateLeftovers(ctx, newGroupRootId, mealPlan.originalPortions || 0);

          return { success: true, newGroupRootId };
        } else {
          // Aucun autre meal plan non-leftover trouvé, supprimer tous les restes
          await ctx.db.mealPlan.delete({
            where: { id: input.mealPlanId }
          });

          // Supprimer tous les restes du groupe
          await ctx.db.mealPlan.deleteMany({
            where: {
              mealPlanGroupId: groupRootId,
              isLeftover: true
            }
          });

          return { success: true, allLeftoversDeleted: true };
        }
      }

      // Cas normal : suppression d'un meal plan non-principal ou dernier du groupe
      const mainMealPlan = groupMealPlans.find((mp: any) => !mp.mealPlanGroupId) || groupMealPlans[0];
      const totalOriginalPortions = mainMealPlan?.originalPortions || 0;

      // Supprimer le meal plan demandé
      await ctx.db.mealPlan.delete({
        where: { id: input.mealPlanId }
      });

      // Si c'était le dernier meal plan du groupe, supprimer tous les restes associés
      if (groupMealPlans.length === 1) {
        // Supprimer tous les restes du groupe (s'il y en a)
        await ctx.db.mealPlan.deleteMany({
          where: {
            mealPlanGroupId: groupRootId,
            isLeftover: true
          }
        });
        return { success: true };
      }

      // Vérifier s'il reste des meal plans non-leftovers après suppression
      const remainingNonLeftovers = groupMealPlans.filter((mp: any) =>
        mp.id !== input.mealPlanId && !mp.isLeftover
      );

      // Si plus aucun meal plan non-leftover, supprimer tous les restes
      if (remainingNonLeftovers.length === 0) {
        await ctx.db.mealPlan.deleteMany({
          where: {
            mealPlanGroupId: groupRootId,
            isLeftover: true
          }
        });
        return { success: true };
      }

      // Recalculer les restes
      await recalculateLeftovers(ctx, groupRootId, totalOriginalPortions);

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

  updateMealPlan: protectedProcedure
    .input(z.object({
      mealPlanId: z.string(),
      recipeId: z.string().optional(),
      mealDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val).optional(),
      mealType: z.nativeEnum(MealType).optional(),
      mealUserIds: z.array(z.string()).optional(),
      cookResponsibleId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Récupérer le meal plan existant
      const existingMealPlan = await ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId }
      });

      if (!existingMealPlan) {
        throw new Error('Meal plan not found');
      }

      const isMainMealPlan = !existingMealPlan.mealPlanGroupId;
      let shouldRecalculateLeftovers = false;
      let originalPortionsChanged = false;

      // Préparer les données de mise à jour
      const updateData: any = {};

      if (input.recipeId) {
        updateData.recipeId = input.recipeId;
        // Si on change la recette du meal plan principal, il faut recalculer
        if (isMainMealPlan) {
          // Récupérer les infos de la nouvelle recette pour les portions
          const newRecipe = await ctx.db.recipe.findUnique({
            where: { id: input.recipeId }
          });
          if (newRecipe) {
            const currentPortionsCount = input.mealUserIds?.length || existingMealPlan.portionsConsumed || 0;
            const newOriginalPortions = Math.max(currentPortionsCount, newRecipe.minimalServings || newRecipe.servings || currentPortionsCount);
            if (newOriginalPortions !== existingMealPlan.originalPortions) {
              updateData.originalPortions = newOriginalPortions;
              originalPortionsChanged = true;
              shouldRecalculateLeftovers = true;
            }
          }
        }
      }

      if (input.mealDate) updateData.mealDate = input.mealDate;
      if (input.mealType) updateData.mealType = input.mealType;
      if (input.cookResponsibleId) updateData.cookResponsibleId = input.cookResponsibleId;

      // Si on change les utilisateurs assignés, mettre à jour les portions
      if (input.mealUserIds) {
        const newPortionsCount = input.mealUserIds.length;
        updateData.portionsConsumed = newPortionsCount;
        shouldRecalculateLeftovers = true;

        // Si c'est le meal plan principal et que les nouvelles portions dépassent les originales
        if (isMainMealPlan && newPortionsCount > (existingMealPlan.originalPortions || 0)) {
          updateData.originalPortions = newPortionsCount;
          originalPortionsChanged = true;
        }

        // Mettre à jour les assignations
        updateData.mealUserAssignments = {
          deleteMany: {}, // Supprimer toutes les assignations existantes
          create: input.mealUserIds.map(mealUserId => ({
            mealUserId
          }))
        };
      }

      // Mettre à jour le meal plan
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
          },
          cookResponsible: true
        }
      });

      // Si on a changé les portions originales du meal plan principal,
      // mettre à jour tous les meal plans du groupe
      if (isMainMealPlan && originalPortionsChanged) {
        const groupRootId = existingMealPlan.id;
        await ctx.db.mealPlan.updateMany({
          where: {
            mealPlanGroupId: groupRootId
          },
          data: {
            originalPortions: updateData.originalPortions
          }
        });
      }

      // Recalculer les restes si nécessaire
      if (shouldRecalculateLeftovers) {
        const groupRootId = existingMealPlan.mealPlanGroupId || existingMealPlan.id;
        const finalOriginalPortions = updateData.originalPortions || existingMealPlan.originalPortions || 0;
        await recalculateLeftovers(ctx, groupRootId, finalOriginalPortions);
      }

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

  convertLeftoverToMeal: protectedProcedure
    .input(z.object({
      mealPlanId: z.string(),
      newMealDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      newMealType: z.nativeEnum(MealType),
      mealUserIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      // Vérifier que le meal plan existe et est un reste
      const leftoverMealPlan = await ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId },
        include: {
          recipe: true,
          mealUserAssignments: true
        }
      });

      if (!leftoverMealPlan) {
        throw new Error('Meal plan not found');
      }

      if (!leftoverMealPlan.isLeftover) {
        throw new Error('Can only convert leftover meal plans');
      }

      // Vérifier qu'au moins un utilisateur est fourni
      if (input.mealUserIds.length === 0) {
        throw new Error('At least one meal user must be specified');
      }

      // Calculer les portions consommées basées sur le nombre d'utilisateurs
      const requestedPortions = input.mealUserIds.length;
      const availablePortions = leftoverMealPlan.portionsConsumed || 0;
      const actualPortions = Math.min(requestedPortions, availablePortions);

      // Mettre à jour le meal plan existant pour le convertir en repas normal
      // Garder le lien mealPlanGroupId pour maintenir la traçabilité
      const updatedMealPlan = await ctx.db.mealPlan.update({
        where: { id: input.mealPlanId },
        data: {
          mealDate: input.newMealDate,
          mealType: input.newMealType,
          isLeftover: false,
          portionsConsumed: actualPortions,
          // Garder mealPlanGroupId pour maintenir le lien avec le groupe original
          mealUserAssignments: {
            deleteMany: {}, // Supprimer les assignations existantes
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
          },
          cookResponsible: true
        }
      });

      // Recalculer les restes pour le groupe
      const groupRootId = leftoverMealPlan.mealPlanGroupId!;
      const totalOriginalPortions = leftoverMealPlan.originalPortions || 0;
      await recalculateLeftovers(ctx, groupRootId, totalOriginalPortions);

      return {
        convertedMealPlan: updatedMealPlan,
        remainingPortions: availablePortions - actualPortions
      };
    }),
});