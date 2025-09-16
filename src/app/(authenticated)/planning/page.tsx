'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  ChefHat,
  Utensils
} from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NextMeals from "@/components/NextMeals";
import MealPlanModal from "@/components/planning/MealPlanModal";
import PlanningGrid from "@/components/planning/PlanningGrid";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import { RECIPE_TYPE_OPTIONS } from "@/lib/constants/recipe-types";

const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];


export default function PlanningPage() {
  const { data: session } = useSession();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{day: number, mealType: MealType} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealUsers, setSelectedMealUsers] = useState<string[]>([]);
  const [popupSelectedMealUsers, setPopupSelectedMealUsers] = useState<string[]>([]);
  const [cookResponsibleId, setCookResponsibleId] = useState<string>('');
  const [editingMealPlan, setEditingMealPlan] = useState<any | null>(null);
  const [editSelectedRecipe, setEditSelectedRecipe] = useState<any | null>(null);

  // Filters
  const [filterMealUsers, setFilterMealUsers] = useState<string[]>([]);
  const [filterRecipeTypes, setFilterRecipeTypes] = useState<string[]>([]);
  const [filterCookResponsible, setFilterCookResponsible] = useState<string>('');
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  
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
      setFilterMealUsers(allIds); // Initialize filters with all users
    }
  }, [mealUsers, selectedMealUsers.length]);

  // Get default settings for slot initialization
  const { data: defaultSettings = [] } = api.defaultSlotSettings.getUserSettings.useQuery(undefined, {
    enabled: !!session?.user?.id
  });

  // tRPC queries - get all meal plans for all users
  const { data: allMealPlans = [], isLoading: mealPlanLoading } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: mealUsers.map(mu => mu.id), // Get all meal plans
    weekStart,
  }, {
    enabled: session?.user?.id !== undefined && mealUsers.length > 0
  });

  // Filter meal plans based on current filters
  const mealPlan = allMealPlans.filter(meal => {
    // Filter by meal users (check if any of the meal's users are in the filter)
    if (filterMealUsers.length > 0) {
      const mealUserIds = meal.mealUserAssignments?.map((assignment: any) => assignment.mealUserId) || [];
      const hasFilteredUser = mealUserIds.some((userId: string) => filterMealUsers.includes(userId));
      if (!hasFilteredUser) return false;
    }

    // Filter by recipe types (check if any of the recipe's types match the filter)
    if (filterRecipeTypes.length > 0) {
      if (!meal.recipe?.types || meal.recipe.types.length === 0) return false;
      const recipeTypeValues = meal.recipe.types.map((type: any) => type.type);
      const hasFilteredType = recipeTypeValues.some((type: string) => filterRecipeTypes.includes(type));
      if (!hasFilteredType) return false;
    }

    // Filter by cook responsible
    if (filterCookResponsible && meal.cookResponsible?.id !== filterCookResponsible) {
      return false;
    }

    return true;
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
  
  
  // Mutations
  const addMealMutation = api.mealPlan.addMealToSlot.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.mealPlan.getWeekPlan.invalidate({
        mealUserIds: mealUsers.map(mu => mu.id),
        weekStart,
      });
    },
  });

  const removeMealMutation = api.mealPlan.removeMealFromSlot.useMutation({
    onSuccess: () => {
      utils.mealPlan.getWeekPlan.invalidate({
        mealUserIds: mealUsers.map(mu => mu.id),
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





  const handleSlotClick = (day: number, mealType: MealType) => {
    console.log('Slot clicked:', day, mealType);
    setSelectedSlot({ day, mealType });

    // Convert meal type to Prisma format
    const prismaMealType = mealType === 'Petit-déjeuner' ? 'BREAKFAST' :
                          mealType === 'Déjeuner' ? 'LUNCH' : 'DINNER';

    // Find default setting for this slot
    const defaultSetting = defaultSettings.find(setting =>
      setting.dayOfWeek === day && setting.mealType === prismaMealType
    );

    if (defaultSetting) {
      // Initialize with default meal users
      if (defaultSetting.defaultAssignments.length > 0) {
        const defaultUserIds = defaultSetting.defaultAssignments.map(assignment => assignment.mealUserId);
        setPopupSelectedMealUsers(defaultUserIds);
        console.log('Initialized with default meal users:', defaultUserIds);
      } else {
        // No default assignments, start with empty selection
        setPopupSelectedMealUsers([]);
        console.log('Default setting found but no assignments, starting with empty selection');
      }

      // Initialize with default cook responsible
      if (defaultSetting.defaultCookResponsibleId) {
        setCookResponsibleId(defaultSetting.defaultCookResponsibleId);
        console.log('Initialized with default cook responsible:', defaultSetting.defaultCookResponsibleId);
      } else {
        setCookResponsibleId('');
      }
    } else {
      // No default setting found, start with empty values
      setPopupSelectedMealUsers([]);
      setCookResponsibleId('');
      console.log('No default setting found, starting with empty values');
    }
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
      showAlert(
        'Erreur d\'ajout',
        'Impossible d\'ajouter la recette au planning. Veuillez réessayer.',
        'error'
      );
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
      showAlert(
        'Erreur de modification',
        'Impossible de mettre à jour le meal plan. Veuillez réessayer.',
        'error'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Next Meals Section - Independent of selected week */}
        <NextMeals
          onMealClick={(meal) => handleMealCardClick(meal, { stopPropagation: () => {} } as React.MouseEvent)}
          selectedMealUsers={mealUsers.map(mu => mu.id)}
        />

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

        {/* Compact Filters Section */}
        {mealUsers.length > 0 && (
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
        )}

        {/* Planning Grid */}
        <PlanningGrid
          mealPlan={mealPlan}
          weekStart={weekStart}
          onSlotClick={handleSlotClick}
          onMealCardClick={handleMealCardClick}
        />

        {/* Add Meal Modal */}
        <MealPlanModal
          mode="add"
          isOpen={!!selectedSlot}
          onClose={() => {
            setSelectedSlot(null);
            setSearchQuery('');
            setPopupSelectedMealUsers([]);
            setCookResponsibleId('');
          }}
          selectedSlot={selectedSlot}
          popupSelectedMealUsers={popupSelectedMealUsers}
          setPopupSelectedMealUsers={setPopupSelectedMealUsers}
          cookResponsibleId={cookResponsibleId}
          setCookResponsibleId={setCookResponsibleId}
          mealUsers={mealUsers}
          onAddRecipe={addRecipeToSlot}
          isLoading={addMealMutation.isPending}
        />

        {/* Edit Meal Plan Modal */}
        <MealPlanModal
          mode="edit"
          isOpen={!!editingMealPlan}
          onClose={() => {
            setEditingMealPlan(null);
            setEditSelectedRecipe(null);
            setPopupSelectedMealUsers([]);
            setCookResponsibleId('');
            setSearchQuery('');
          }}
          editingMealPlan={editingMealPlan}
          editSelectedRecipe={editSelectedRecipe}
          setEditSelectedRecipe={setEditSelectedRecipe}
          popupSelectedMealUsers={popupSelectedMealUsers}
          setPopupSelectedMealUsers={setPopupSelectedMealUsers}
          cookResponsibleId={cookResponsibleId}
          setCookResponsibleId={setCookResponsibleId}
          mealUsers={mealUsers}
          onUpdate={updateMealPlan}
          onDelete={removeMealFromSlot}
          weekStart={weekStart}
        />
        <AlertDialogComponent />
      </div>
    </div>
  );
}