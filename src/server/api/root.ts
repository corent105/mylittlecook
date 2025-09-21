import { createTRPCRouter } from "@/server/api/trpc";
import { recipeRouter } from "@/server/api/routers/recipe";
import { mealPlanQueryRouter } from "@/server/api/routers/meal-plan-query";
import { mealPlanMutationRouter } from "@/server/api/routers/meal-plan-mutations";
import { shoppingListRouter } from "@/server/api/routers/shopping-list";
import { mealUserRouter } from "@/server/api/routers/meal-user";
import { recipeImportRouter } from "@/server/api/routers/recipe-import";
import { profileInvitationRouter } from "@/server/api/routers/profile-invitation";
import { defaultSlotSettingsRouter } from "@/server/api/routers/default-slot-settings";

export const appRouter = createTRPCRouter({
  recipe: recipeRouter,
  mealPlan: mealPlanQueryRouter,
  mealPlanMutation: mealPlanMutationRouter,
  shoppingList: shoppingListRouter,
  mealUser: mealUserRouter,
  recipeImport: recipeImportRouter,
  profileInvitation: profileInvitationRouter,
  defaultSlotSettings: defaultSlotSettingsRouter,
});

export type AppRouter = typeof appRouter;