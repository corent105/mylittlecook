'use client';

import { Card } from "@/components/ui/card";
import { ChefHat, Plus, Users, Edit } from "lucide-react";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from '@/lib/constants/recipe-types';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];

interface PlanningGridProps {
  mealPlan: any[];
  weekStart: Date;
  onSlotClick: (day: number, mealType: MealType) => void;
  onMealCardClick: (meal: any, event: React.MouseEvent) => void;
}

export default function PlanningGrid({
  mealPlan,
  weekStart,
  onSlotClick,
  onMealCardClick
}: PlanningGridProps) {
  // Helper function to get the date for a specific day
  const getDateForDay = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };

  // Helper function to format date
  const formatDayDate = (dayIndex: number) => {
    const date = getDateForDay(dayIndex);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
  };

  // Helper function to check if date is today
  const isToday = (dayIndex: number) => {
    const date = getDateForDay(dayIndex);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to check if date is in the past
  const isPastDay = (dayIndex: number) => {
    const date = getDateForDay(dayIndex);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today;
  };

  const getMealsForSlot = (day: number, mealType: MealType) => {
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',
      'Dîner': 'DINNER'
    };

    return mealPlan.filter(m =>
      m.dayOfWeek === day &&
      m.mealType === mealTypeMap[mealType]
    );
  };

  const renderMealCard = (meal: any, isMobile = false) => (
    <div
      key={meal.id}
      className="relative group cursor-pointer hover:bg-orange-25 rounded transition-colors"
      onClick={(e) => onMealCardClick(meal, e)}
    >
      <div className={`text-sm bg-white rounded border border-orange-100 ${isMobile ? 'p-1.5' : 'p-2'} shadow-sm hover:shadow-md transition-shadow`}>
        <div className={`font-medium text-gray-900 mb-1 text-xs ${isMobile ? 'line-clamp-2' : 'line-clamp-1'}`}>
          {meal.recipe?.title || 'Recette supprimée'}
        </div>

        <div className="space-y-1">
          {/* Recipe Types */}
          {meal.recipe?.types && meal.recipe.types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meal.recipe.types.slice(0, isMobile ? 2 : 3).map((recipeType: any) => (
                <RecipeTypeBadge
                  key={recipeType.id}
                  type={recipeType.type as keyof typeof RECIPE_TYPES}
                  size="sm"
                />
              ))}
              {meal.recipe.types.length > (isMobile ? 2 : 3) && (
                <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                  +{meal.recipe.types.length - (isMobile ? 2 : 3)}
                </span>
              )}
            </div>
          )}

          {/* Recipe Info */}
          <div className={`flex items-center space-x-1 text-xs text-gray-500 ${isMobile ? 'flex-wrap gap-1' : ''}`}>
            {meal.recipe?.prepTime && (
              <span className="bg-orange-100 px-1 py-0.5 rounded text-xs">
                {meal.recipe.prepTime}min
              </span>
            )}
            <span className="bg-green-100 px-1 py-0.5 rounded text-xs flex items-center">
              <Users className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} mr-0.5`} />
              {meal.mealUserAssignments?.length || 0}
            </span>
            {meal.cookResponsible && (
              <span className="bg-yellow-100 px-1 py-0.5 rounded text-xs flex items-center">
                👨‍🍳 {meal.cookResponsible.pseudo}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={`absolute ${isMobile ? 'top-1 right-1' : 'top-1 right-1'} opacity-0 group-hover:opacity-100 transition-opacity`}>
        <Edit className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-gray-400`} />
      </div>
    </div>
  );

  const renderSlotContent = (meals: any[], dayIndex: number, mealType: MealType, isMobile = false) => {
    if (meals.length > 0) {
      return (
        <div className={`${isMobile ? 'space-y-1' : 'space-y-2'}`}>
          {meals.map((meal) => renderMealCard(meal, isMobile))}

          <div className={`flex items-center justify-center py-1 text-gray-400 hover:text-orange-500 transition-colors border-t border-dashed border-orange-200`}>
            <div className="text-center">
              <Plus className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mx-auto mb-0.5`} />
              <div className="text-xs">Ajouter</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-20 text-gray-400 hover:text-orange-500 transition-colors">
        <div className="text-center">
          <Plus className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} mx-auto mb-1`} />
          <div className="text-xs">Ajouter</div>
        </div>
      </div>
    );
  };

  return (
    <div className="md:grid md:grid-cols-8 md:gap-4 mb-8">
      {/* Desktop Grid */}
      <div className="hidden md:contents">
        {/* Header Row */}
        <div className="font-medium text-gray-700"></div>
        {DAYS.map((day, index) => (
          <div key={day} className={`text-center font-medium py-2 relative ${
            isToday(index)
              ? 'text-orange-600'
              : isPastDay(index)
                ? 'text-gray-400'
                : 'text-gray-700'
          }`}>
            {isToday(index) && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
            )}
            <div className="text-sm">{day}</div>
            <div className={`text-xs ${
              isToday(index)
                ? 'text-orange-500 font-semibold'
                : isPastDay(index)
                  ? 'text-gray-400'
                  : 'text-gray-500'
            }`}>
              {formatDayDate(index)}
              {isToday(index) && (
                <span className="block text-orange-600 font-medium">Aujourd'hui</span>
              )}
            </div>
          </div>
        ))}

        {/* Meal Rows */}
        {MEAL_TYPES.map((mealType) => (
          <div key={mealType} className="contents">
            <div className="flex items-center font-medium text-gray-700 py-4">
              {mealType}
            </div>
            {DAYS.map((_, dayIndex) => {
              const meals = getMealsForSlot(dayIndex, mealType);
              return (
                <Card
                  key={`${dayIndex}-${mealType}`}
                  className={`min-h-32 p-3 transition-all duration-200 ${
                    isPastDay(dayIndex)
                      ? 'opacity-50 cursor-not-allowed bg-gray-50'
                      : 'cursor-pointer hover:shadow-md'
                  } ${
                    meals.length > 0
                      ? 'border-solid border-orange-200 bg-orange-50/50'
                      : 'border-dashed border-gray-300 hover:border-orange-300'
                  } ${
                    isToday(dayIndex) && meals.length === 0
                      ? 'ring-2 ring-orange-200 bg-orange-25'
                      : ''
                  }`}
                  onClick={() => !isPastDay(dayIndex) && onSlotClick(dayIndex, mealType)}
                >
                  {renderSlotContent(meals, dayIndex, mealType, false)}
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile Grid Layout */}
      <div className="md:hidden">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 px-4 pb-4 pt-2" style={{ width: 'max-content' }}>
            {/* Header Row */}
            {DAYS.map((day, dayIndex) => (
              <div key={`header-${dayIndex}`} className={`text-center text-sm font-medium mb-3 w-48 relative ${
                isToday(dayIndex)
                  ? 'text-orange-600'
                  : isPastDay(dayIndex)
                    ? 'text-gray-400'
                    : 'text-gray-700'
              }`}>
                {isToday(dayIndex) && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  </div>
                )}
                <div>{day}</div>
                <div className={`text-xs ${
                  isToday(dayIndex)
                    ? 'text-orange-500 font-semibold'
                    : isPastDay(dayIndex)
                      ? 'text-gray-400'
                      : 'text-gray-500'
                }`}>
                  {formatDayDate(dayIndex)}
                  {isToday(dayIndex) && (
                    <span className="block text-orange-600 font-medium">Aujourd'hui</span>
                  )}
                </div>
              </div>
            ))}

            {/* Meal Type Rows */}
            {MEAL_TYPES.map((mealType) => (
              DAYS.map((_, dayIndex) => {
                const meals = getMealsForSlot(dayIndex, mealType);
                return (
                  <div key={`${dayIndex}-${mealType}`} className="w-48 py-2">
                    <div className="text-xs font-medium text-gray-600 mb-1 px-1 ">
                      {mealType}
                    </div>
                    <Card
                      className={`p-2.5 transition-all duration-200 h-full ${
                        isPastDay(dayIndex)
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : 'cursor-pointer hover:shadow-md'
                      } ${
                        meals.length > 0
                          ? 'border-solid border-orange-200 bg-orange-50/50'
                          : 'border-dashed border-gray-300 hover:border-orange-300'
                      } ${
                        isToday(dayIndex) && meals.length === 0
                          ? 'ring-2 ring-orange-200 bg-orange-25'
                          : ''
                      }`}
                      onClick={() => !isPastDay(dayIndex) && onSlotClick(dayIndex, mealType)}
                    >
                      {renderSlotContent(meals, dayIndex, mealType, true)}
                    </Card>
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}