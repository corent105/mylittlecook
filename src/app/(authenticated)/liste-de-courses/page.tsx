'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChefHat, ShoppingCart, Download, Share2, Check, Calendar, ArrowLeft, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from "@/lib/constants/recipe-types";
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";

type DateFilterType = 'today' | 'week' | 'twoWeeks' | 'custom';

export default function ShoppingListPage() {
  const { data: session } = useSession();
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedMealUsers, setSelectedMealUsers] = useState<string[]>([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [cookFilter, setCookFilter] = useState<string>('all'); // 'all' or specific cook ID
  const [dateFilter, setDateFilter] = useState<DateFilterType>('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Handler pour gérer le changement de filtre de date
  const handleDateFilterChange = (newFilter: DateFilterType) => {
    setDateFilter(newFilter);

    // Si l'utilisateur choisit "personnalisé" et qu'il n'y a pas de dates définies,
    // on initialise avec la semaine courante
    if (newFilter === 'custom' && (!customStartDate || !customEndDate)) {
      const today = new Date();
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      setCustomStartDate(weekStart.toISOString().split('T')[0]);
      setCustomEndDate(weekEnd.toISOString().split('T')[0]);
    }
  };

  const getDateRange = () => {
    // Utiliser la date locale actuelle
    const now = new Date();

    // Créer une date pour aujourd'hui en local (pas UTC)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
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
        if (!customStartDate || !customEndDate) {
          // Fallback: utilise aujourd'hui + 6 jours si pas de dates personnalisées
          const fallbackEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999);
          return { startDate: today, endDate: fallbackEnd };
        }
        // Pour les dates personnalisées, on utilise directement les valeurs saisies
        const customStart = new Date(customStartDate + 'T00:00:00');
        const customEnd = new Date(customEndDate + 'T23:59:59');
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
    if (mealUsers.length > 0 && selectedMealUsers.length === 0) {
      const allIds = mealUsers.map(mu => mu.id);
      setSelectedMealUsers(allIds);
    }
  }, [mealUsers, selectedMealUsers.length]);

  const { data: shoppingList = [], isLoading } = api.mealPlan.generateShoppingList.useQuery({
    mealUserIds: selectedMealUsers,
    startDate,
    endDate,
    cookResponsibleId: cookFilter === 'all' ? undefined : cookFilter,
  }, {
    enabled: session?.user?.id !== undefined && (selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  // Get meal plans for the period to show recipes summary (filtered by cook responsible)
  const { data: weekMealPlans = [] } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: selectedMealUsers,
    startDate,
    endDate,
  }, {
    enabled: session?.user?.id !== undefined && (selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  // Filter meal plans by cook responsible for recipes display
  const filteredMealPlans = weekMealPlans.filter(mealPlan => {
    if (cookFilter === 'all') return true;
    return mealPlan.cookResponsibleId === cookFilter;
  });

  // Get available cooks for filtering
  const { data: availableCooks = [] } = api.mealPlan.getCooksForWeek.useQuery({
    mealUserIds: selectedMealUsers,
    startDate,
    endDate,
  }, {
    enabled: session?.user?.id !== undefined && (selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  const formatDateRange = () => {
    switch (dateFilter) {
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

  const groupedIngredients = shoppingList.reduce((acc, item) => {
    const category = item.ingredient.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof shoppingList>);

  // Group recipes by day and meal type with actual dates
  // Note: dayOfWeek in DB: 0=Lundi, 1=Mardi, ..., 6=Dimanche
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const MEAL_TYPES = { BREAKFAST: 'Petit-déjeuner', LUNCH: 'Déjeuner', DINNER: 'Dîner' };

  const groupedRecipes = filteredMealPlans.reduce((acc, mealPlan) => {
    if (!mealPlan.recipe) return acc;

    // Use the mealDate directly from the meal plan
    const mealDate = new Date(mealPlan.mealDate);

    // Get the actual day name from the calculated date (more reliable)
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

  // Sort by date and flatten for display
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
    new Map(filteredMealPlans.filter(mp => mp.recipe).map(mp => [mp.recipe!.id, mp.recipe!])).values()
  );

  const exportToText = () => {
    const content = [
      `# Liste de courses - ${formatDateRange()}`,
      '',
      ...Object.entries(groupedIngredients).map(([category, items]) => [
        `## ${category}`,
        ...items.map(item => {
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
    const content = [
      `Liste de courses - ${formatDateRange()}`,
      '',
      ...Object.entries(groupedIngredients).map(([category, items]) => [
        `${category}:`,
        ...items.map(item => {
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
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          {/* Mobile Layout */}
          <div className="md:hidden space-y-4">
            {/* Back Button */}
            <Link href="/planning">
              <Button variant="outline" size="sm" className="mb-3">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au planning
              </Button>
            </Link>

            {/* Title and Date */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Liste de Courses</h2>
              <div className="flex items-center justify-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span className="text-sm">{formatDateRange()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button variant="outline" onClick={shareList} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
              <Button variant="outline" onClick={exportToText} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/planning">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au planning
                </Button>
              </Link>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Liste de Courses</h2>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{formatDateRange()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={shareList}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
              <Button variant="outline" onClick={exportToText}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>

        {/* Period Filter Section */}
        <Card className="mb-6 sm:mb-8 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Période de génération</h3>
              <p className="text-sm text-gray-600">
                Choisissez la période pour laquelle générer la liste de courses
              </p>
              {process.env.NODE_ENV === 'development' && weekMealPlans.length > 0 && (
                <div className="text-xs text-blue-600 mt-1 font-mono bg-blue-50 px-2 py-1 rounded">
                  Debug: {weekMealPlans.length} recettes trouvées |
                  Exemples: {weekMealPlans.slice(0, 2).map(mp => {
                    const mealDate = new Date(mp.mealDate);
                    return mealDate.toLocaleDateString('fr-FR');
                  }).join(', ')}
                </div>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={dateFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('today')}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Aujourd'hui
              </Button>
              <Button
                variant={dateFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('week')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                7 jours
              </Button>
              <Button
                variant={dateFilter === 'twoWeeks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('twoWeeks')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                14 jours
              </Button>
              <Button
                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDateFilterChange('custom')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Personnalisé
              </Button>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full"
                    max={customEndDate || undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full"
                    min={customStartDate || undefined}
                  />
                </div>
                {customStartDate && customEndDate && new Date(customStartDate) > new Date(customEndDate) && (
                  <div className="col-span-full">
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                      ⚠️ La date de début ne peut pas être postérieure à la date de fin
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Cook Filter Section */}
        {availableCooks.length > 0 && (
          <Card className="mb-6 sm:mb-8 p-4">
            <div className="space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Filtrer par responsable de cuisine</h3>
                <p className="text-sm text-gray-600">
                  Afficher les recettes et ingrédients pour un cuisinier spécifique ou pour tous
                </p>
              </div>
              <div className="w-full md:w-48">
                <Select value={cookFilter} onValueChange={setCookFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un filtre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      🛒 Tous les ingrédients
                    </SelectItem>
                    {availableCooks.map((cook) => (
                      <SelectItem key={cook.id} value={cook.id}>
                        👨‍🍳 {cook.pseudo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-6 sm:p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 sm:w-1/4"></div>
              <div className="space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Recipes Summary */}
        {!isLoading && uniqueRecipes.length > 0 && (
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
        )}

        {/* Shopping List */}
        {!isLoading && (
          <>
            {shoppingList.length === 0 ? (
              <Card className="p-12 text-center">
                <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Aucun ingrédient trouvé
                </h3>
                <p className="text-gray-600 mb-6">
                  Il n'y a pas de repas planifiés pour cette semaine avec des ingrédients définis.
                </p>
                <Link href="/planning">
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    Aller au planning
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Résumé de la liste
                        {cookFilter !== 'all' && (
                          <span className="block sm:inline text-sm font-normal text-orange-600 sm:ml-2">
                            (Filtré par {availableCooks.find(c => c.id === cookFilter)?.pseudo})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600">
                        {shoppingList.length} ingrédients à acheter
                        {cookFilter !== 'all' && availableCooks.length > 0 && (
                          <span className="block sm:inline text-sm text-orange-600 sm:ml-1">
                            - {availableCooks.find(c => c.id === cookFilter)?.pseudo} 👨‍🍳
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-center sm:text-right">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">
                        {checkedItems.size}/{shoppingList.length}
                      </div>
                      <div className="text-sm text-gray-600">complétés</div>
                    </div>
                  </div>
                </Card>

                {/* Ingredients by Category */}
                {Object.entries(groupedIngredients).map(([category, ingredients]) => (
                  <Card key={category} className="p-4 sm:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                      <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
                      {category}
                    </h3>

                    <div className="space-y-2 sm:space-y-3">
                      {ingredients.map((item) => {
                        const isChecked = checkedItems.has(item.ingredient.id);
                        const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';

                        return (
                          <div
                            key={item.ingredient.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer active:scale-95 ${
                              isChecked
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleItem(item.ingredient.id)}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                isChecked
                                  ? 'bg-green-600 border-green-600'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {isChecked && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className={`font-medium transition-all text-sm sm:text-base ${
                                isChecked
                                  ? 'text-green-800 line-through'
                                  : 'text-gray-900'
                              }`}>
                                {item.ingredient.name}
                              </div>
                              <div className={`text-xs sm:text-sm transition-all ${
                                isChecked
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                              }`}>
                                {item.totalQuantity} {item.ingredient.unit}{notes}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}

                {/* Progress Bar */}
                <Card className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression</span>
                    <span className="text-sm font-medium text-gray-700">
                      {Math.round((checkedItems.size / shoppingList.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                    <div
                      className="bg-orange-600 h-2 sm:h-3 rounded-full transition-all duration-300"
                      style={{
                        width: `${(checkedItems.size / shoppingList.length) * 100}%`
                      }}
                    ></div>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
      <AlertDialogComponent />
    </div>
  );
}