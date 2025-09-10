import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { RecipeExtractor } from "@/lib/recipe-extractor";

export const recipeImportRouter = createTRPCRouter({
  extractFromUrl: publicProcedure
    .input(z.object({
      url: z.string().url('URL invalide'),
    }))
    .mutation(async ({ input }) => {
      try {
        const extracted = await RecipeExtractor.extractFromUrl(input.url);
        return extracted;
      } catch (error) {
        throw new Error(`Erreur lors de l'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }
    }),

  createFromExtracted: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      content: z.string().min(1),
      imageUrl: z.string().url().optional(),
      prepTime: z.number().positive().optional(),
      cookTime: z.number().positive().optional(),
      servings: z.number().positive().optional(),
      sourceUrl: z.string().url(),
      parsedIngredients: z.array(z.object({
        quantity: z.number(),
        unit: z.string(),
        name: z.string(),
        notes: z.string().optional(),
        category: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sourceUrl, parsedIngredients, ...recipeData } = input;
      
      return ctx.db.$transaction(async (tx) => {
        // Create the recipe first
        const recipe = await tx.recipe.create({
          data: {
            ...recipeData,
            authorId: ctx.session.user.id,
            // Store source URL in content as a comment
            content: `${recipeData.content}\n\n---\n*Recette importée depuis: [${sourceUrl}](${sourceUrl})*`,
          },
        });

        // Process and create ingredients
        if (parsedIngredients && parsedIngredients.length > 0) {
          // Prepare all ingredient data first
          const ingredientCreations = [];
          const recipeIngredientCreations = [];
          
          for (const ingredientData of parsedIngredients) {
            // Check if ingredient already exists
            let ingredient = await tx.ingredient.findFirst({
              where: {
                name: {
                  equals: ingredientData.name,
                  mode: 'insensitive'
                }
              }
            });

            if (!ingredient) {
              console.log(`Ingredient "${ingredientData.name}" not found, creating...`);
              ingredient = await tx.ingredient.create({
                data: {
                  name: ingredientData.name,
                  unit: ingredientData.unit,
                  category: ingredientData.category,
                }
              });
              console.log(`Ingredient created with ID: ${ingredient.id}`);
            }

            // Prepare recipe-ingredient relationship data
            recipeIngredientCreations.push({
              recipeId: recipe.id,
              ingredientId: ingredient.id,
              quantity: ingredientData.quantity,
              notes: ingredientData.notes,
            });
          }

          // Create all recipe-ingredient relationships in batch
          if (recipeIngredientCreations.length > 0) {
            await tx.recipeIngredient.createMany({
              data: recipeIngredientCreations
            });
          }
        }

        // Return the complete recipe with ingredients
        return tx.recipe.findUnique({
          where: { id: recipe.id },
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
            }
          }
        });
      });
    }),
});