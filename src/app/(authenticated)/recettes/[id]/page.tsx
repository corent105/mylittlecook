'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChefHat, ArrowLeft, Edit, Clock, Users, Star, Timer, Thermometer } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";
import {useParams, useSearchParams} from "next/navigation";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from "@/lib/constants/recipe-types";



export default function RecipePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const recipeId = params.id as string;

  // Get servings from URL parameters (from meal plan)
  const servingsFromParams = searchParams.get('servings');
  const targetServings = servingsFromParams ? parseInt(servingsFromParams, 10) : null;

  const { data: recipe, isLoading, error } = api.recipe.getById.useQuery({
    id: recipeId,
  });

  // Calculate adjusted quantities based on target servings
  const getAdjustedQuantity = (originalQuantity: number) => {
    if (!targetServings || !recipe?.servings || recipe.servings === 0) {
      return originalQuantity;
    }
    const ratio = targetServings / recipe.servings;
    const adjustedQuantity = originalQuantity * ratio;

    // Round to reasonable precision
    if (adjustedQuantity < 1) {
      return Math.round(adjustedQuantity * 100) / 100; // 2 decimal places for small quantities
    } else if (adjustedQuantity < 10) {
      return Math.round(adjustedQuantity * 10) / 10; // 1 decimal place
    } else {
      return Math.round(adjustedQuantity); // Round to nearest integer for large quantities
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <ChefHat className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Recette introuvable
            </h2>
            <p className="text-gray-600 mb-6">
              La recette que vous recherchez n'existe pas ou a été supprimée.
            </p>
            <Link href="/recettes">
              <Button>Retour aux recettes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/recettes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux recettes
            </Button>
          </Link>
          <Link href={`/recettes/${recipe.id}/modifier`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Recipe Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recipe Image */}
            <Card className="overflow-hidden">
              <div className="h-64 bg-gray-200 relative">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="h-20 w-20 text-gray-400" />
                  </div>
                )}
              </div>
            </Card>

            {/* Recipe Types */}
            {recipe.types && recipe.types.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Types de recette</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.types.map((recipeType) => (
                    <RecipeTypeBadge
                      key={recipeType.id}
                      type={recipeType.type as keyof typeof RECIPE_TYPES}
                      size="md"
                    />
                  ))}
                </div>
              </Card>
            )}

            {/* Recipe Meta */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Informations</h3>

              <div className="space-y-3">
                {recipe.prepTime && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="text-sm font-medium">Préparation</div>
                      <div className="text-sm text-gray-600">{recipe.prepTime} minutes</div>
                    </div>
                  </div>
                )}

                {recipe.cookTime && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-sm font-medium">Cuisson</div>
                      <div className="text-sm text-gray-600">{recipe.cookTime} minutes</div>
                    </div>
                  </div>
                )}

                {recipe.servings && (
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium">Portions</div>
                      <div className="text-sm text-gray-600">{recipe.servings} personnes</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Recipe Ingredients */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Ingrédients</h3>
                  {targetServings && targetServings !== recipe.servings && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      Ajusté pour {targetServings} pers. (recette originale: {recipe.servings} pers.)
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {recipe.ingredients.map((recipeIngredient) => {
                    const adjustedQuantity = getAdjustedQuantity(recipeIngredient.quantity);
                    const isAdjusted = targetServings && targetServings !== recipe.servings && recipeIngredient.quantity > 0;

                    return (
                      <div
                        key={recipeIngredient.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-baseline space-x-2">
                            <span className={`font-medium ${isAdjusted ? 'text-blue-600' : 'text-orange-600'}`}>
                              {adjustedQuantity > 0 && adjustedQuantity}
                            </span>
                            {recipeIngredient.ingredient.unit && (
                              <span className="text-sm text-gray-500">
                                {recipeIngredient.ingredient.unit}
                              </span>
                            )}
                            <span className="text-gray-900 font-medium">
                              {recipeIngredient.ingredient.name}
                            </span>
                            {isAdjusted && recipeIngredient.quantity > 0 && (
                              <span className="text-xs text-gray-400 ml-2">
                                (original: {recipeIngredient.quantity})
                              </span>
                            )}
                          </div>
                          {recipeIngredient.notes && (
                            <div className="text-sm text-gray-600 mt-1 italic">
                              {recipeIngredient.notes}
                            </div>
                          )}
                        </div>
                        {recipeIngredient.ingredient.category && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full ml-2">
                            {recipeIngredient.ingredient.category}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">
                    {recipe.ingredients.length} ingrédient{recipe.ingredients.length > 1 ? 's' : ''}
                    {targetServings && targetServings !== recipe.servings && (
                      <span className="block text-blue-600 mt-1">
                        Quantités ajustées pour {targetServings} personne{targetServings > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
              </Card>
            )}


            {/* Recipe Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
                    >
                      {tag.tag.name}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Recipe Author */}
            {recipe.author && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Auteur</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">
                      {recipe.author.name?.charAt(0) || recipe.author.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{recipe.author.name || 'Utilisateur'}</div>
                    <div className="text-sm text-gray-600">{recipe.author.email}</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Recipe Title, Description and Steps */}
          <div className="lg:col-span-1 space-y-6">
            {/* Recipe Title and Description */}
            <Card className="p-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {recipe.title}
                </h1>
                {recipe.description && (
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {recipe.description}
                  </p>
                )}
              </div>
            </Card>

            {/* Recipe Steps */}
            {recipe.steps && recipe.steps.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Étapes de préparation</h3>
                <div className="space-y-4">
                  {recipe.steps.map((step) => (
                    <div
                      key={step.id}
                      className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="flex items-center justify-center w-6 h-6 bg-orange-600 text-white text-sm font-bold rounded-full">
                            {step.stepNumber}
                          </span>
                          {step.title && (
                            <h4 className="font-semibold text-gray-900">{step.title}</h4>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          {step.duration && (
                            <div className="flex items-center space-x-1">
                              <Timer className="h-4 w-4" />
                              <span>{step.duration} min</span>
                            </div>
                          )}
                          {step.temperature && (
                            <div className="flex items-center space-x-1">
                              <Thermometer className="h-4 w-4" />
                              <span>{step.temperature}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-gray-700 leading-relaxed">
                        {step.instruction}
                      </div>

                      {step.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-gray-600 text-sm italic leading-relaxed">
                            {step.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 text-center">
                    {recipe.steps.length} étape{recipe.steps.length > 1 ? 's' : ''}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}