'use client';

import { useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { ChefHat, Calendar, Users, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from "@/lib/constants/recipe-types";

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface NextMealsProps {
  selectedMealUsers: string[];
}

export default function NextMeals({ selectedMealUsers }: NextMealsProps) {
  const { data: session } = useSession();

  // Memoize week calculations to prevent recalculations
  const weekStarts = useMemo(() => {
    const getCurrentWeekStart = (date: Date = new Date()) => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0); // Reset time to avoid date comparison issues
      return start;
    };

    const currentWeekStart = getCurrentWeekStart();
    const nextWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    return { currentWeekStart, nextWeekStart };
  }, []); // Empty dependency array - only calculate once

  // Get meal plans for current and next week
  const currentWeekEnd = new Date(weekStarts.currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

  const nextWeekEnd = new Date(weekStarts.nextWeekStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);

  const { data: currentWeekMealPlan = [] } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: selectedMealUsers,
    startDate: weekStarts.currentWeekStart,
    endDate: currentWeekEnd,
  }, {
    enabled: !!session?.user?.id && selectedMealUsers.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: nextWeekMealPlan = [] } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: selectedMealUsers,
    startDate: weekStarts.nextWeekStart,
    endDate: nextWeekEnd,
  }, {
    enabled: !!session?.user?.id && selectedMealUsers.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Memoize next meals calculation to prevent infinite re-renders
  const nextMeals = useMemo(() => {
    if (!currentWeekMealPlan || !nextWeekMealPlan || selectedMealUsers.length === 0) {
      return [];
    }

    const now = new Date();
    const currentDateTime = now.getTime();

    const mealTimes = {
      'BREAKFAST': { hour: 9, label: 'Petit-déjeuner' },
      'LUNCH': { hour: 14, label: 'Déjeuner' },
      'DINNER': { hour: 20, label: 'Dîner' }
    };

    const mealOrder = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const allMeals: any[] = [];

    // Helper function to process meals for a week
    const processMealsForWeek = (mealPlan: any[]) => {
      for (const meal of mealPlan) {
        const mealDate = new Date(meal.mealDate);
        const mealTypeInfo = mealTimes[meal.mealType as keyof typeof mealTimes];

        if (!mealTypeInfo) continue;

        const mealDateTime = new Date(mealDate);
        mealDateTime.setHours(mealTypeInfo.hour, 0, 0, 0);

        // Only include future meals
        if (mealDateTime.getTime() > currentDateTime) {
          const dayOfWeek = mealDate.getDay() === 0 ? 6 : mealDate.getDay() - 1; // Convert Sunday=0 to Monday=0 format

          allMeals.push({
            ...meal,
            dayName: DAYS[dayOfWeek],
            mealTypeLabel: mealTypeInfo.label,
            date: new Date(mealDate),
            mealDateTime: mealDateTime.getTime()
          });
        }
      }
    };

    // Process current week
    processMealsForWeek(currentWeekMealPlan);

    // Process next week
    processMealsForWeek(nextWeekMealPlan);

    // Sort by datetime and take first 3 (next meal slots only)
    return allMeals
      .sort((a, b) => a.mealDateTime - b.mealDateTime)
      .slice(0, 3)
      .map((meal, index) => ({
        ...meal,
        isNext: index === 0
      }));
  }, [currentWeekMealPlan, nextWeekMealPlan, selectedMealUsers, weekStarts]);

  if (nextMeals.length === 0 || selectedMealUsers.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6 sm:mb-8 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-orange-500" />
          Prochains repas
        </h3>
        {nextMeals[0]?.isNext && (
          <span className="text-xs sm:text-sm text-orange-600 font-medium bg-orange-100 px-2 py-1 rounded-full">
            Prochain repas
          </span>
        )}
      </div>

      {/* Mobile Layout - Horizontal scroll */}
      <div className="block sm:hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {nextMeals.map((meal, index) => (
            <Link
              key={meal.id}
              href={`/recettes/${meal.recipe?.id}${meal.mealUserAssignments?.length ? `?servings=${meal.mealUserAssignments.length}` : ''}`}
              className={`relative group cursor-pointer transition-all duration-200 flex-shrink-0 w-64 block ${
                index === 0 ? 'ring-2 ring-orange-200 bg-orange-50' : 'hover:shadow-md'
              } rounded-lg border border-gray-200 p-3`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {meal.recipe?.imageUrl ? (
                    <img
                      src={meal.recipe.imageUrl}
                      alt={meal.recipe.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ChefHat className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-500">
                      {meal.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} • {meal.mealTypeLabel}
                    </p>
                    {index === 0 && (
                      <span className="text-xs text-orange-600 font-medium">
                        À venir
                      </span>
                    )}
                  </div>

                  <h4 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
                    {meal.recipe?.title || 'Recette supprimée'}
                  </h4>

                  {/* Recipe Types - Only first one on mobile */}
                  {meal.recipe?.types && meal.recipe.types.length > 0 && (
                    <div className="flex gap-1 mb-1">
                      <RecipeTypeBadge
                        type={meal.recipe.types[0].type as keyof typeof RECIPE_TYPES}
                        size="sm"
                      />
                      {meal.recipe.types.length > 1 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                          +{meal.recipe.types.length - 1}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-1 text-xs">
                    {meal.recipe?.prepTime && (
                      <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-xs">
                        {meal.recipe.prepTime}min
                      </span>
                    )}
                    <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded flex items-center text-xs">
                      <Users className="h-2 w-2 mr-0.5" />
                      {meal.mealUserAssignments?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {nextMeals.map((meal, index) => (
          <Link
            key={meal.id}
            href={`/recettes/${meal.recipe?.id}${meal.mealUserAssignments?.length ? `?servings=${meal.mealUserAssignments.length}` : ''}`}
            className={`relative group cursor-pointer transition-all duration-200 block ${
              index === 0 ? 'ring-2 ring-orange-200 bg-orange-50' : 'hover:shadow-md'
            } rounded-lg border border-gray-200 p-3`}
          >
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {meal.recipe?.imageUrl ? (
                  <img
                    src={meal.recipe.imageUrl}
                    alt={meal.recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ChefHat className="h-6 w-6 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-gray-500">
                    {meal.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })} • {meal.mealTypeLabel}
                  </p>
                  {index === 0 && (
                    <span className="text-xs text-orange-600 font-medium">
                      À venir
                    </span>
                  )}
                </div>

                <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-2">
                  {meal.recipe?.title || 'Recette supprimée'}
                </h4>

                {/* Recipe Types */}
                {meal.recipe?.types && meal.recipe.types.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {meal.recipe.types.slice(0, 2).map((recipeType: any) => (
                      <RecipeTypeBadge
                        key={recipeType.id}
                        type={recipeType.type as keyof typeof RECIPE_TYPES}
                        size="sm"
                      />
                    ))}
                    {meal.recipe.types.length > 2 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                        +{meal.recipe.types.length - 2}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-1 text-xs">
                  {meal.recipe?.prepTime && (
                    <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                      {meal.recipe.prepTime}min
                    </span>
                  )}
                  <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center">
                    <Users className="h-2.5 w-2.5 mr-0.5" />
                    {meal.mealUserAssignments?.length || 0}
                  </span>
                  {meal.cookResponsible && (
                    <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded flex items-center">
                      👨‍🍳 {meal.cookResponsible.pseudo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-3 w-3 text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}