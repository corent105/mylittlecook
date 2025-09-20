'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from "@/lib/constants/recipe-types";

interface RecipesSummaryProps {
  uniqueRecipes: any[];
  sortedGroupedRecipes: Record<string, Array<any>>;
}

export default function RecipesSummary({
  uniqueRecipes,
  sortedGroupedRecipes
}: RecipesSummaryProps) {
  const [showRecipes, setShowRecipes] = useState(false);

  if (uniqueRecipes.length === 0) return null;

  return (
    <Card className="mb-6 sm:mb-8">
      <div className="p-4 sm:p-6">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-0 h-auto text-left"
          onClick={() => setShowRecipes(!showRecipes)}
        >
          <div className="flex items-center space-x-2">
            <ChefHat className="h-5 w-5 text-orange-600" />
            <span className="font-semibold text-gray-900 text-sm sm:text-base">
              {uniqueRecipes.length} recette{uniqueRecipes.length > 1 ? 's' : ''} cette semaine
            </span>
          </div>
          {showRecipes ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </Button>

        {showRecipes && (
          <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {Object.entries(sortedGroupedRecipes).map(([timeSlot, recipes]) => (
              <div key={timeSlot} className="border-l-2 border-orange-200 pl-3 sm:pl-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{timeSlot}</h4>
                <div className="space-y-2">
                  {recipes.map((recipe) => (
                    <Link key={`${timeSlot}-${recipe.id}`} href={`/recettes/${recipe.id}`}>
                      <div className="p-2 hover:bg-orange-50 rounded transition-colors cursor-pointer">
                        <div className="text-sm text-gray-900 hover:text-orange-600 font-medium mb-1">
                          • {recipe.title}
                        </div>
                        {recipe.types && recipe.types.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {recipe.types.slice(0, 2).map((recipeType: any) => (
                              <RecipeTypeBadge
                                key={recipeType.id}
                                type={recipeType.type as keyof typeof RECIPE_TYPES}
                                size="sm"
                              />
                            ))}
                            {recipe.types.length > 2 && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                +{recipe.types.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}