import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { RecipeCategoryType } from "@prisma/client";

export const recipeRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const recipes = await ctx.db.recipe.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          ingredients: {
            include: {
              ingredient: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (recipes.length > input.limit) {
        const nextItem = recipes.pop();
        nextCursor = nextItem!.id;
      }

      return {
        recipes,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.recipe.findUnique({
        where: { id: input.id },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          ingredients: {
            include: {
              ingredient: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      content: z.string().min(1),
      imageUrl: z.string().url().optional(),
      servings: z.number().positive().optional(),
      prepTime: z.number().positive().optional(),
      cookTime: z.number().optional(),
      ingredients: z.array(z.object({
        name: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string(),
        notes: z.string().optional(),
      })).optional(),
      tags: z.array(z.string()).optional(),
      types: z.array(z.nativeEnum(RecipeCategoryType)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { ingredients, tags, types, ...recipeData } = input;
      
      // Automatically set the authorId to the authenticated user
      const dataWithAuthor = {
        ...recipeData,
        authorId: ctx.session.user.id,
      };

      // Process ingredients if provided
      let processedIngredients = undefined;
      if (ingredients && ingredients.length > 0) {
        processedIngredients = await Promise.all(ingredients.map(async (ing) => {
          // Find or create ingredient (only by name, since name is unique)
          let ingredient = await ctx.db.ingredient.findFirst({
            where: { 
              name: { equals: ing.name, mode: "insensitive" }
            }
          });

          if (!ingredient) {
            ingredient = await ctx.db.ingredient.create({
              data: {
                name: ing.name,
                unit: ing.unit, // Use the user's provided unit as default
              }
            });
          }

          return {
            quantity: ing.quantity,
            notes: ing.notes ? `${ing.notes} (${ing.unit})` : ing.unit, // Include user's unit in notes
            ingredient: {
              connect: { id: ingredient.id }
            }
          };
        }));
      }
      
      return ctx.db.recipe.create({
        data: {
          ...dataWithAuthor,
          ingredients: processedIngredients ? {
            create: processedIngredients
          } : undefined,
          tags: tags ? {
            create: tags.map(tagId => ({
              tag: {
                connect: { id: tagId }
              }
            }))
          } : undefined,
          types: types ? {
            create: types.map(type => ({
              type: type
            }))
          } : undefined,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          ingredients: {
            include: {
              ingredient: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      content: z.string().min(1).optional(),
      imageUrl: z.string().url().optional(),
      servings: z.number().positive().optional(),
      prepTime: z.number().positive().optional(),
      cookTime: z.number().positive().optional(),
      types: z.array(z.nativeEnum(RecipeCategoryType)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, types, ...updateData } = input;

      return ctx.db.recipe.update({
        where: { id },
        data: {
          ...updateData,
          types: types ? {
            deleteMany: {},
            create: types.map(type => ({
              type: type
            }))
          } : undefined,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          ingredients: {
            include: {
              ingredient: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.recipe.delete({
        where: { id: input.id },
      });
    }),

  search: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(20),
      types: z.array(z.nativeEnum(RecipeCategoryType)).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const whereClause: any = {
        OR: [
          { title: { contains: input.query, mode: "insensitive" } },
          { description: { contains: input.query, mode: "insensitive" } },
          { content: { contains: input.query, mode: "insensitive" } },
        ]
      };

      // Add type filtering if provided
      if (input.types && input.types.length > 0) {
        whereClause.types = {
          some: {
            type: {
              in: input.types
            }
          }
        };
      }

      return ctx.db.recipe.findMany({
        where: whereClause,
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });
    }),

  getMyRecipes: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const recipes = await ctx.db.recipe.findMany({
        where: { authorId: ctx.session.user.id },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          ingredients: {
            include: {
              ingredient: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (recipes.length > input.limit) {
        const nextItem = recipes.pop();
        nextCursor = nextItem!.id;
      }

      return {
        recipes,
        nextCursor,
      };
    }),

  getOthersRecipes: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const recipes = await ctx.db.recipe.findMany({
        where: { 
          authorId: { not: ctx.session.user.id }
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          ingredients: {
            include: {
              ingredient: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (recipes.length > input.limit) {
        const nextItem = recipes.pop();
        nextCursor = nextItem!.id;
      }

      return {
        recipes,
        nextCursor,
      };
    }),

  getByTypes: publicProcedure
    .input(z.object({
      types: z.array(z.nativeEnum(RecipeCategoryType)),
      limit: z.number().min(1).max(50).default(20),
      cursor: z.string().nullish(),
    }))
    .query(async ({ ctx, input }) => {
      const recipes = await ctx.db.recipe.findMany({
        where: {
          types: {
            some: {
              type: {
                in: input.types
              }
            }
          }
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, name: true, email: true }
          },
          tags: {
            include: {
              tag: true
            }
          },
          types: true
        }
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (recipes.length > input.limit) {
        const nextItem = recipes.pop();
        nextCursor = nextItem!.id;
      }

      return {
        recipes,
        nextCursor,
      };
    }),
});