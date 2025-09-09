'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Plus, Calendar, ChevronLeft, ChevronRight, Search, Download, X, Eye, Trash2 } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import Link from "next/link";

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];

interface MealSlot {
  day: number;
  mealType: MealType;
  recipe?: {
    id: string;
    title: string;
    imageUrl?: string;
  };
}

// Temporary project ID - in real app this would come from auth/route params
const TEMP_PROJECT_ID = 'temp-project-1';

export default function PlanningPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{day: number, mealType: MealType} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewRecipe, setPreviewRecipe] = useState<{id: string, title: string, description?: string} | null>(null);
  
  const weekStart = getWeekStart(currentWeek);
  
  // Get tRPC context for cache invalidation
  const utils = api.useContext();
  
  // tRPC queries
  const { data: mealPlan = [], isLoading: mealPlanLoading } = api.mealPlan.getWeekPlan.useQuery({
    projectId: TEMP_PROJECT_ID,
    weekStart,
  });
  
  const { data: recipes = [], isLoading: recipesLoading } = api.recipe.search.useQuery({
    query: searchQuery,
  }, {
    enabled: !!selectedSlot && searchQuery.length > 0,
  });
  
  const { data: allRecipes } = api.recipe.getAll.useQuery({
    limit: 20,
  }, {
    enabled: !!selectedSlot
  });
  
  // Mutations
  const addMealMutation = api.mealPlan.addMealToSlot.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.mealPlan.getWeekPlan.invalidate({
        projectId: TEMP_PROJECT_ID,
        weekStart,
      });
    },
  });
  
  const removeMealMutation = api.mealPlan.removeMealFromSlot.useMutation({
    onSuccess: () => {
      utils.mealPlan.getWeekPlan.invalidate({
        projectId: TEMP_PROJECT_ID,
        weekStart,
      });
    },
  });

  function getWeekStart(date: Date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(start.setDate(diff));
  }


  const formatWeekRange = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return `${weekStart.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long' 
    })} - ${weekEnd.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    })}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const getMealForSlot = (day: number, mealType: MealType) => {
    // Convert MealType to match database enum
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',  
      'Dîner': 'DINNER'
    };
    
    return mealPlan.find(m => 
      m.dayOfWeek === day && 
      m.mealType === mealTypeMap[mealType]
    );
  };

  const handleSlotClick = (day: number, mealType: MealType) => {
    console.log('Slot clicked:', day, mealType);
    setSelectedSlot({ day, mealType });
  };

  const displayedRecipes = searchQuery.length > 0 ? recipes : (allRecipes?.recipes || []);

  const addRecipeToSlot = async (recipe: { id: string; title: string }) => {
    if (!selectedSlot) {
      console.log('No slot selected');
      return;
    }
    
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',  
      'Dîner': 'DINNER'
    };
    
    const mutationData = {
      projectId: TEMP_PROJECT_ID,
      weekStart,
      dayOfWeek: selectedSlot.day,
      mealType: mealTypeMap[selectedSlot.mealType] as any,
      recipeId: recipe.id,
    };
    
    console.log('Adding recipe to slot:', {
      recipe: recipe.title,
      slot: selectedSlot,
      mutationData,
      weekStartType: typeof weekStart,
      weekStartValue: weekStart
    });
    
    try {
      const result = await addMealMutation.mutateAsync(mutationData);
      
      console.log('Recipe added successfully:', result);
      setSelectedSlot(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding meal:', error);
      console.error('Mutation data that failed:', mutationData);
      alert('Erreur lors de l\'ajout de la recette au planning');
    }
  };

  const removeMealFromSlot = async (day: number, mealType: MealType, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',  
      'Dîner': 'DINNER'
    };
    
    try {
      await removeMealMutation.mutateAsync({
        projectId: TEMP_PROJECT_ID,
        weekStart,
        dayOfWeek: day,
        mealType: mealTypeMap[mealType] as any,
      });
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <h2 className="text-xl font-semibold">
                {formatWeekRange(getWeekStart(currentWeek))}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/liste-de-courses">
            <Button className="bg-orange-600 hover:bg-orange-700">
              Générer liste de courses
            </Button>
          </Link>
        </div>

        {/* Planning Grid */}
        <div className="grid grid-cols-8 gap-4 mb-8">
          {/* Header Row */}
          <div className="font-medium text-gray-700"></div>
          {DAYS.map((day, index) => (
            <div key={day} className="text-center font-medium text-gray-700 py-2">
              {day}
            </div>
          ))}

          {/* Meal Rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="contents">
              <div className="flex items-center font-medium text-gray-700 py-4">
                {mealType}
              </div>
              {DAYS.map((_, dayIndex) => {
                const meal = getMealForSlot(dayIndex, mealType);
                return (
                  <Card 
                    key={`${dayIndex}-${mealType}`}
                    className={`min-h-24 p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
                      meal?.recipe 
                        ? 'border-solid border-orange-200 bg-orange-50/50' 
                        : 'border-dashed border-gray-300 hover:border-orange-300'
                    }`}
                    onClick={() => !meal?.recipe && handleSlotClick(dayIndex, mealType)}
                  >
                    {meal?.recipe ? (
                      <div className="relative group h-full">
                        <div className="text-sm h-full flex flex-col justify-between">
                          <div>
                            <div className="font-medium text-gray-900 mb-1 line-clamp-2">
                              {meal.recipe.title}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              {meal.recipe.prepTime && (
                                <span className="bg-orange-100 px-2 py-1 rounded">
                                  {meal.recipe.prepTime} min
                                </span>
                              )}
                              {meal.recipe.servings && (
                                <span className="bg-blue-100 px-2 py-1 rounded">
                                  {meal.recipe.servings} pers.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          <Link href={`/src/app/(authenticated)/recettes/${meal.recipe.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0 bg-white/90 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            onClick={(e) => removeMealFromSlot(dayIndex, mealType, e)}
                            disabled={removeMealMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 hover:text-orange-500 transition-colors">
                        <div className="text-center">
                          <Plus className="h-6 w-6 mx-auto mb-1" />
                          <div className="text-xs">Ajouter</div>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ))}
        </div>

        {/* Recipe Search Modal */}
        {selectedSlot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl m-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Ajouter une recette - {DAYS[selectedSlot.day]} {selectedSlot.mealType}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                >
                  ✕
                </Button>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une recette..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {(recipesLoading || (selectedSlot && !allRecipes && searchQuery.length === 0)) ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-pulse">Chargement des recettes...</div>
                  </div>
                ) : displayedRecipes.length > 0 ? (
                  displayedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                          {recipe.imageUrl ? (
                            <img 
                              src={recipe.imageUrl} 
                              alt={recipe.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ChefHat className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{recipe.title}</div>
                          {recipe.description && (
                            <div className="text-sm text-gray-500 truncate">
                              {recipe.description}
                            </div>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                            {recipe.prepTime && <span className="bg-orange-100 px-2 py-1 rounded">{recipe.prepTime}min</span>}
                            {recipe.servings && <span className="bg-blue-100 px-2 py-1 rounded">{recipe.servings} pers.</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/src/app/(authenticated)/recettes/${recipe.id}`} target="_blank">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Voir
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          disabled={addMealMutation.isPending}
                          className="bg-orange-600 hover:bg-orange-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            addRecipeToSlot(recipe);
                          }}
                        >
                          {addMealMutation.isPending ? 'Ajout...' : 'Ajouter'}
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <Link href="/src/app/(authenticated)/recettes/nouvelle">
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une nouvelle recette
                  </Button>
                </Link>
                <Link href="/src/app/(authenticated)/recettes/importer">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Importer depuis un lien
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}