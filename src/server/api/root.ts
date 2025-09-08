import { createTRPCRouter } from "@/server/api/trpc";
import { recipeRouter } from "@/server/api/routers/recipe";
import { mealPlanRouter } from "@/server/api/routers/meal-plan";
import { projectRouter } from "@/server/api/routers/project";

export const appRouter = createTRPCRouter({
  recipe: recipeRouter,
  mealPlan: mealPlanRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;