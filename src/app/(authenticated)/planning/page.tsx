'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import NextMeals from "@/components/NextMeals";
import EditMealPlanModal from "@/components/planning/EditMealPlanModal";
import AddMealModal from "@/components/planning/AddMealModal";
import MealUserSelection from "@/components/planning/MealUserSelection";
import PlanningGrid from "@/components/planning/PlanningGrid";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
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
        {/* Meal Users Selection */}
        <MealUserSelection
          mealUsers={mealUsers}
          selectedMealUsers={selectedMealUsers}
          setSelectedMealUsers={setSelectedMealUsers}
          onCreateMealUser={() => {
            const pseudo = prompt('Entrez votre pseudo:');
            if (pseudo) {
              createMealUserMutation.mutate({
                pseudo,
                userId: session?.user?.id
              });
            }
          }}
          isCreatingMealUser={createMealUserMutation.isPending}
        />

        {/* Next Meals Section - Independent of selected week */}
        <NextMeals
          onMealClick={(meal) => handleMealCardClick(meal, { stopPropagation: () => {} } as React.MouseEvent)}
          selectedMealUsers={selectedMealUsers}
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


        {/* Planning Grid */}
        <PlanningGrid
          mealPlan={mealPlan}
          onSlotClick={handleSlotClick}
          onMealCardClick={handleMealCardClick}
        />

        {/* Add Meal Modal */}
        <AddMealModal
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
        <EditMealPlanModal
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