import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { MealType } from "@prisma/client";

export const defaultSlotSettingsRouter = createTRPCRouter({
  // Get all default slot settings for the current user
  getUserSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const settings = await ctx.db.defaultSlotSetting.findMany({
        where: {
          ownerId: ctx.session.user.id,
        },
        include: {
          defaultCookResponsible: {
            select: {
              id: true,
              pseudo: true,
            }
          },
          defaultAssignments: {
            include: {
              mealUser: {
                select: {
                  id: true,
                  pseudo: true,
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

      return settings;
    }),

  // Get default meal users for a specific slot
  getDefaultMealUsers: protectedProcedure
    .input(z.object({
      dayOfWeek: z.number().min(0).max(6),
      mealType: z.nativeEnum(MealType),
    }))
    .query(async ({ ctx, input }) => {
      const setting = await ctx.db.defaultSlotSetting.findUnique({
        where: {
          ownerId_dayOfWeek_mealType: {
            ownerId: ctx.session.user.id,
            dayOfWeek: input.dayOfWeek,
            mealType: input.mealType,
          }
        },
        include: {
          defaultCookResponsible: {
            select: {
              id: true,
              pseudo: true,
            }
          },
          defaultAssignments: {
            include: {
              mealUser: {
                select: {
                  id: true,
                  pseudo: true,
                }
              }
            }
          }
        }
      });

      return setting?.defaultAssignments.map(assignment => assignment.mealUser) || [];
    }),

  // Create or update default slot setting
  upsertSlotSetting: protectedProcedure
    .input(z.object({
      dayOfWeek: z.number().min(0).max(6),
      mealType: z.nativeEnum(MealType),
      mealUserIds: z.array(z.string()),
      defaultCookResponsibleId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate that all meal users belong to the current user
      const mealUsers = await ctx.db.mealUser.findMany({
        where: {
          id: { in: input.mealUserIds },
          ownerId: ctx.session.user.id,
        }
      });

      if (mealUsers.length !== input.mealUserIds.length) {
        throw new Error("Un ou plusieurs profils ne vous appartiennent pas");
      }

      // Validate cook responsible if provided
      if (input.defaultCookResponsibleId) {
        const cookResponsible = await ctx.db.mealUser.findFirst({
          where: {
            id: input.defaultCookResponsibleId,
            ownerId: ctx.session.user.id,
          }
        });

        if (!cookResponsible) {
          throw new Error("Le responsable de cuisine sélectionné ne vous appartient pas");
        }
      }

      // Find existing setting
      const existingSetting = await ctx.db.defaultSlotSetting.findUnique({
        where: {
          ownerId_dayOfWeek_mealType: {
            ownerId: ctx.session.user.id,
            dayOfWeek: input.dayOfWeek,
            mealType: input.mealType,
          }
        },
        include: {
          defaultAssignments: true
        }
      });

      if (existingSetting) {
        // Update the setting with cook responsible
        await ctx.db.defaultSlotSetting.update({
          where: { id: existingSetting.id },
          data: {
            defaultCookResponsibleId: input.defaultCookResponsibleId || null,
          }
        });

        // Delete existing assignments
        await ctx.db.defaultSlotSettingAssignment.deleteMany({
          where: {
            settingId: existingSetting.id
          }
        });

        // Create new assignments
        if (input.mealUserIds.length > 0) {
          await ctx.db.defaultSlotSettingAssignment.createMany({
            data: input.mealUserIds.map(mealUserId => ({
              settingId: existingSetting.id,
              mealUserId: mealUserId,
            }))
          });

          // Return updated setting
          return ctx.db.defaultSlotSetting.findUnique({
            where: { id: existingSetting.id },
            include: {
              defaultCookResponsible: {
                select: {
                  id: true,
                  pseudo: true,
                }
              },
              defaultAssignments: {
                include: {
                  mealUser: {
                    select: {
                      id: true,
                      pseudo: true,
                    }
                  }
                }
              }
            }
          });
        } else {
          // If no meal users, delete the setting
          await ctx.db.defaultSlotSetting.delete({
            where: { id: existingSetting.id }
          });
          return null;
        }
      } else if (input.mealUserIds.length > 0) {
        // Create new setting
        const newSetting = await ctx.db.defaultSlotSetting.create({
          data: {
            ownerId: ctx.session.user.id,
            dayOfWeek: input.dayOfWeek,
            mealType: input.mealType,
            defaultCookResponsibleId: input.defaultCookResponsibleId || null,
          }
        });

        // Create assignments
        await ctx.db.defaultSlotSettingAssignment.createMany({
          data: input.mealUserIds.map(mealUserId => ({
            settingId: newSetting.id,
            mealUserId: mealUserId,
          }))
        });

        // Return created setting
        return ctx.db.defaultSlotSetting.findUnique({
          where: { id: newSetting.id },
          include: {
            defaultCookResponsible: {
              select: {
                id: true,
                pseudo: true,
              }
            },
            defaultAssignments: {
              include: {
                mealUser: {
                  select: {
                    id: true,
                    pseudo: true,
                  }
                }
              }
            }
          }
        });
      }

      return null;
    }),

  // Delete a specific slot setting
  deleteSlotSetting: protectedProcedure
    .input(z.object({
      dayOfWeek: z.number().min(0).max(6),
      mealType: z.nativeEnum(MealType),
    }))
    .mutation(async ({ ctx, input }) => {
      const setting = await ctx.db.defaultSlotSetting.findUnique({
        where: {
          ownerId_dayOfWeek_mealType: {
            ownerId: ctx.session.user.id,
            dayOfWeek: input.dayOfWeek,
            mealType: input.mealType,
          }
        }
      });

      if (setting) {
        await ctx.db.defaultSlotSetting.delete({
          where: { id: setting.id }
        });
      }

      return { success: true };
    }),

  // Copy settings from one day to another
  copyDaySettings: protectedProcedure
    .input(z.object({
      sourceDayOfWeek: z.number().min(0).max(6),
      targetDayOfWeek: z.number().min(0).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get source day settings
      const sourceSettings = await ctx.db.defaultSlotSetting.findMany({
        where: {
          ownerId: ctx.session.user.id,
          dayOfWeek: input.sourceDayOfWeek,
        },
        include: {
          defaultAssignments: true
        }
      });

      // Delete existing target day settings
      await ctx.db.defaultSlotSetting.deleteMany({
        where: {
          ownerId: ctx.session.user.id,
          dayOfWeek: input.targetDayOfWeek,
        }
      });

      // Create new settings for target day
      const results = [];
      for (const sourceSetting of sourceSettings) {
        const newSetting = await ctx.db.defaultSlotSetting.create({
          data: {
            ownerId: ctx.session.user.id,
            dayOfWeek: input.targetDayOfWeek,
            mealType: sourceSetting.mealType,
          }
        });

        // Create assignments
        if (sourceSetting.defaultAssignments.length > 0) {
          await ctx.db.defaultSlotSettingAssignment.createMany({
            data: sourceSetting.defaultAssignments.map(assignment => ({
              settingId: newSetting.id,
              mealUserId: assignment.mealUserId,
            }))
          });
        }

        results.push(newSetting);
      }

      return results;
    }),

  // Reset all settings (delete all)
  resetAllSettings: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.defaultSlotSetting.deleteMany({
        where: {
          ownerId: ctx.session.user.id,
        }
      });

      return { success: true };
    }),
});