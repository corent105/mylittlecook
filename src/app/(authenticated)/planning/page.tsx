'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChefHat,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  X,
  Users,
  Edit,
  Trash2, Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/trpc/react";
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
  const [cookResponsibleId, setCookResponsibleId] = useState<string>('');
  const [editingMealPlan, setEditingMealPlan] = useState<any | null>(null);
  const [editSelectedRecipe, setEditSelectedRecipe] = useState<any | null>(null);
  
  const weekStart = getWeekStart(currentWeek);
  
  // Get tRPC context for cache invalidation
  const utils = api.useContext();
  
  // Get meal users for current user
  const { data: mealUsers = [] } = api.mealUser.getMyHouseholdProfiles.useQuery(undefined, {
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
      utils.mealUser.getMyHouseholdProfiles.invalidate();
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

  const getNextMeals = () => {
    const now = new Date();
    const currentDateTime = now.getTime();

    // Define meal time boundaries
    const mealTimes = {
      'BREAKFAST': { hour: 9, label: 'Petit-déjeuner' },
      'LUNCH': { hour: 14, label: 'Déjeuner' },
      'DINNER': { hour: 20, label: 'Dîner' }
    };

    const mealOrder = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const nextMeals: any[] = [];

    // Create a function to get meals for multiple weeks
    const getAllPotentialMeals = async () => {
      const potentialMeals: any[] = [];

      // Check current week and next 2 weeks
      for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
        const checkWeekStart = new Date(weekStart);
        checkWeekStart.setDate(weekStart.getDate() + (weekOffset * 7));

        // For current week, use existing mealPlan data
        // For future weeks, we'll need to add logic to fetch them
        const weekMeals = weekOffset === 0 ? mealPlan : [];

        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          for (const mealType of mealOrder) {
            const dayDate = new Date(checkWeekStart);
            dayDate.setDate(checkWeekStart.getDate() + dayOfWeek);

            // Set meal time for comparison
            const mealDateTime = new Date(dayDate);
            mealDateTime.setHours(mealTimes[mealType as keyof typeof mealTimes].hour, 0, 0, 0);

            // Only include future meals
            if (mealDateTime.getTime() > currentDateTime) {
              const mealsForSlot = weekMeals.filter(m =>
                m.dayOfWeek === dayOfWeek && m.mealType === mealType
              );

              mealsForSlot.forEach(meal => {
                potentialMeals.push({
                  ...meal,
                  dayName: DAYS[dayOfWeek],
                  mealTypeLabel: mealTimes[mealType as keyof typeof mealTimes].label,
                  date: dayDate,
                  mealDateTime: mealDateTime.getTime(),
                  isNext: potentialMeals.length === 0
                });
              });
            }
          }
        }
      }

      return potentialMeals;
    };

    // Get all potential meals and sort by datetime
    const allMeals: any[] = [];

    // Process current week meals
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (const mealType of mealOrder) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayOfWeek);

        // Set meal time for comparison
        const mealDateTime = new Date(dayDate);
        mealDateTime.setHours(mealTimes[mealType as keyof typeof mealTimes].hour, 0, 0, 0);

        // Only include future meals
        if (mealDateTime.getTime() > currentDateTime) {
          const mealsForSlot = mealPlan.filter(m =>
            m.dayOfWeek === dayOfWeek && m.mealType === mealType
          );

          mealsForSlot.forEach(meal => {
            allMeals.push({
              ...meal,
              dayName: DAYS[dayOfWeek],
              mealTypeLabel: mealTimes[mealType as keyof typeof mealTimes].label,
              date: dayDate,
              mealDateTime: mealDateTime.getTime()
            });
          });
        }
      }
    }

    // Sort by datetime and take first 6
    const sortedMeals = allMeals
      .sort((a, b) => a.mealDateTime - b.mealDateTime)
      .slice(0, 6)
      .map((meal, index) => ({
        ...meal,
        isNext: index === 0
      }));

    return sortedMeals;
  };

  const nextMeals = getNextMeals();

  // Also get meals from next week if needed
  const { data: nextWeekMealPlan = [] } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: selectedMealUsers,
    weekStart: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
  }, {
    enabled: session?.user?.id !== undefined && selectedMealUsers.length > 0
  });

  // Combined function to get next meals from current and next week
  const getCombinedNextMeals = () => {
    const now = new Date();
    const currentDateTime = now.getTime();

    const mealTimes = {
      'BREAKFAST': { hour: 9, label: 'Petit-déjeuner' },
      'LUNCH': { hour: 14, label: 'Déjeuner' },
      'DINNER': { hour: 20, label: 'Dîner' }
    };

    const mealOrder = ['BREAKFAST', 'LUNCH', 'DINNER'];
    const allMeals: any[] = [];

    // Process current week
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (const mealType of mealOrder) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayOfWeek);

        const mealDateTime = new Date(dayDate);
        mealDateTime.setHours(mealTimes[mealType as keyof typeof mealTimes].hour, 0, 0, 0);

        if (mealDateTime.getTime() > currentDateTime) {
          const mealsForSlot = mealPlan.filter(m =>
            m.dayOfWeek === dayOfWeek && m.mealType === mealType
          );

          mealsForSlot.forEach(meal => {
            allMeals.push({
              ...meal,
              dayName: DAYS[dayOfWeek],
              mealTypeLabel: mealTimes[mealType as keyof typeof mealTimes].label,
              date: dayDate,
              mealDateTime: mealDateTime.getTime()
            });
          });
        }
      }
    }

    // Process next week
    const nextWeekStart = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (const mealType of mealOrder) {
        const dayDate = new Date(nextWeekStart);
        dayDate.setDate(nextWeekStart.getDate() + dayOfWeek);

        const mealDateTime = new Date(dayDate);
        mealDateTime.setHours(mealTimes[mealType as keyof typeof mealTimes].hour, 0, 0, 0);

        if (mealDateTime.getTime() > currentDateTime) {
          const mealsForSlot = nextWeekMealPlan.filter(m =>
            m.dayOfWeek === dayOfWeek && m.mealType === mealType
          );

          mealsForSlot.forEach(meal => {
            allMeals.push({
              ...meal,
              dayName: DAYS[dayOfWeek],
              mealTypeLabel: mealTimes[mealType as keyof typeof mealTimes].label,
              date: dayDate,
              mealDateTime: mealDateTime.getTime()
            });
          });
        }
      }
    }

    return allMeals
      .sort((a, b) => a.mealDateTime - b.mealDateTime)
      .slice(0, 6)
      .map((meal, index) => ({
        ...meal,
        isNext: index === 0
      }));
  };

  const combinedNextMeals = getCombinedNextMeals();


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
    // Reset cook responsible
    setCookResponsibleId('');
  };

  const handleMealCardClick = (meal: any, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log('Meal card clicked:', meal);
    setEditingMealPlan(meal);
    setEditSelectedRecipe(meal.recipe);
    // Initialize with current meal users and cook responsible
    setPopupSelectedMealUsers(meal.mealUserAssignments?.map((assignment: any) => assignment.mealUserId) || []);
    setCookResponsibleId(meal.cookResponsible?.id || '');
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
      cookResponsibleId: cookResponsibleId || undefined,
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
      setCookResponsibleId('');
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
      // Close edit dialog if we're editing this meal plan
      if (editingMealPlan?.id === mealPlanId) {
        setEditingMealPlan(null);
        setEditSelectedRecipe(null);
        setPopupSelectedMealUsers([]);
        setCookResponsibleId('');
      }
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  const updateMealPlan = async () => {
    if (!editingMealPlan || !editSelectedRecipe || popupSelectedMealUsers.length === 0) {
      console.log('Cannot update meal plan: missing data');
      return;
    }

    try {
      // Remove old meal plan
      await removeMealMutation.mutateAsync({
        mealPlanId: editingMealPlan.id,
      });

      // Add updated meal plan
      await addMealMutation.mutateAsync({
        mealUserIds: popupSelectedMealUsers,
        weekStart,
        dayOfWeek: editingMealPlan.dayOfWeek,
        mealType: editingMealPlan.mealType as any,
        recipeId: editSelectedRecipe.id,
        cookResponsibleId: cookResponsibleId || undefined,
      });

      // Close edit dialog
      setEditingMealPlan(null);
      setEditSelectedRecipe(null);
      setPopupSelectedMealUsers([]);
      setCookResponsibleId('');
      setSearchQuery('');
    } catch (error) {
      console.error('Error updating meal plan:', error);
      alert('Erreur lors de la mise à jour du meal plan');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Meal Users Selection */}
        {mealUsers.length === 0 ? (
          <Card className="mb-6 sm:mb-8 p-4 sm:p-6">
            <div className="text-center">
              <Users className="h-10 sm:h-12 w-10 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Créez votre premier profil</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
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
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un profil
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="mb-6 sm:mb-8 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Profils actifs</h3>
                <div className="flex flex-wrap gap-2">
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
                      className={`text-xs sm:text-sm ${selectedMealUsers.includes(mealUser.id) ? "bg-orange-600 hover:bg-orange-700" : ""}`}
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
                className="self-start sm:self-auto"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Ajouter
              </Button>
            </div>
          </Card>
        )}

        {/* Next Meals Section */}
        {combinedNextMeals.length > 0 && (
          <Card className="mb-6 sm:mb-8 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-orange-500" />
                Prochains repas
              </h3>
              {combinedNextMeals[0]?.isNext && (
                <span className="text-xs sm:text-sm text-orange-600 font-medium bg-orange-100 px-2 py-1 rounded-full">
                  Prochain repas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {combinedNextMeals.map((meal, index) => (
                <div
                  key={meal.id}
                  className={`relative group cursor-pointer transition-all duration-200 ${
                    index === 0 ? 'ring-2 ring-orange-200 bg-orange-50' : 'hover:shadow-md'
                  } rounded-lg border border-gray-200 p-3`}
                  onClick={(e) => handleMealCardClick(meal, e)}
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

                      <div className="flex items-center space-x-1 text-xs">
                        {meal.recipe?.prepTime && (
                          <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            {meal.recipe.prepTime}min
                          </span>
                        )}
                        {meal.recipe?.servings && (
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {meal.recipe.servings}p.
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
                    <Edit className="h-3 w-3 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Week Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <h2 className="text-sm sm:text-lg md:text-xl font-semibold text-center px-2">
                {formatWeekRange(getWeekStart(currentWeek))}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <Link href="/liste-de-courses" className="sm:block">
            <Button className="bg-orange-600 hover:bg-orange-700 text-xs sm:text-sm px-3 py-2">
              <span className="hidden sm:inline">Générer liste de courses</span>
              <span className="sm:hidden">Liste de courses</span>
            </Button>
          </Link>
        </div>


        {/* Planning Grid */}
        <div className="md:grid md:grid-cols-8 md:gap-4 mb-8">
          {/* Desktop Grid */}
          <div className="hidden md:contents">
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
                            <div
                              key={meal.id}
                              className="relative group cursor-pointer hover:bg-orange-25 rounded transition-colors"
                              onClick={(e) => handleMealCardClick(meal, e)}
                            >
                              <div className="text-sm bg-white rounded border border-orange-100 p-2 shadow-sm hover:shadow-md transition-shadow">
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
                                  <span className="bg-green-100 px-1 py-0.5 rounded text-xs flex items-center">
                                    <Users className="h-2.5 w-2.5 mr-0.5" />
                                    {meal.mealUserAssignments?.length || 0}
                                  </span>
                                  {meal.cookResponsible && (
                                    <span className="bg-yellow-100 px-1 py-0.5 rounded text-xs flex items-center">
                                      👨‍🍳 {meal.cookResponsible.pseudo}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit className="h-3 w-3 text-gray-400" />
                              </div>
                            </div>
                          ))}
                          
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

          {/* Mobile Scroll Layout */}
          <div className="md:hidden">
            <div className="overflow-x-auto">
              <div className="flex gap-4 px-4 pb-4" style={{ width: 'max-content' }}>
                {DAYS.map((day, dayIndex) => (
                  <div key={dayIndex} className="flex-shrink-0">
                    <div className="text-center text-sm font-medium text-gray-700 mb-3 w-48">
                      {day}
                    </div>
                    <div className="space-y-3 w-48">
                      {MEAL_TYPES.map((mealType) => {
                        const meals = getMealsForSlot(dayIndex, mealType);
                        return (
                          <div key={`${dayIndex}-${mealType}`}>
                            <div className="text-xs font-medium text-gray-600 mb-1 px-1">
                              {mealType}
                            </div>
                            <Card 
                              className={`min-h-28 p-2.5 cursor-pointer hover:shadow-md transition-all duration-200 ${
                                meals.length > 0 
                                  ? 'border-solid border-orange-200 bg-orange-50/50' 
                                  : 'border-dashed border-gray-300 hover:border-orange-300'
                              }`}
                              onClick={() => handleSlotClick(dayIndex, mealType)}
                            >
                              {meals.length > 0 ? (
                                <div className="space-y-1.5 h-full">
                                  {meals.map((meal, mealIndex) => (
                                    <div
                                      key={meal.id}
                                      className="relative group cursor-pointer hover:bg-orange-25 rounded transition-colors"
                                      onClick={(e) => handleMealCardClick(meal, e)}
                                    >
                                      <div className="text-sm bg-white rounded border border-orange-100 p-1.5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="font-medium text-gray-900 mb-1 text-xs line-clamp-2">
                                          {meal.recipe?.title || 'Recette supprimée'}
                                        </div>
                                        <div className="flex flex-wrap gap-1 text-xs text-gray-500">
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
                                          <span className="bg-green-100 px-1 py-0.5 rounded text-xs flex items-center">
                                            <Users className="h-2 w-2 mr-0.5" />
                                            {meal.mealUserAssignments?.length || 0}
                                          </span>
                                          {meal.cookResponsible && (
                                            <span className="bg-yellow-100 px-1 py-0.5 rounded text-xs flex items-center">
                                              👨‍🍳 {meal.cookResponsible.pseudo}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit className="h-2.5 w-2.5 text-gray-400" />
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="flex items-center justify-center py-1 text-gray-400 hover:text-orange-500 transition-colors border-t border-dashed border-orange-200">
                                    <div className="text-center">
                                      <Plus className="h-3 w-3 mx-auto mb-0.5" />
                                      <div className="text-xs">Ajouter</div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 hover:text-orange-500 transition-colors">
                                  <div className="text-center">
                                    <Plus className="h-4 w-4 mx-auto mb-1" />
                                    <div className="text-xs">Ajouter</div>
                                  </div>
                                </div>
                              )}
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Search Dialog */}
        <Dialog open={!!selectedSlot} onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null);
            setSearchQuery('');
            setPopupSelectedMealUsers([]);
            setCookResponsibleId('');
          }
        }}>
          <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Ajouter une recette - {selectedSlot ? `${DAYS[selectedSlot.day]} ${selectedSlot.mealType}` : ''}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 overflow-y-auto">
              {/* Meal Users Selection */}
              <div className="p-3 bg-gray-50 rounded-lg">
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

              {/* Cook Responsible Selection */}
              {popupSelectedMealUsers.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Qui cuisine ? (optionnel)</h4>
                  <div className="flex flex-wrap gap-2">
                    {mealUsers
                      .filter(mealUser => popupSelectedMealUsers.includes(mealUser.id))
                      .map(mealUser => (
                        <Button
                          key={mealUser.id}
                          size="sm"
                          variant={cookResponsibleId === mealUser.id ? "default" : "outline"}
                          onClick={() => {
                            setCookResponsibleId(cookResponsibleId === mealUser.id ? '' : mealUser.id);
                          }}
                          className={cookResponsibleId === mealUser.id ? "bg-orange-600 hover:bg-orange-700" : ""}
                        >
                          👨‍🍳 {mealUser.pseudo}
                        </Button>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    La personne responsable de cuisiner ce repas
                  </p>
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher une recette..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border rounded-md">
                {(recipesLoading || (selectedSlot && !allRecipes && searchQuery.length === 0)) ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-pulse">Chargement des recettes...</div>
                  </div>
                ) : displayedRecipes.length > 0 ? (
                  displayedRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
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

              <div className="pt-4 border-t space-y-2">
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
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Meal Plan Dialog */}
        <Dialog open={!!editingMealPlan} onOpenChange={(open) => {
          if (!open) {
            setEditingMealPlan(null);
            setEditSelectedRecipe(null);
            setPopupSelectedMealUsers([]);
            setCookResponsibleId('');
            setSearchQuery('');
          }
        }}>
          <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Modifier le repas
                {editingMealPlan && (
                  <span className="text-sm text-gray-500 font-normal">
                    - {DAYS[editingMealPlan.dayOfWeek]} {editingMealPlan.mealType === 'BREAKFAST' ? 'Petit-déjeuner' : editingMealPlan.mealType === 'LUNCH' ? 'Déjeuner' : 'Dîner'}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 overflow-y-auto">
              {/* Current Recipe */}
              {editSelectedRecipe && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm mb-2 text-blue-800">Recette actuelle</h4>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                      {editSelectedRecipe.imageUrl ? (
                        <img
                          src={editSelectedRecipe.imageUrl}
                          alt={editSelectedRecipe.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ChefHat className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-blue-900">{editSelectedRecipe.title}</div>
                      <div className="flex items-center space-x-2 text-xs text-blue-600 mt-1">
                        {editSelectedRecipe.prepTime && <span className="bg-blue-100 px-2 py-1 rounded">{editSelectedRecipe.prepTime}min</span>}
                        {editSelectedRecipe.servings && <span className="bg-blue-100 px-2 py-1 rounded">{editSelectedRecipe.servings} pers.</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/recettes/${editSelectedRecipe.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Meal Users Selection */}
              <div className="p-3 bg-gray-50 rounded-lg">
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

              {/* Cook Responsible Selection */}
              {popupSelectedMealUsers.length > 0 && (
                <div className="p-3 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Qui cuisine ? (optionnel)</h4>
                  <div className="flex flex-wrap gap-2">
                    {mealUsers
                      .filter(mealUser => popupSelectedMealUsers.includes(mealUser.id))
                      .map(mealUser => (
                        <Button
                          key={mealUser.id}
                          size="sm"
                          variant={cookResponsibleId === mealUser.id ? "default" : "outline"}
                          onClick={() => {
                            setCookResponsibleId(cookResponsibleId === mealUser.id ? '' : mealUser.id);
                          }}
                          className={cookResponsibleId === mealUser.id ? "bg-orange-600 hover:bg-orange-700" : ""}
                        >
                          👨‍🍳 {mealUser.pseudo}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Change Recipe Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-sm mb-2">Changer de recette</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher une autre recette..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border rounded-md">
                  {(recipesLoading || (!allRecipes && searchQuery.length === 0)) ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-pulse">Chargement des recettes...</div>
                    </div>
                  ) : displayedRecipes.length > 0 ? (
                    displayedRecipes
                      .filter(recipe => recipe.id !== editSelectedRecipe?.id)
                      .map((recipe) => (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                              {recipe.imageUrl ? (
                                <img
                                  src={recipe.imageUrl}
                                  alt={recipe.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ChefHat className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate text-sm">{recipe.title}</div>
                              <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                                {recipe.prepTime && <span className="bg-orange-100 px-1.5 py-0.5 rounded">{recipe.prepTime}min</span>}
                                {recipe.servings && <span className="bg-blue-100 px-1.5 py-0.5 rounded">{recipe.servings} pers.</span>}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditSelectedRecipe(recipe);
                            }}
                          >
                            Sélectionner
                          </Button>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {searchQuery ? 'Aucune recette trouvée' : 'Aucune recette disponible'}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t flex justify-between">
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer ce repas du planning ?')) {
                      if (editingMealPlan) {
                        removeMealFromSlot(editingMealPlan.id);
                      }
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingMealPlan(null);
                      setEditSelectedRecipe(null);
                      setPopupSelectedMealUsers([]);
                      setCookResponsibleId('');
                      setSearchQuery('');
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    disabled={!editSelectedRecipe || popupSelectedMealUsers.length === 0 || addMealMutation.isPending || removeMealMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={updateMealPlan}
                  >
                    {(addMealMutation.isPending || removeMealMutation.isPending) ? 'Modification...' : 'Modifier'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}