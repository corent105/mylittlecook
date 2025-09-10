import { createTRPCRouter } from "@/server/api/trpc";
import { recipeRouter } from "@/server/api/routers/recipe";
import { mealPlanRouter } from "@/server/api/routers/meal-plan";
import { mealUserRouter } from "@/server/api/routers/meal-user";
import { recipeImportRouter } from "@/server/api/routers/recipe-import";

export const appRouter = createTRPCRouter({
  recipe: recipeRouter,
  mealPlan: mealPlanRouter,
  mealUser: mealUserRouter,
  recipeImport: recipeImportRouter,
});

export type AppRouter = typeof appRouter;