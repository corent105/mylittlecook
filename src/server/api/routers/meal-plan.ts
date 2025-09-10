import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { MealType } from "@prisma/client";

export const mealPlanRouter = createTRPCRouter({
  getWeekPlan: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .query(async ({ ctx, input }) => {
      // If no meal users provided, return empty array
      if (input.mealUserIds.length === 0) {
        return [];
      }

      // Create date range for the week to handle timestamp differences
      const weekStart = new Date(input.weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const mealPlans = await ctx.db.mealPlan.findMany({
        where: {
          week: {
            gte: weekStart,
            lt: weekEnd
          },
          mealUserAssignments: {
            some: {
              mealUserId: {
                in: input.mealUserIds
              }
            }
          }
        },
        include: {
          recipe: {
            include: {
              author: {
                select: { id: true, name: true, email: true }
              },
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
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { mealType: "asc" }
        ]
      });
      return mealPlans;
    }),

  addMealToSlot: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      dayOfWeek: z.number().min(0).max(6),
      mealType: z.nativeEnum(MealType),
      recipeId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create the meal plan
      const mealPlan = await ctx.db.mealPlan.create({
        data: {
          week: input.weekStart,
          dayOfWeek: input.dayOfWeek,
          mealType: input.mealType,
          recipeId: input.recipeId,
        },
        include: {
          recipe: {
            include: {
              author: {
                select: { id: true, name: true, email: true }
              },
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          }
        }
      });

      // Create assignments to meal users
      await ctx.db.mealPlanAssignment.createMany({
        data: input.mealUserIds.map(mealUserId => ({
          mealPlanId: mealPlan.id,
          mealUserId: mealUserId,
        }))
      });

      // Return meal plan with assignments
      return ctx.db.mealPlan.findUnique({
        where: { id: mealPlan.id },
        include: {
          recipe: {
            include: {
              author: {
                select: { id: true, name: true, email: true }
              },
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
    }),

  removeMealFromSlot: publicProcedure
    .input(z.object({
      mealPlanId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealPlan.delete({
        where: {
          id: input.mealPlanId,
        }
      });
    }),

  generateShoppingList: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .query(async ({ ctx, input }) => {
      // If no meal users provided, return empty array
      if (input.mealUserIds.length === 0) {
        return [];
      }

      // Create date range for the week to handle timestamp differences
      const weekStart = new Date(input.weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const mealPlans = await ctx.db.mealPlan.findMany({
        where: {
          week: {
            gte: weekStart,
            lt: weekEnd
          },
          mealUserAssignments: {
            some: {
              mealUserId: {
                in: input.mealUserIds
              }
            }
          },
          recipe: {
            isNot: null
          }
        },
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  ingredient: true
                }
              }
            }
          }
        }
      });

      // Aggregate ingredients
      const ingredientMap = new Map<string, {
        ingredient: { id: string; name: string; unit: string; category: string | null };
        totalQuantity: number;
        notes: string[];
      }>();

      for (const mealPlan of mealPlans) {
        if (!mealPlan.recipe) continue;
        
        for (const recipeIngredient of mealPlan.recipe.ingredients) {
          const key = recipeIngredient.ingredient.id;
          const existing = ingredientMap.get(key);
          
          if (existing) {
            existing.totalQuantity += recipeIngredient.quantity;
            if (recipeIngredient.notes) {
              existing.notes.push(recipeIngredient.notes);
            }
          } else {
            ingredientMap.set(key, {
              ingredient: recipeIngredient.ingredient,
              totalQuantity: recipeIngredient.quantity,
              notes: recipeIngredient.notes ? [recipeIngredient.notes] : [],
            });
          }
        }
      }

      return Array.from(ingredientMap.values()).sort((a, b) => 
        (a.ingredient.category || '').localeCompare(b.ingredient.category || '') ||
        a.ingredient.name.localeCompare(b.ingredient.name)
      );
    }),

  duplicateWeek: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      sourceWeekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      targetWeekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .mutation(async ({ ctx, input }) => {
      // If no meal users provided, return empty array
      if (input.mealUserIds.length === 0) {
        return [];
      }

      // Create date range for the source week to handle timestamp differences
      const sourceWeekStart = new Date(input.sourceWeekStart);
      const sourceWeekEnd = new Date(sourceWeekStart);
      sourceWeekEnd.setDate(sourceWeekEnd.getDate() + 7);

      const sourceMeals = await ctx.db.mealPlan.findMany({
        where: {
          week: {
            gte: sourceWeekStart,
            lt: sourceWeekEnd
          },
          mealUserAssignments: {
            some: {
              mealUserId: {
                in: input.mealUserIds
              }
            }
          }
        },
        include: {
          mealUserAssignments: true
        }
      });

      if (sourceMeals.length === 0) {
        return [];
      }

      // Create date range for the target week to handle timestamp differences
      const targetWeekStart = new Date(input.targetWeekStart);
      const targetWeekEnd = new Date(targetWeekStart);
      targetWeekEnd.setDate(targetWeekEnd.getDate() + 7);

      // Delete existing meals for target week for these users
      const existingTargetMeals = await ctx.db.mealPlan.findMany({
        where: {
          week: {
            gte: targetWeekStart,
            lt: targetWeekEnd
          },
          mealUserAssignments: {
            some: {
              mealUserId: {
                in: input.mealUserIds
              }
            }
          }
        }
      });

      for (const meal of existingTargetMeals) {
        await ctx.db.mealPlan.delete({
          where: { id: meal.id }
        });
      }

      // Create new meals for target week
      const results = [];
      for (const sourceMeal of sourceMeals) {
        const newMeal = await ctx.db.mealPlan.create({
          data: {
            week: input.targetWeekStart,
            dayOfWeek: sourceMeal.dayOfWeek,
            mealType: sourceMeal.mealType,
            recipeId: sourceMeal.recipeId,
          }
        });

        // Create assignments for the same users
        await ctx.db.mealPlanAssignment.createMany({
          data: sourceMeal.mealUserAssignments.map(assignment => ({
            mealPlanId: newMeal.id,
            mealUserId: assignment.mealUserId,
          }))
        });

        results.push(newMeal);
      }

      return results;
    }),
});