'use client';

import { useState, useEffect } from 'react';
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import ShoppingListHeader from "@/components/shopping-list/ShoppingListHeader";
import ShoppingListFilters from "@/components/shopping-list/ShoppingListFilters";
import RecipesSummary from "@/components/shopping-list/RecipesSummary";
import ShoppingListContent from "@/components/shopping-list/ShoppingListContent";
import { ShoppingListSkeleton } from "@/components/skeleton/ShoppingListSkeleton";
import type { ShoppingListFilters as FilterType, ShoppingListFilterActions, DateFilterType } from "@/types/shopping-list-filters";

export default function ShoppingListPage() {
  const { data: session } = useSession();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Consolidated filter state
  const [filters, setFilters] = useState<FilterType>({
    selectedMealUsers: [],
    cookFilter: 'all',
    dateFilter: 'week',
    customStartDate: '',
    customEndDate: ''
  });

  // Filter actions
  const filterActions: ShoppingListFilterActions = {
    setSelectedMealUsers: (users: string[]) => setFilters(prev => ({ ...prev, selectedMealUsers: users })),
    setCookFilter: (filter: string) => setFilters(prev => ({ ...prev, cookFilter: filter })),
    setDateFilter: (filter: DateFilterType) => setFilters(prev => ({ ...prev, dateFilter: filter })),
    setCustomStartDate: (date: string) => setFilters(prev => ({ ...prev, customStartDate: date })),
    setCustomEndDate: (date: string) => setFilters(prev => ({ ...prev, customEndDate: date }))
  };


  const getDateRange = () => {
    // Utiliser la date locale actuelle
    const now = new Date();

    // Créer une date pour aujourd'hui en local (pas UTC)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.dateFilter) {
      case 'today':
        // Pour aujourd'hui : de aujourd'hui 00:00 à aujourd'hui 23:59
        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { startDate: today, endDate: endToday };

      case 'week':
        // Pour 7 jours : de aujourd'hui 00:00 aux 6 prochains jours 23:59
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999);
        return { startDate: today, endDate: weekEnd };

      case 'twoWeeks':
        // Pour 14 jours : de aujourd'hui 00:00 aux 13 prochains jours 23:59
        const twoWeeksEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 13, 23, 59, 59, 999);
        return { startDate: today, endDate: twoWeeksEnd };

      case 'custom':
        if (!filters.customStartDate || !filters.customEndDate) {
          // Fallback: utilise aujourd'hui + 6 jours si pas de dates personnalisées
          const fallbackEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999);
          return { startDate: today, endDate: fallbackEnd };
        }
        // Pour les dates personnalisées, on utilise directement les valeurs saisies
        const customStart = new Date(filters.customStartDate + 'T00:00:00');
        const customEnd = new Date(filters.customEndDate + 'T23:59:59');
        return { startDate: customStart, endDate: customEnd };

      default:
        const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return { startDate: today, endDate: defaultEnd };
    }
  };

  const { startDate, endDate } = getDateRange();

  // Get meal users for current user
  const { data: mealUsers = [] } = api.mealUser.getMyHouseholdProfiles.useQuery(undefined, {
    enabled: !!session?.user?.id
  });

  // Auto-select user's meal users when they are loaded
  useEffect(() => {
    if (mealUsers.length > 0 && filters.selectedMealUsers.length === 0) {
      const allIds = mealUsers.map(mu => mu.id);
      filterActions.setSelectedMealUsers(allIds);
    }
  }, [mealUsers, filters.selectedMealUsers.length]);

  const { data: shoppingList = [], isLoading } = api.shoppingList.generateShoppingList.useQuery({
    mealUserIds: filters.selectedMealUsers,
    startDate,
    endDate,
  }, {
    enabled: session?.user?.id !== undefined && (filters.selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  // Get meal plans for the period to show recipes summary (filtered by cook responsible)
  const { data: weekMealPlans = [] } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: filters.selectedMealUsers,
    startDate,
    endDate,
  }, {
    enabled: session?.user?.id !== undefined && (filters.selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  // Filter meal plans by cook responsible for recipes display
  const filteredMealPlans = weekMealPlans.filter((mealPlan: any) => {
    if (filters.cookFilter === 'all') return true;
    // Use the first meal user assignment as the cook
    return mealPlan.mealUserAssignments?.[0]?.mealUserId === filters.cookFilter;
  });

  // Get available cooks for filtering
  const { data: availableCooks = [] } = api.mealPlan.getCooksForWeek.useQuery({
    mealUserIds: filters.selectedMealUsers,
    startDate,
  }, {
    enabled: session?.user?.id !== undefined && (filters.selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  const formatDateRange = () => {
    switch (filters.dateFilter) {
      case 'today':
        return `Aujourd'hui - ${startDate.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}`;
      case 'week':
        return `7 prochains jours - ${startDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long'
        })} au ${endDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}`;
      case 'twoWeeks':
        return `14 prochains jours - ${startDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long'
        })} au ${endDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}`;
      case 'custom':
        return `Période personnalisée - ${startDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })} au ${endDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })}`;
      default:
        return '';
    }
  };

  const toggleItem = (ingredientId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId);
    } else {
      newChecked.add(ingredientId);
    }
    setCheckedItems(newChecked);
  };


  // Group recipes by day and meal type with actual dates
  const MEAL_TYPES = { BREAKFAST: 'Petit-déjeuner', LUNCH: 'Déjeuner', DINNER: 'Dîner' };

  const groupedRecipes = filteredMealPlans.reduce((acc, mealPlan: any) => {
    if (!mealPlan.recipe) return acc;

    const mealDate = new Date(mealPlan.mealDate);
    const dayName = mealDate.toLocaleDateString('fr-FR', { weekday: 'long' });
    const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const mealTypeName = MEAL_TYPES[mealPlan.mealType as keyof typeof MEAL_TYPES];
    const dateStr = mealDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: mealDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });

    if (!acc[mealDate.getTime()]) {
      acc[mealDate.getTime()] = {
        date: mealDate,
        dayName: capitalizedDayName,
        dateStr,
        meals: {}
      };
    }

    if (!acc[mealDate.getTime()].meals[mealTypeName]) {
      acc[mealDate.getTime()].meals[mealTypeName] = [];
    }

    acc[mealDate.getTime()].meals[mealTypeName].push(mealPlan.recipe);
    return acc;
  }, {} as Record<number, {
    date: Date;
    dayName: string;
    dateStr: string;
    meals: Record<string, any[]>;
  }>);

  const sortedGroupedRecipes = Object.values(groupedRecipes)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reduce((acc, group) => {
      Object.entries(group.meals).forEach(([mealType, recipes]) => {
        const key = `${group.dayName} ${group.dateStr} - ${mealType}`;
        acc[key] = recipes;
      });
      return acc;
    }, {} as Record<string, Array<any>>);

  const uniqueRecipes = Array.from(
    new Map(filteredMealPlans.filter((mp: any) => mp.recipe).map((mp: any) => [mp.recipe!.id, mp.recipe!])).values()
  );

  const exportToText = () => {
    const groupedIngredients = shoppingList.reduce((acc, item) => {
      const category = item.ingredient.category || 'Autres';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof shoppingList>);

    const content = [
      `# Liste de courses - ${formatDateRange()}`,
      '',
      ...Object.entries(groupedIngredients).map(([category, items]: [string, any]) => [
        `## ${category}`,
        ...(items as any[]).map((item: any) => {
          const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';
          return `- ${item.ingredient.name}: ${item.totalQuantity} ${item.ingredient.unit}${notes}`;
        }),
        ''
      ]).flat()
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liste-de-courses-${startDate.toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareList = async () => {
    const groupedIngredients = shoppingList.reduce((acc, item) => {
      const category = item.ingredient.category || 'Autres';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof shoppingList>);

    const content = [
      `Liste de courses - ${formatDateRange()}`,
      '',
      ...Object.entries(groupedIngredients).map(([category, items]: [string, any]) => [
        `${category}:`,
        ...(items as any[]).map((item: any) => {
          const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';
          return `• ${item.ingredient.name}: ${item.totalQuantity} ${item.ingredient.unit}${notes}`;
        }),
        ''
      ]).flat()
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Liste de courses - My Little Cook',
          text: content,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(content);
      showAlert(
        'Liste copiée',
        'La liste de courses a été copiée dans le presse-papiers !',
        'success'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <ShoppingListHeader
          formatDateRange={formatDateRange}
          onShare={shareList}
          onExport={exportToText}
        />

        <ShoppingListFilters
          filters={filters}
          filterActions={filterActions}
          availableCooks={availableCooks}
          formatDateRange={formatDateRange}
          weekMealPlans={weekMealPlans}
        />

        {/* Loading State */}
        {isLoading && <ShoppingListSkeleton />}

        <RecipesSummary
          uniqueRecipes={uniqueRecipes}
          sortedGroupedRecipes={sortedGroupedRecipes}
        />

        {!isLoading && (
          <ShoppingListContent
            shoppingList={shoppingList}
            checkedItems={checkedItems}
            onToggleItem={toggleItem}
            filters={filters}
            availableCooks={availableCooks}
          />
        )}
      </div>
      <AlertDialogComponent />
    </div>
  );
}