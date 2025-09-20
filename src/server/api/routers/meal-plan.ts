import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { MealType } from "@prisma/client";

export const mealPlanRouter = createTRPCRouter({
  getWeekPlan: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      startDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      endDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // If no meal users provided, return empty array
      if (input.mealUserIds.length === 0) {
        return [];
      }

      // Create date range to handle timestamp differences
      // Ensure we use UTC dates to avoid timezone issues
      const requestStartDate = new Date(input.startDate);
      requestStartDate.setUTCHours(0, 0, 0, 0);

      const requestEndDate = input.endDate ? new Date(input.endDate) : new Date(requestStartDate);
      if (input.endDate) {
        requestEndDate.setUTCHours(23, 59, 59, 999);
      } else {
        requestEndDate.setUTCDate(requestEndDate.getUTCDate() + 6);
        requestEndDate.setUTCHours(23, 59, 59, 999);
      }

      // Find meal plans where the week overlaps with our requested period
      // We need to find weeks that start before or during our period and end after or during our period
      const earliestWeekStart = new Date(requestStartDate);
      earliestWeekStart.setUTCDate(earliestWeekStart.getUTCDate() - 6); // Go back 6 days to catch weeks that started before

      const latestWeekStart = new Date(requestEndDate);
      // Keep as is - we want weeks that start on or before our end date

      const mealPlans = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
            gte: requestStartDate,
            lte: requestEndDate
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
              },
              types: {
                select: {
                  id: true,
                  type: true
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
        },
        orderBy: [
          { mealDate: "asc" },
          { mealType: "asc" }
        ]
      });

      return mealPlans;
    }),

  addMealToSlot: protectedProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()).optional(),
      mealDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      mealType: z.nativeEnum(MealType),
      recipeId: z.string(),
      cookResponsibleId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let mealUserIds = input.mealUserIds || [];

      // If no meal users provided, try to get default settings for this slot
      if (mealUserIds.length === 0) {
        const dayOfWeek = input.mealDate.getDay() === 0 ? 6 : input.mealDate.getDay() - 1; // Convert Sunday=0 to Monday=0 format
        const defaultSetting = await ctx.db.defaultSlotSetting.findUnique({
          where: {
            ownerId_dayOfWeek_mealType: {
              ownerId: ctx.session.user.id,
              dayOfWeek: dayOfWeek,
              mealType: input.mealType,
            }
          },
          include: {
            defaultAssignments: true
          }
        });

        if (defaultSetting && defaultSetting.defaultAssignments.length > 0) {
          mealUserIds = defaultSetting.defaultAssignments.map(assignment => assignment.mealUserId);

          // Also set the default cook responsible if not provided and if one is set in defaults
          if (!input.cookResponsibleId && defaultSetting.defaultCookResponsibleId) {
            input.cookResponsibleId = defaultSetting.defaultCookResponsibleId;
          }
        } else {
          // Fallback: use all meal users for this user
          const existingMealUsers = await ctx.db.mealUser.findMany({
            where: { ownerId: ctx.session.user.id },
          });

          mealUserIds = existingMealUsers.map(mu => mu.id);
        }
      }
      // Create the meal plan
      const mealPlan = await ctx.db.mealPlan.create({
        data: {
          mealDate: input.mealDate,
          mealType: input.mealType,
          recipeId: input.recipeId,
          cookResponsibleId: input.cookResponsibleId,
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
        data: mealUserIds.map(mealUserId => ({
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
              },
              types: {
                select: {
                  id: true,
                  type: true
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
      startDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      endDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      cookResponsibleId: z.string().optional(), // Filter by cook responsible
    }))
    .query(async ({ ctx, input }) => {
      // If no meal users provided, return empty array
      if (input.mealUserIds.length === 0) {
        return [];
      }

      // Create date range to handle timestamp differences
      // Ensure we use UTC dates to avoid timezone issues
      const requestStartDate = new Date(input.startDate);
      requestStartDate.setUTCHours(0, 0, 0, 0);
      const requestEndDate = new Date(input.endDate);
      requestEndDate.setUTCHours(23, 59, 59, 999);

      // Find overlapping weeks
      const earliestWeekStart = new Date(requestStartDate);
      earliestWeekStart.setUTCDate(earliestWeekStart.getUTCDate() - 6);
      const latestWeekStart = new Date(requestEndDate);

      const allMealPlans = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
            gte: requestStartDate,
            lte: requestEndDate
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
          },
          ...(input.cookResponsibleId && {
            cookResponsibleId: input.cookResponsibleId
          })
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
          },
          mealUserAssignments: true
        }
      });

      const mealPlans = allMealPlans;

      // Aggregate ingredients
      const ingredientMap = new Map<string, {
        ingredient: { id: string; name: string; unit: string; category: string | null };
        totalQuantity: number;
        notes: string[];
      }>();

      for (const mealPlan of mealPlans) {
        if (!mealPlan.recipe) continue;
        
        // Calculate the number of people for this meal
        const peopleCount = mealPlan.mealUserAssignments.length;
        const recipeServings = mealPlan.recipe.servings || 1;
        
        // Calculate the multiplier: (people assigned / recipe servings)
        const multiplier = peopleCount / recipeServings;
        
        for (const recipeIngredient of mealPlan.recipe.ingredients) {
          const key = recipeIngredient.ingredient.id;
          const existing = ingredientMap.get(key);
          
          // Adjust quantity based on the number of people
          const adjustedQuantity = recipeIngredient.quantity * multiplier;
          
          if (existing) {
            existing.totalQuantity += adjustedQuantity;
            if (recipeIngredient.notes) {
              existing.notes.push(recipeIngredient.notes);
            }
          } else {
            ingredientMap.set(key, {
              ingredient: recipeIngredient.ingredient,
              totalQuantity: adjustedQuantity,
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
      // Ensure we use UTC dates to avoid timezone issues
      const sourceWeekStart = new Date(input.sourceWeekStart);
      sourceWeekStart.setUTCHours(0, 0, 0, 0);
      const sourceWeekEnd = new Date(sourceWeekStart);
      sourceWeekEnd.setUTCDate(sourceWeekEnd.getUTCDate() + 7);

      const sourceMeals = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
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
      // Ensure we use UTC dates to avoid timezone issues
      const targetWeekStart = new Date(input.targetWeekStart);
      targetWeekStart.setUTCHours(0, 0, 0, 0);
      const targetWeekEnd = new Date(targetWeekStart);
      targetWeekEnd.setUTCDate(targetWeekEnd.getUTCDate() + 7);

      // Delete existing meals for target week for these users
      const existingTargetMeals = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
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
        // Calculate the target meal date by adding the same number of days to target week start
        const sourceMealDate = new Date(sourceMeal.mealDate);
        const sourceWeekDaysDiff = Math.floor((sourceMealDate.getTime() - sourceWeekStart.getTime()) / (1000 * 60 * 60 * 24));
        const targetMealDate = new Date(targetWeekStart);
        targetMealDate.setUTCDate(targetWeekStart.getUTCDate() + sourceWeekDaysDiff);

        const newMeal = await ctx.db.mealPlan.create({
          data: {
            mealDate: targetMealDate,
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

  getCooksForWeek: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      startDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      endDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val).optional(),
    }))
    .query(async ({ ctx, input }) => {
      // If no meal users provided, return empty array
      if (input.mealUserIds.length === 0) {
        return [];
      }

      // Create date range
      const requestStartDate = new Date(input.startDate);
      requestStartDate.setUTCHours(0, 0, 0, 0);

      const requestEndDate = input.endDate ? new Date(input.endDate) : new Date(requestStartDate);
      if (input.endDate) {
        requestEndDate.setUTCHours(23, 59, 59, 999);
      } else {
        requestEndDate.setUTCDate(requestEndDate.getUTCDate() + 6);
        requestEndDate.setUTCHours(23, 59, 59, 999);
      }

      // Find overlapping weeks
      const earliestWeekStart = new Date(requestStartDate);
      earliestWeekStart.setUTCDate(earliestWeekStart.getUTCDate() - 6);
      const latestWeekStart = new Date(requestEndDate);

      const mealPlans = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
            gte: requestStartDate,
            lte: requestEndDate
          },
          mealUserAssignments: {
            some: {
              mealUserId: {
                in: input.mealUserIds
              }
            }
          },
          cookResponsible: {
            isNot: null
          }
        },
        include: {
          cookResponsible: true
        },
        distinct: ['cookResponsibleId']
      });

      // Extract unique cook responsible profiles
      const uniqueCooks = mealPlans
        .filter(mp => mp.cookResponsible)
        .map(mp => mp.cookResponsible!)
        .filter((cook, index, self) =>
          self.findIndex(c => c.id === cook.id) === index
        );

      return uniqueCooks;
    }),

  addMealUserToMeal: protectedProcedure
    .input(z.object({
      mealPlanId: z.string(),
      mealUserId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if assignment already exists
      const existingAssignment = await ctx.db.mealPlanAssignment.findUnique({
        where: {
          mealPlanId_mealUserId: {
            mealPlanId: input.mealPlanId,
            mealUserId: input.mealUserId,
          }
        }
      });

      if (existingAssignment) {
        throw new Error("Cette personne est déjà assignée à ce repas");
      }

      return ctx.db.mealPlanAssignment.create({
        data: {
          mealPlanId: input.mealPlanId,
          mealUserId: input.mealUserId,
        },
        include: {
          mealUser: true,
          mealPlan: {
            include: {
              recipe: true,
            }
          }
        }
      });
    }),

  removeMealUserFromMeal: protectedProcedure
    .input(z.object({
      mealPlanId: z.string(),
      mealUserId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.mealPlanAssignment.delete({
        where: {
          mealPlanId_mealUserId: {
            mealPlanId: input.mealPlanId,
            mealUserId: input.mealUserId,
          }
        }
      });
    }),

  getMealDetails: publicProcedure
    .input(z.object({
      mealPlanId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId },
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
              },
              types: {
                select: {
                  id: true,
                  type: true
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
    }),
});