'use client';

import { Button } from "@/components/ui/button";
import { Filter, Users, Utensils, ChefHat, ChevronRight } from "lucide-react";
import { RECIPE_TYPE_OPTIONS } from "@/lib/constants/recipe-types";

interface PlanningFiltersProps {
  mealUsers: any[];
  filterMealUsers: string[];
  setFilterMealUsers: (users: string[]) => void;
  filterRecipeTypes: string[];
  setFilterRecipeTypes: (types: string[]) => void;
  filterCookResponsible: string;
  setFilterCookResponsible: (cook: string) => void;
  filtersExpanded: boolean;
  setFiltersExpanded: (expanded: boolean) => void;
}

export default function PlanningFilters({
  mealUsers,
  filterMealUsers,
  setFilterMealUsers,
  filterRecipeTypes,
  setFilterRecipeTypes,
  filterCookResponsible,
  setFilterCookResponsible,
  filtersExpanded,
  setFiltersExpanded
}: PlanningFiltersProps) {
  if (mealUsers.length === 0) return null;

  return (
    <div className="mb-4">
      {/* Compact Filter Bar */}
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Filtres</span>

          {/* Active Filters Indicators */}
          <div className="flex items-center space-x-1">
            {filterMealUsers.length < mealUsers.length && (
              <div className="flex items-center bg-orange-100 text-orange-800 rounded-full px-2 py-1 text-xs">
                <Users className="h-3 w-3 mr-1" />
                {filterMealUsers.length}
              </div>
            )}
            {filterRecipeTypes.length > 0 && (
              <div className="flex items-center bg-orange-100 text-orange-800 rounded-full px-2 py-1 text-xs">
                <Utensils className="h-3 w-3 mr-1" />
                {filterRecipeTypes.length}
              </div>
            )}
            {filterCookResponsible && (
              <div className="flex items-center bg-orange-100 text-orange-800 rounded-full px-2 py-1 text-xs">
                <ChefHat className="h-3 w-3 mr-1" />
                1
              </div>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${filtersExpanded ? 'rotate-90' : ''}`} />
        </Button>
      </div>

      {/* Expanded Filters */}
      {filtersExpanded && (
        <div className="mt-2 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Meal Users Filter */}
            <div>
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 text-gray-500 mr-2" />
                <label className="text-sm font-medium">Profils</label>
              </div>
              <div className="flex flex-wrap gap-1">
                {mealUsers.map(mealUser => (
                  <Button
                    key={mealUser.id}
                    size="sm"
                    variant={filterMealUsers.includes(mealUser.id) ? "default" : "outline"}
                    onClick={() => {
                      const userId = mealUser.id;
                      const isIncluded = filterMealUsers.includes(userId);
                      const newUsers = isIncluded
                        ? filterMealUsers.filter(id => id !== userId)
                        : [...filterMealUsers, userId];
                      setFilterMealUsers(newUsers);
                    }}
                    className={`text-xs h-7 ${filterMealUsers.includes(mealUser.id) ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                  >
                    {mealUser.pseudo}
                  </Button>
                ))}
              </div>
            </div>

            {/* Recipe Types Filter */}
            <div>
              <div className="flex items-center mb-2">
                <Utensils className="h-4 w-4 text-gray-500 mr-2" />
                <label className="text-sm font-medium">Type de recette</label>
              </div>
              <div className="flex flex-wrap gap-1">
                {RECIPE_TYPE_OPTIONS.map(recipeType => (
                  <Button
                    key={recipeType.value}
                    size="sm"
                    variant={filterRecipeTypes.includes(recipeType.value) ? "default" : "outline"}
                    onClick={() => {
                      const isIncluded = filterRecipeTypes.includes(recipeType.value);
                      const newTypes = isIncluded
                        ? filterRecipeTypes.filter(type => type !== recipeType.value)
                        : [...filterRecipeTypes, recipeType.value];
                      setFilterRecipeTypes(newTypes);
                    }}
                    className={`text-xs h-7 ${filterRecipeTypes.includes(recipeType.value) ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                  >
                    <span className="mr-1">{recipeType.emoji}</span>
                    {recipeType.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Cook Responsible Filter */}
            <div>
              <div className="flex items-center mb-2">
                <ChefHat className="h-4 w-4 text-gray-500 mr-2" />
                <label className="text-sm font-medium">Responsable cuisine</label>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={filterCookResponsible === '' ? "default" : "outline"}
                  onClick={() => setFilterCookResponsible('')}
                  className={`text-xs h-7 ${filterCookResponsible === '' ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                >
                  Tous
                </Button>
                {mealUsers.map(mealUser => (
                  <Button
                    key={mealUser.id}
                    size="sm"
                    variant={filterCookResponsible === mealUser.id ? "default" : "outline"}
                    onClick={() => {
                      setFilterCookResponsible(filterCookResponsible === mealUser.id ? '' : mealUser.id);
                    }}
                    className={`text-xs h-7 ${filterCookResponsible === mealUser.id ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                  >
                    👨‍🍳 {mealUser.pseudo}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Filters */}
          {(filterMealUsers.length !== mealUsers.length || filterRecipeTypes.length > 0 || filterCookResponsible !== '') && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMealUsers(mealUsers.map(mu => mu.id));
                  setFilterRecipeTypes([]);
                  setFilterCookResponsible('');
                }}
                className="text-gray-600 hover:text-gray-800 h-7 text-xs"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}