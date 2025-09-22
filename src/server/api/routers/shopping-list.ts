import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const shoppingListRouter = createTRPCRouter({
  generateShoppingList: publicProcedure
    .input(z.object({
      mealUserIds: z.array(z.string()),
      startDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
      endDate: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val).optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.mealUserIds.length === 0) {
        return [];
      }

      const requestStartDate = new Date(input.startDate);
      requestStartDate.setUTCHours(0, 0, 0, 0);

      const requestEndDate = input.endDate ? new Date(input.endDate) : new Date(requestStartDate);
      if (input.endDate) {
        requestEndDate.setUTCHours(23, 59, 59, 999);
      } else {
        requestEndDate.setUTCDate(requestEndDate.getUTCDate() + 6);
        requestEndDate.setUTCHours(23, 59, 59, 999);
      }

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
            select: {
              id: true,
              title: true,
              servings: true,
              minimalServings: true,
              ingredients: {
                include: {
                  ingredient: {
                    select: {
                      id: true,
                      name: true,
                      unit: true,
                      category: true
                    }
                  }
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

      // Consolider les ingrédients
      const ingredientsMap = new Map();

      console.log('Processing meal plans for shopping list:', mealPlans.length);

      mealPlans.forEach(mealPlan => {
        const recipe = mealPlan.recipe;
        if (!recipe) return;
        const recipeServings = recipe.servings || 1;
        const mealUserCount = mealPlan.mealUserAssignments.length;

        // Calculate effective servings considering minimalServings
        let effectiveServings = mealUserCount;
        if (recipe.minimalServings && effectiveServings < recipe.minimalServings) {
          effectiveServings = recipe.minimalServings;
        }

        const servingMultiplier = effectiveServings / recipeServings;

        recipe.ingredients.forEach((ingredientData: any) => {
          const ingredient = ingredientData.ingredient || ingredientData;

          // Skip if ingredient data is missing
          if (!ingredient || !ingredient.name) {
            console.warn('Missing ingredient data:', ingredientData);
            return;
          }

          const key = `${ingredient.name.toLowerCase().trim()}-${(ingredient.unit || '').toLowerCase().trim()}`;

          if (ingredientsMap.has(key)) {
            const existing = ingredientsMap.get(key);
            // Tenter d'additionner les quantités si elles sont numériques
            const existingQty = parseFloat(existing.totalQuantity?.replace(/[^\d.,]/g, '').replace(',', '.') || '0');
            const newQty = parseFloat((ingredientData.quantity || '').toString().replace(/[^\d.,]/g, '').replace(',', '.') || '0');

            if (!isNaN(existingQty) && !isNaN(newQty)) {
              const totalQty = existingQty + (newQty * servingMultiplier);
              existing.totalQuantity = totalQty.toString();
            } else {
              // Si on ne peut pas additionner, concaténer
              existing.totalQuantity = `${existing.totalQuantity} + ${ingredientData.quantity}`;
            }

            // Add notes if present
            if (ingredientData.notes) {
              existing.notes.push(ingredientData.notes);
            }

            // Ajouter le nom de la recette aux sources
            if (!existing.recipes.includes(recipe.title)) {
              existing.recipes.push(recipe.title);
            }
          } else {
            let adjustedQuantity = (ingredientData.quantity || '').toString();

            // Ajuster la quantité selon le nombre de personnes
            if (servingMultiplier !== 1) {
              const qty = parseFloat(adjustedQuantity.replace(/[^\d.,]/g, '').replace(',', '.'));
              if (!isNaN(qty)) {
                adjustedQuantity = (qty * servingMultiplier).toString();
              }
            }

            ingredientsMap.set(key, {
              id: ingredientData.id,
              ingredient: {
                id: ingredient.id,
                name: ingredient.name,
                unit: ingredient.unit || '',
                category: ingredient.category || 'Autres'
              },
              totalQuantity: adjustedQuantity,
              notes: [ingredientData.notes].filter(Boolean),
              recipes: [recipe.title]
            });
          }
        });
      });

      // Convertir la Map en array et trier par nom
      const consolidatedIngredients = Array.from(ingredientsMap.values())
        .filter(item => item.ingredient && item.ingredient.name) // Filter out invalid items
        .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));

      return consolidatedIngredients;
    }),
});