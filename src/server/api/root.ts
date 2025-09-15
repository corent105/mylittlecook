import { createTRPCRouter } from "@/server/api/trpc";
import { recipeRouter } from "@/server/api/routers/recipe";
import { mealPlanRouter } from "@/server/api/routers/meal-plan";
import { mealUserRouter } from "@/server/api/routers/meal-user";
import { recipeImportRouter } from "@/server/api/routers/recipe-import";
import { userSettingsRouter } from "@/server/api/routers/user-settings";
import { profileInvitationRouter } from "@/server/api/routers/profile-invitation";

export const appRouter = createTRPCRouter({
  recipe: recipeRouter,
  mealPlan: mealPlanRouter,
  mealUser: mealUserRouter,
  recipeImport: recipeImportRouter,
  userSettings: userSettingsRouter,
  profileInvitation: profileInvitationRouter,
});

export type AppRouter = typeof appRouter;