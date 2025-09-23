import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const mealPlanQueryRouter = createTRPCRouter({
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

      // Pour éviter des requêtes complexes, on va d'abord récupérer l'ownerId des utilisateurs
      const firstUser = await ctx.db.mealUser.findFirst({
        where: { id: { in: input.mealUserIds } }
      });

      const ownerId = firstUser?.ownerId;

      const mealPlans = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
            gte: requestStartDate,
            lte: requestEndDate
          },
          OR: [
            // Meal plans avec des utilisateurs assignés qui font partie des utilisateurs demandés
            {
              mealUserAssignments: {
                some: {
                  mealUserId: {
                    in: input.mealUserIds
                  }
                }
              }
            },
            // Restes sans utilisateurs assignés dans le même foyer
            ...(ownerId ? [{
              isLeftover: true,
              mealUserAssignments: {
                none: {}
              },
              parentMealPlan: {
                mealUserAssignments: {
                  some: {
                    mealUser: {
                      ownerId: ownerId
                    }
                  }
                }
              }
            }] : [])
          ]
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
          cookResponsible: true,
          parentMealPlan: true,
          childMealPlans: true
        },
        orderBy: [
          { mealDate: 'asc' },
          { mealType: 'asc' }
        ]
      });

      return mealPlans;
    }),

  getCooksForWeek: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      startDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .query(async ({ ctx, input }) => {
      if (input.mealUserIds.length === 0) {
        return [];
      }

      const requestStartDate = new Date(input.startDate);
      requestStartDate.setUTCHours(0, 0, 0, 0);

      const requestEndDate = new Date(requestStartDate);
      requestEndDate.setUTCDate(requestEndDate.getUTCDate() + 6);
      requestEndDate.setUTCHours(23, 59, 59, 999);

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
          recipe: true,
          mealUserAssignments: {
            include: {
              mealUser: true
            }
          }
        },
        orderBy: [
          { mealDate: 'asc' },
          { mealType: 'asc' }
        ]
      });

      // Group by cook (first meal user assignment for each meal)
      const cooksMap = new Map();

      mealPlans.forEach(meal => {
        const cookId = meal.mealUserAssignments[0]?.mealUserId;
        if (cookId) {
          const cookData = meal.mealUserAssignments[0]?.mealUser;
          if (!cooksMap.has(cookId)) {
            cooksMap.set(cookId, {
              id: cookId,
              name: cookData?.pseudo || 'Cuisinier inconnu',
              email: cookData?.userId || '',
              meals: []
            });
          }
          cooksMap.get(cookId).meals.push({
            id: meal.id,
            recipe: meal.recipe,
            mealDate: meal.mealDate,
            mealType: meal.mealType
          });
        }
      });

      return Array.from(cooksMap.values());
    }),

  getMealDetails: publicProcedure
    .input(z.object({
      mealPlanId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const mealPlan = await ctx.db.mealPlan.findUnique({
        where: {
          id: input.mealPlanId
        },
        include: {
          recipe: {
            include: {
              types: true,
              ingredients: true,
              steps: true
            }
          },
          mealUserAssignments: {
            include: {
              mealUser: true
            }
          },
          cookResponsible: true,
          parentMealPlan: true,
          childMealPlans: true
        }
      });

      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      return mealPlan;
    }),

  getLeftoversForWeek: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      startDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
    }))
    .query(async ({ ctx, input }) => {
      if (input.mealUserIds.length === 0) {
        return [];
      }

      const requestStartDate = new Date(input.startDate);
      requestStartDate.setUTCHours(0, 0, 0, 0);

      const requestEndDate = new Date(requestStartDate);
      requestEndDate.setUTCDate(requestEndDate.getUTCDate() + 6);
      requestEndDate.setUTCHours(23, 59, 59, 999);

      const leftoverMealPlans = await ctx.db.mealPlan.findMany({
        where: {
          mealDate: {
            gte: requestStartDate,
            lte: requestEndDate
          },
          isLeftover: true,
          OR: [
            // Restes sans utilisateurs assignés (disponibles pour tous)
            {
              mealUserAssignments: {
                none: {}
              }
            },
            // Restes avec des utilisateurs assignés qui font partie des utilisateurs demandés
            {
              mealUserAssignments: {
                some: {
                  mealUserId: {
                    in: input.mealUserIds
                  }
                }
              }
            }
          ]
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
          parentMealPlan: {
            include: {
              recipe: true,
              mealUserAssignments: {
                include: {
                  mealUser: true
                }
              }
            }
          }
        },
        orderBy: [
          { mealDate: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      return leftoverMealPlans;
    }),

  getAllLeftoversByCook: publicProcedure
    .input(z.object({
      cookResponsibleId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        isLeftover: true,
        mealUserAssignments: {
          none: {} // Pas d'utilisateurs assignés (portions en attente)
        },
        ...(input.cookResponsibleId && {
          cookResponsibleId: input.cookResponsibleId
        })
      };

      const leftoverMealPlans = await ctx.db.mealPlan.findMany({
        where,
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
          cookResponsible: true,
          parentMealPlan: {
            include: {
              recipe: true,
              mealUserAssignments: {
                include: {
                  mealUser: true
                }
              }
            }
          }
        },
        orderBy: [
          { mealDate: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return leftoverMealPlans;
    }),

  getMealPlanGroup: publicProcedure
    .input(z.object({
      mealPlanId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Récupérer le meal plan pour trouver le groupe
      const mealPlan = await ctx.db.mealPlan.findUnique({
        where: { id: input.mealPlanId },
        select: { mealPlanGroupId: true, id: true }
      });

      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      // Déterminer l'ID du groupe racine
      const groupRootId = mealPlan.mealPlanGroupId || mealPlan.id;

      // Récupérer tous les meal plans du groupe (incluant le principal et tous ses dérivés)
      const groupMealPlans = await ctx.db.mealPlan.findMany({
        where: {
          OR: [
            { id: groupRootId }, // Le meal plan principal
            { mealPlanGroupId: groupRootId } // Tous les dérivés (restes et repas convertis)
          ]
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
        },
        orderBy: [
          { isLeftover: 'asc' }, // Repas normaux en premier
          { mealDate: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      // Calculer les statistiques du groupe
      const totalOriginalPortions = groupMealPlans[0]?.originalPortions || 0;
      const assignedPortions = groupMealPlans
        .filter(mp => !mp.isLeftover)
        .reduce((sum, mp) => sum + (mp.portionsConsumed || 0), 0);
      const leftoverPortions = groupMealPlans
        .filter(mp => mp.isLeftover)
        .reduce((sum, mp) => sum + (mp.portionsConsumed || 0), 0);

      return {
        groupRootId,
        totalOriginalPortions,
        assignedPortions,
        leftoverPortions,
        mealPlans: groupMealPlans,
        summary: {
          totalMealPlans: groupMealPlans.length,
          activeMeals: groupMealPlans.filter(mp => !mp.isLeftover).length,
          remainingLeftovers: groupMealPlans.filter(mp => mp.isLeftover).length,
          utilizationRate: totalOriginalPortions > 0 ? (assignedPortions / totalOriginalPortions) * 100 : 0
        }
      };
    }),

});