'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChefHat, Plus, Calendar, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { api } from "@/components/providers/trpc-provider";

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
  
  const weekStart = getWeekStart(currentWeek);
  
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
  
  const { data: allRecipes = [] } = api.recipe.getAll.useQuery({
    limit: 20,
  });
  
  // Mutations
  const addMealMutation = api.mealPlan.addMealToSlot.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      api.useContext().mealPlan.getWeekPlan.invalidate({
        projectId: TEMP_PROJECT_ID,
        weekStart,
      });
    },
  });
  
  const removeMealMutation = api.mealPlan.removeMealFromSlot.useMutation({
    onSuccess: () => {
      api.useContext().mealPlan.getWeekPlan.invalidate({
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

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(start.setDate(diff));
  };

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
    return meals.find(m => m.day === day && m.mealType === mealType);
  };

  const handleSlotClick = (day: number, mealType: MealType) => {
    setSelectedSlot({ day, mealType });
  };

  const mockRecipes = [
    { id: '1', title: 'Pâtes à la carbonara', imageUrl: '' },
    { id: '2', title: 'Salade César', imageUrl: '' },
    { id: '3', title: 'Ratatouille', imageUrl: '' },
    { id: '4', title: 'Croque-monsieur', imageUrl: '' },
  ];

  const filteredRecipes = mockRecipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addRecipeToSlot = (recipe: typeof mockRecipes[0]) => {
    if (!selectedSlot) return;
    
    setMeals(prev => [
      ...prev.filter(m => !(m.day === selectedSlot.day && m.mealType === selectedSlot.mealType)),
      {
        day: selectedSlot.day,
        mealType: selectedSlot.mealType,
        recipe
      }
    ]);
    setSelectedSlot(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Little Cook</h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Button variant="ghost">Planning</Button>
            <Button variant="ghost">Recettes</Button>
            <Button variant="ghost">Liste de courses</Button>
          </nav>
          <Button>Mon compte</Button>
        </div>
      </header>

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
          <Button className="bg-orange-600 hover:bg-orange-700">
            Générer liste de courses
          </Button>
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
                    className="min-h-24 p-3 cursor-pointer hover:shadow-md transition-shadow border-dashed border-gray-300"
                    onClick={() => handleSlotClick(dayIndex, mealType)}
                  >
                    {meal?.recipe ? (
                      <div className="text-sm">
                        <div className="font-medium text-gray-900 mb-1">
                          {meal.recipe.title}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <Plus className="h-4 w-4" />
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
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer rounded-md"
                    onClick={() => addRecipeToSlot(recipe)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                        <ChefHat className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium">{recipe.title}</div>
                      </div>
                    </div>
                    <Button size="sm">Ajouter</Button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une nouvelle recette
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}