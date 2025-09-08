import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { ProjectRole } from "@prisma/client";

export const projectRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findMany({
        where: {
          OR: [
            { ownerId: input.userId },
            {
              members: {
                some: {
                  userId: input.userId
                }
              }
            }
          ]
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          _count: {
            select: {
              mealPlans: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          mealPlans: {
            include: {
              recipe: {
                select: { id: true, title: true, imageUrl: true }
              }
            },
            orderBy: [
              { week: "desc" },
              { dayOfWeek: "asc" },
              { mealType: "asc" }
            ],
            take: 50
          }
        }
      });
    }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      ownerId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          name: input.name,
          ownerId: input.ownerId,
        },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id },
        data: { name: input.name },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          }
        }
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.delete({
        where: { id: input.id },
      });
    }),

  addMember: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userEmail: z.string().email(),
      role: z.nativeEnum(ProjectRole).default(ProjectRole.CONTRIBUTOR),
    }))
    .mutation(async ({ ctx, input }) => {
      // First find the user by email
      const user = await ctx.db.user.findUnique({
        where: { email: input.userEmail }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check if user is already a member
      const existingMember = await ctx.db.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId: input.projectId
          }
        }
      });

      if (existingMember) {
        throw new Error("User is already a member of this project");
      }

      return ctx.db.projectMember.create({
        data: {
          userId: user.id,
          projectId: input.projectId,
          role: input.role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),

  removeMember: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.delete({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId
          }
        }
      });
    }),

  updateMemberRole: publicProcedure
    .input(z.object({
      projectId: z.string(),
      userId: z.string(),
      role: z.nativeEnum(ProjectRole),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMember.update({
        where: {
          userId_projectId: {
            userId: input.userId,
            projectId: input.projectId
          }
        },
        data: { role: input.role },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      });
    }),
});