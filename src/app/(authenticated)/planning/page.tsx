'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Plus, Calendar, ChevronLeft, ChevronRight, Search, Download, X, Eye, Trash2, Users } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";
import { useSession } from "next-auth/react";
import Link from "next/link";

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];


export default function PlanningPage() {
  const { data: session } = useSession();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{day: number, mealType: MealType} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealUsers, setSelectedMealUsers] = useState<string[]>([]);
  const [popupSelectedMealUsers, setPopupSelectedMealUsers] = useState<string[]>([]);
  
  const weekStart = getWeekStart(currentWeek);
  
  // Get tRPC context for cache invalidation
  const utils = api.useContext();
  
  // Get meal users for current user
  const { data: mealUsers = [] } = api.mealUser.getByUserId.useQuery({
    userId: session?.user?.id || ''
  }, {
    enabled: !!session?.user?.id
  });

  // Auto-select user's meal users when they are loaded
  useEffect(() => {
    if (mealUsers.length > 0 && selectedMealUsers.length === 0) {
      const allIds = mealUsers.map(mu => mu.id);
      setSelectedMealUsers(allIds);
    }
  }, [mealUsers, selectedMealUsers.length]);
  
  // tRPC queries - enable query once we have meal users or session
  const { data: mealPlan = [], isLoading: mealPlanLoading } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: selectedMealUsers,
    weekStart,
  }, {
    enabled: session?.user?.id !== undefined && (selectedMealUsers.length > 0 || mealUsers.length > 0)
  });


  useEffect(() => {
    if (mealPlan.length > 0) {
      console.log('✅ Meal plan loaded:', mealPlan.length, 'items');
      mealPlan.forEach(mp => {
        console.log(`  - ${mp.recipe?.title || 'No recipe'} | Day: ${mp.dayOfWeek} | Type: ${mp.mealType}`);
      });
    } else if (selectedMealUsers.length > 0 && !mealPlanLoading) {
      console.log('❌ No meal plans found for:', {
        selectedMealUsers,
        weekStart: weekStart.toISOString()
      });
    }
  }, [mealPlan, selectedMealUsers, mealPlanLoading, weekStart]);
  
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
        mealUserIds: selectedMealUsers,
        weekStart,
      });
    },
  });
  
  const removeMealMutation = api.mealPlan.removeMealFromSlot.useMutation({
    onSuccess: () => {
      utils.mealPlan.getWeekPlan.invalidate({
        mealUserIds: selectedMealUsers,
        weekStart,
      });
    },
  });

  const createMealUserMutation = api.mealUser.create.useMutation({
    onSuccess: () => {
      utils.mealUser.getByUserId.invalidate({
        userId: session?.user?.id || ''
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


  const getMealsForSlot = (day: number, mealType: MealType) => {
    // Convert MealType to match database enum
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

  const handleSlotClick = (day: number, mealType: MealType) => {
    console.log('Slot clicked:', day, mealType);
    setSelectedSlot({ day, mealType });
    // Initialize popup meal users with current selection
    setPopupSelectedMealUsers(selectedMealUsers);
  };

  const displayedRecipes = searchQuery.length > 0 ? recipes : (allRecipes?.recipes || []);

  const addRecipeToSlot = async (recipe: { id: string; title: string }) => {
    if (!selectedSlot || popupSelectedMealUsers.length === 0) {
      console.log('No slot selected or no meal users selected');
      return;
    }
    
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',  
      'Dîner': 'DINNER'
    };
    
    const mutationData = {
      mealUserIds: popupSelectedMealUsers,
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
      setPopupSelectedMealUsers([]);
    } catch (error) {
      console.error('Error adding meal:', error);
      console.error('Mutation data that failed:', mutationData);
      alert('Erreur lors de l\'ajout de la recette au planning');
    }
  };

  const removeMealFromSlot = async (mealPlanId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      await removeMealMutation.mutateAsync({
        mealPlanId,
      });
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Meal Users Selection */}
        {mealUsers.length === 0 ? (
          <Card className="mb-8 p-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Créez votre premier profil</h3>
              <p className="text-gray-600 mb-4">
                Créez un profil (pseudo) pour commencer à planifier vos repas
              </p>
              <Button
                onClick={() => {
                  const pseudo = prompt('Entrez votre pseudo:');
                  if (pseudo) {
                    createMealUserMutation.mutate({
                      pseudo,
                      userId: session?.user?.id
                    });
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un profil
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="mb-8 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-2">Mes profils :</h3>
                <div className="flex gap-2">
                  {mealUsers.map(mealUser => (
                    <Button
                      key={mealUser.id}
                      size="sm"
                      variant={selectedMealUsers.includes(mealUser.id) ? "default" : "outline"}
                      onClick={() => {
                        setSelectedMealUsers(prev => 
                          prev.includes(mealUser.id)
                            ? prev.filter(id => id !== mealUser.id)
                            : [...prev, mealUser.id]
                        );
                      }}
                      className={selectedMealUsers.includes(mealUser.id) ? "bg-orange-600 hover:bg-orange-700" : ""}
                    >
                      {mealUser.pseudo}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const pseudo = prompt('Entrez votre pseudo:');
                  if (pseudo) {
                    createMealUserMutation.mutate({
                      pseudo,
                      userId: session?.user?.id
                    });
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </Card>
        )}

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
                const meals = getMealsForSlot(dayIndex, mealType);
                return (
                  <Card 
                    key={`${dayIndex}-${mealType}`}
                    className={`min-h-32 p-3 cursor-pointer hover:shadow-md transition-all duration-200 ${
                      meals.length > 0 
                        ? 'border-solid border-orange-200 bg-orange-50/50' 
                        : 'border-dashed border-gray-300 hover:border-orange-300'
                    }`}
                    onClick={() => handleSlotClick(dayIndex, mealType)}
                  >
                    {meals.length > 0 ? (
                      <div className="space-y-2 h-full">
                        {meals.map((meal, mealIndex) => (
                          <div key={meal.id} className="relative group">
                            <div className="text-sm bg-white rounded border border-orange-100 p-2 shadow-sm">
                              <div className="font-medium text-gray-900 mb-1 text-xs line-clamp-1">
                                {meal.recipe?.title || 'Recette supprimée'}
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                {meal.recipe?.prepTime && (
                                  <span className="bg-orange-100 px-1 py-0.5 rounded text-xs">
                                    {meal.recipe.prepTime}min
                                  </span>
                                )}
                                {meal.recipe?.servings && (
                                  <span className="bg-blue-100 px-1 py-0.5 rounded text-xs">
                                    {meal.recipe.servings}p.
                                  </span>
                                )}
                                {/* Display number of people assigned to this meal */}
                                <span className="bg-green-100 px-1 py-0.5 rounded text-xs flex items-center">
                                  <Users className="h-2.5 w-2.5 mr-0.5" />
                                  {meal.mealUserAssignments?.length || 0}
                                </span>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              {meal.recipe && (
                                <Link href={`/recettes/${meal.recipe.id}`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-5 w-5 p-0 bg-white/90 hover:bg-white"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Eye className="h-2.5 w-2.5" />
                                  </Button>
                                </Link>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 w-5 p-0 bg-white/90 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                onClick={(e) => removeMealFromSlot(meal.id, e)}
                                disabled={removeMealMutation.isPending}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Add button */}
                        <div className="flex items-center justify-center py-1 text-gray-400 hover:text-orange-500 transition-colors border-t border-dashed border-orange-200">
                          <div className="text-center">
                            <Plus className="h-4 w-4 mx-auto mb-0.5" />
                            <div className="text-xs">Ajouter</div>
                          </div>
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
            <Card className="w-full max-w-6xl m-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Ajouter une recette - {DAYS[selectedSlot.day]} {selectedSlot.mealType}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSlot(null);
                    setSearchQuery('');
                    setPopupSelectedMealUsers([]);
                  }}
                >
                  ✕
                </Button>
              </div>

              {/* Meal Users Selection */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Pour qui cette recette ?</h4>
                <div className="flex flex-wrap gap-2">
                  {mealUsers.map(mealUser => (
                    <Button
                      key={mealUser.id}
                      size="sm"
                      variant={popupSelectedMealUsers.includes(mealUser.id) ? "default" : "outline"}
                      onClick={() => {
                        setPopupSelectedMealUsers(prev => 
                          prev.includes(mealUser.id)
                            ? prev.filter(id => id !== mealUser.id)
                            : [...prev, mealUser.id]
                        );
                      }}
                      className={popupSelectedMealUsers.includes(mealUser.id) ? "bg-orange-600 hover:bg-orange-700" : ""}
                    >
                      {mealUser.pseudo}
                    </Button>
                  ))}
                </div>
                {popupSelectedMealUsers.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Veuillez sélectionner au moins une personne</p>
                )}
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
                          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                            {recipe.prepTime && <span className="bg-orange-100 px-2 py-1 rounded">{recipe.prepTime}min</span>}
                            {recipe.servings && <span className="bg-blue-100 px-2 py-1 rounded">{recipe.servings} pers.</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/recettes/${recipe.id}`} target="_blank">
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
                          disabled={addMealMutation.isPending || popupSelectedMealUsers.length === 0}
                          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
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
                <Link href="/recettes/nouvelle">
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une nouvelle recette
                  </Button>
                </Link>
                <Link href="/recettes/importer">
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