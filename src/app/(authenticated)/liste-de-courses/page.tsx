'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChefHat, ShoppingCart, Download, Share2, Check, Calendar, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from "@/lib/constants/recipe-types";

export default function ShoppingListPage() {
  const { data: session } = useSession();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedMealUsers, setSelectedMealUsers] = useState<string[]>([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [cookFilter, setCookFilter] = useState<string>('all'); // 'all' or specific cook ID

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(start.setDate(diff));
  };

  const weekStart = getWeekStart(currentWeek);

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
    weekStart,
    cookResponsibleId: cookFilter === 'all' ? undefined : cookFilter,
  }, {
    enabled: session?.user?.id !== undefined && (selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

  // Get meal plans for the week to show recipes summary (filtered by cook responsible)
  const { data: weekMealPlans = [] } = api.mealPlan.getWeekPlan.useQuery({
    mealUserIds: selectedMealUsers,
    weekStart,
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
    weekStart,
  }, {
    enabled: session?.user?.id !== undefined && (selectedMealUsers.length > 0 || mealUsers.length > 0)
  });

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

  // Group recipes by day and meal type
  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const MEAL_TYPES = { BREAKFAST: 'Petit-déjeuner', LUNCH: 'Déjeuner', DINNER: 'Dîner' };

  const groupedRecipes = filteredMealPlans.reduce((acc, mealPlan) => {
    if (!mealPlan.recipe) return acc;
    
    const dayName = DAYS[mealPlan.dayOfWeek];
    const mealTypeName = MEAL_TYPES[mealPlan.mealType as keyof typeof MEAL_TYPES];
    const key = `${dayName} - ${mealTypeName}`;
    
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(mealPlan.recipe);
    return acc;
  }, {} as Record<string, Array<any>>);

  const uniqueRecipes = Array.from(
    new Map(filteredMealPlans.filter(mp => mp.recipe).map(mp => [mp.recipe!.id, mp.recipe!])).values()
  );

  const exportToText = () => {
    const content = [
      `# Liste de courses - ${formatWeekRange(weekStart)}`,
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
    a.download = `liste-de-courses-${weekStart.toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareList = async () => {
    const content = [
      `Liste de courses - ${formatWeekRange(weekStart)}`,
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
      alert('Liste copiée dans le presse-papiers!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
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
                <span>Semaine du {formatWeekRange(weekStart)}</span>
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

        {/* Filter Section */}
        {availableCooks.length > 0 && (
          <Card className="mb-8 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Filtrer par responsable de cuisine</h3>
                <p className="text-sm text-gray-600">
                  Afficher les recettes et ingrédients pour un cuisinier spécifique ou pour tous
                </p>
              </div>
              <div className="w-48">
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
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
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
          <Card className="mb-8">
            <div className="p-6">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-0 h-auto text-left"
                onClick={() => setShowRecipes(!showRecipes)}
              >
                <div className="flex items-center space-x-2">
                  <ChefHat className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-gray-900">
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
                <div className="mt-6 space-y-4">
                  {Object.entries(groupedRecipes).map(([timeSlot, recipes]) => (
                    <div key={timeSlot} className="border-l-2 border-orange-200 pl-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">{timeSlot}</h4>
                      <div className="space-y-2">
                        {recipes.map((recipe) => (
                          <Link key={`${timeSlot}-${recipe.id}`} href={`/recettes/${recipe.id}`}>
                            <div className="flex items-start space-x-2 p-2 hover:bg-orange-50 rounded transition-colors cursor-pointer">
                              <div className="flex-1">
                                <div className="text-sm text-gray-900 hover:text-orange-600 font-medium">
                                  • {recipe.title}
                                </div>
                                {recipe.types && recipe.types.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
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
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Résumé de la liste
                        {cookFilter !== 'all' && (
                          <span className="text-sm font-normal text-orange-600 ml-2">
                            (Filtré par {availableCooks.find(c => c.id === cookFilter)?.pseudo})
                          </span>
                        )}
                      </h3>
                      <p className="text-gray-600">
                        {shoppingList.length} ingrédients à acheter
                        {cookFilter !== 'all' && availableCooks.length > 0 && (
                          <span className="text-sm text-orange-600 ml-1">
                            - {availableCooks.find(c => c.id === cookFilter)?.pseudo} 👨‍🍳
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {checkedItems.size}/{shoppingList.length}
                      </div>
                      <div className="text-sm text-gray-600">complétés</div>
                    </div>
                  </div>
                </Card>

                {/* Ingredients by Category */}
                {Object.entries(groupedIngredients).map(([category, ingredients]) => (
                  <Card key={category} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-3 h-3 bg-orange-600 rounded-full mr-2"></div>
                      {category}
                    </h3>
                    
                    <div className="space-y-3">
                      {ingredients.map((item) => {
                        const isChecked = checkedItems.has(item.ingredient.id);
                        const notes = item.notes.length > 0 ? ` (${item.notes.join(', ')})` : '';
                        
                        return (
                          <div
                            key={item.ingredient.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                              isChecked
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleItem(item.ingredient.id)}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-green-600 border-green-600'
                                  : 'border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {isChecked && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className={`font-medium transition-all ${
                                isChecked 
                                  ? 'text-green-800 line-through' 
                                  : 'text-gray-900'
                              }`}>
                                {item.ingredient.name}
                              </div>
                              <div className={`text-sm transition-all ${
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
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression</span>
                    <span className="text-sm font-medium text-gray-700">
                      {Math.round((checkedItems.size / shoppingList.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full transition-all duration-300"
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
    </div>
  );
}