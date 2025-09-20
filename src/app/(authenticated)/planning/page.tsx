'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NextMeals from "@/components/NextMeals";
import MealPlanModal from "@/components/planning/MealPlanModal";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import PlanningFilters from "@/components/planning/PlanningFilters";
import WeekNavigation from "@/components/planning/WeekNavigation";
import SimplePlanningGrid from "@/components/planning/SimplePlanningGrid";
import { PlanningGridSkeleton } from "@/components/skeleton/PlanningGridSkeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];


export default function PlanningPage() {
  const { data: session } = useSession();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
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
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const { data: allMealPlans = [], isLoading: mealPlanLoading } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: mealUsers.map(mu => mu.id), // Get all meal plans
    startDate: weekStart,
    endDate: weekEnd,
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
        const mpDate = new Date(mp.mealDate);
        const mpDayOfWeek = mpDate.getDay() === 0 ? 6 : mpDate.getDay() - 1;
        console.log(`  - ${mp.recipe?.title || 'No recipe'} | Date: ${mpDate.toDateString()} | Day: ${mpDayOfWeek} | Type: ${mp.mealType}`);
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
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      utils.mealPlan.getWeekPlan.invalidate({
        mealUserIds: mealUsers.map(mu => mu.id),
        startDate: weekStart,
        endDate: weekEnd,
      });
    },
  });

  const removeMealMutation = api.mealPlan.removeMealFromSlot.useMutation({
    onSuccess: () => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      utils.mealPlan.getWeekPlan.invalidate({
        mealUserIds: mealUsers.map(mu => mu.id),
        startDate: weekStart,
        endDate: weekEnd,
      });
    },
  });

  const moveMealMutation = api.mealPlan.moveMealPlan.useMutation({
    onMutate: async ({ mealPlanId, newMealDate, newMealType }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const queryKey = {
        mealUserIds: mealUsers.map(mu => mu.id),
        startDate: weekStart,
        endDate: weekEnd,
      };

      await utils.mealPlan.getWeekPlan.cancel(queryKey);

      // Snapshot the previous value
      const previousMealPlans = utils.mealPlan.getWeekPlan.getData(queryKey);

      // Optimistically update to the new value
      if (previousMealPlans) {
        utils.mealPlan.getWeekPlan.setData(queryKey, (old :any ) => {
          if (!old) return old;

          return old.map((meal:any) => {
            if (meal.id === mealPlanId) {
              return {
                ...meal,
                mealDate: newMealDate,
                mealType: newMealType,
              };
            }
            return meal;
          });
        });
      }

      // Return a context object with the snapshotted value
      return { previousMealPlans, queryKey };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMealPlans) {
        utils.mealPlan.getWeekPlan.setData(context.queryKey, context.previousMealPlans);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      utils.mealPlan.getWeekPlan.invalidate({
        mealUserIds: mealUsers.map(mu => mu.id),
        startDate: weekStart,
        endDate: weekEnd,
      });
    },
  });


  function getWeekStart(date: Date) {
    // Instead of getting Monday of the week, we return the date itself
    // This creates a sliding 7-day window starting from the given date
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
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
    
    // Calculate the actual meal date based on week start and day of week
    const mealDate = new Date(weekStart);
    mealDate.setDate(weekStart.getDate() + selectedSlot.day);

    const mutationData = {
      mealUserIds: popupSelectedMealUsers,
      mealDate,
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

      // Calculate the meal date from the editing meal plan
      const editMealDate = new Date(editingMealPlan.mealDate);

      // Add updated meal plan
      await addMealMutation.mutateAsync({
        mealUserIds: popupSelectedMealUsers,
        mealDate: editMealDate,
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

  const handleMealMove = async (mealPlanId: string, newDay: number, newMealType: MealType) => {
    try {
      // Calculate the new meal date based on week start and day
      const newMealDate = new Date(weekStart);
      newMealDate.setHours(0, 0, 0, 0); // Normalize to start of day
      newMealDate.setDate(weekStart.getDate() + newDay);

      // Convert meal type to Prisma format
      const prismaMealType = newMealType === 'Petit-déjeuner' ? 'BREAKFAST' :
                            newMealType === 'Déjeuner' ? 'LUNCH' : 'DINNER';

      console.log('Moving meal:', {
        mealPlanId,
        newDay,
        newMealType,
        prismaMealType,
        newMealDate: newMealDate.toISOString(),
        weekStart: weekStart.toISOString()
      });

      await moveMealMutation.mutateAsync({
        mealPlanId,
        newMealDate,
        newMealType: prismaMealType as any,
      });

      console.log('Meal moved successfully');
    } catch (error) {
      console.error('Error moving meal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showAlert(
        'Erreur de déplacement',
        `Impossible de déplacer le repas: ${errorMessage}. Veuillez réessayer.`,
        'error'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Next Meals Section - Independent of selected week */}
        <NextMeals
          selectedMealUsers={mealUsers.map(mu => mu.id)}
        />

        <WeekNavigation
          currentWeek={currentWeek}
          onNavigateWeek={navigateWeek}
          onGoToToday={() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            setCurrentWeek(today);
          }}
          formatWeekRange={formatWeekRange}
          getWeekStart={getWeekStart}
        />

        <PlanningFilters
          mealUsers={mealUsers}
          filterMealUsers={filterMealUsers}
          setFilterMealUsers={setFilterMealUsers}
          filterRecipeTypes={filterRecipeTypes}
          setFilterRecipeTypes={setFilterRecipeTypes}
          filterCookResponsible={filterCookResponsible}
          setFilterCookResponsible={setFilterCookResponsible}
          filtersExpanded={filtersExpanded}
          setFiltersExpanded={setFiltersExpanded}
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

        {/* Planning Grid */}
        {mealPlanLoading ? (
          <PlanningGridSkeleton />
        ) : (
          <SimplePlanningGrid
            mealPlan={mealPlan}
            weekStart={weekStart}
            onSlotClick={handleSlotClick}
            onMealCardClick={handleMealCardClick}
            onMealMove={handleMealMove}
            isMovingMeal={moveMealMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}