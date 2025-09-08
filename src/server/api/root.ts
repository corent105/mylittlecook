import { createTRPCRouter } from "@/server/api/trpc";
import { recipeRouter } from "@/server/api/routers/recipe";
import { mealPlanRouter } from "@/server/api/routers/meal-plan";
import { projectRouter } from "@/server/api/routers/project";
import { recipeImportRouter } from "@/server/api/routers/recipe-import";

export const appRouter = createTRPCRouter({
  recipe: recipeRouter,
  mealPlan: mealPlanRouter,
  project: projectRouter,
  recipeImport: recipeImportRouter,
});

export type AppRouter = typeof appRouter;