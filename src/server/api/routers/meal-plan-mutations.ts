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

      // Créer le meal plan
      const mealPlan = await ctx.db.mealPlan.create({
        data: {
          recipeId: input.recipeId,
          mealDate: input.mealDate,
          mealType: input.mealType,
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

      return mealPlan;
    }),

  removeMealFromSlot: publicProcedure
    .input(z.object({
      mealPlanId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
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
});