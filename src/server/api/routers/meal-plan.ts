import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { MealType } from "@prisma/client";

export const mealPlanRouter = createTRPCRouter({
  getWeekPlan: publicProcedure
    .input(z.object({
      projectId: z.string(),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mealPlan.findMany({
        where: {
          projectId: input.projectId,
          week: input.weekStart,
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
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { mealType: "asc" }
        ]
      });
    }),

  addMealToSlot: publicProcedure
    .input(z.object({
      projectId: z.string(),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      dayOfWeek: z.number().min(0).max(6),
      mealType: z.nativeEnum(MealType),
      recipeId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealPlan.upsert({
        where: {
          projectId_week_dayOfWeek_mealType: {
            projectId: input.projectId,
            week: input.weekStart,
            dayOfWeek: input.dayOfWeek,
            mealType: input.mealType,
          }
        },
        update: {
          recipeId: input.recipeId,
        },
        create: {
          projectId: input.projectId,
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
    }),

  removeMealFromSlot: publicProcedure
    .input(z.object({
      projectId: z.string(),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      dayOfWeek: z.number().min(0).max(6),
      mealType: z.nativeEnum(MealType),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealPlan.deleteMany({
        where: {
          projectId: input.projectId,
          week: input.weekStart,
          dayOfWeek: input.dayOfWeek,
          mealType: input.mealType,
        }
      });
    }),

  generateShoppingList: publicProcedure
    .input(z.object({
      projectId: z.string(),
      weekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .query(async ({ ctx, input }) => {
      const mealPlans = await ctx.db.mealPlan.findMany({
        where: {
          projectId: input.projectId,
          week: input.weekStart,
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
      projectId: z.string(),
      sourceWeekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      targetWeekStart: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .mutation(async ({ ctx, input }) => {
      const sourceMeals = await ctx.db.mealPlan.findMany({
        where: {
          projectId: input.projectId,
          week: input.sourceWeekStart,
        }
      });

      if (sourceMeals.length === 0) {
        return [];
      }

      // Delete existing meals for target week
      await ctx.db.mealPlan.deleteMany({
        where: {
          projectId: input.projectId,
          week: input.targetWeekStart,
        }
      });

      // Create new meals for target week
      const newMeals = sourceMeals.map(meal => ({
        projectId: input.projectId,
        week: input.targetWeekStart,
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        recipeId: meal.recipeId,
      }));

      return ctx.db.mealPlan.createMany({
        data: newMeals,
      });
    }),
});