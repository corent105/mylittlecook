'use client';

import { Card } from "@/components/ui/card";
import { ChefHat, Plus, Users, Edit } from "lucide-react";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from '@/lib/constants/recipe-types';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { useState } from 'react';

const DAYS_OF_WEEK = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];

interface SimplePlanningGridProps {
  mealPlan: any[];
  weekStart: Date;
  onSlotClick: (day: number, mealType: MealType) => void;
  onMealCardClick: (meal: any, event: React.MouseEvent) => void;
  onMealMove?: (mealPlanId: string, newDay: number, newMealType: MealType) => void;
  isMovingMeal?: boolean;
}

// Composant draggable simplifié
function DraggableMealCard({ meal, children, disabled = false }: { meal: any, children: React.ReactNode, disabled?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: meal.id,
    data: meal,
    disabled,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      className={`${isDragging ? 'opacity-50' : ''} ${disabled ? 'cursor-not-allowed opacity-75' : ''}`}
    >
      {children}
    </div>
  );
}

// Composant droppable simplifié
function DroppableSlot({ slotId, children, isPastDay = false }: {
  slotId: string,
  children: React.ReactNode,
  isPastDay?: boolean
}) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: slotId,
    disabled: isPastDay,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full ${isOver && !isPastDay ? 'bg-orange-100 ring-2 ring-orange-400' : ''}`}
    >
      {children}
    </div>
  );
}

export default function SimplePlanningGrid({
  mealPlan,
  weekStart,
  onSlotClick,
  onMealCardClick,
  onMealMove,
  isMovingMeal = false
}: SimplePlanningGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMeal, setActiveMeal] = useState<any>(null);

  // Configuration simplifiée des sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveMeal(active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveMeal(null);

    if (!over || !onMealMove) return;

    const meal = active.data.current;
    const slotId = over.id as string;

    if (!meal) return;

    // Parse slot ID: format is "day-mealType"
    const [dayStr, ...mealTypeParts] = slotId.split('-');
    const targetDay = parseInt(dayStr);
    const targetMealType = mealTypeParts.join('-') as MealType;

    // Calculer la position actuelle du repas
    const currentMealDate = new Date(meal.mealDate);
    const weekStartDate = new Date(weekStart);
    const currentDay = Math.floor((currentMealDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));

    const mealTypeMap: Record<string, MealType> = {
      'BREAKFAST': 'Petit-déjeuner',
      'LUNCH': 'Déjeuner',
      'DINNER': 'Dîner'
    };
    const currentMealType = mealTypeMap[meal.mealType];

    // Ne déplacer que si la position change
    if (currentDay !== targetDay || currentMealType !== targetMealType) {
      onMealMove(meal.id, targetDay, targetMealType);
    }
  };

  // Helper function to get the date for a specific day
  const getDateForDay = (dayIndex: number) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };

  // Generate array of 7 days starting from weekStart
  const getDaysToDisplay = () => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = getDateForDay(index);
      const dayName = DAYS_OF_WEEK[date.getDay()];
      return {
        index,
        date,
        dayName,
        shortDate: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      };
    });
  };

  const daysToDisplay = getDaysToDisplay();

  // Helper function to check if date is today
  const isToday = (dayIndex: number) => {
    const date = getDateForDay(dayIndex);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Helper function to check if date is in the past
  const isPastDay = (dayIndex: number) => {
    const date = getDateForDay(dayIndex);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today;
  };

  const getMealsForSlot = (day: number, mealType: MealType) => {
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',
      'Dîner': 'DINNER'
    };

    // Calculate the target date for this slot
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + day);

    return mealPlan.filter(m => {
      // Compare the meal date with the target date
      const mealDate = new Date(m.mealDate);
      const isSameDate = mealDate.getFullYear() === targetDate.getFullYear() &&
                        mealDate.getMonth() === targetDate.getMonth() &&
                        mealDate.getDate() === targetDate.getDate();

      return isSameDate && m.mealType === mealTypeMap[mealType];
    });
  };

  const renderMealCard = (meal: any) => {
    // Mapping des types de repas
    const mealTypeLabels: Record<string, string> = {
      'BREAKFAST': 'Petit-déj',
      'LUNCH': 'Déjeuner',
      'DINNER': 'Dîner'
    };

    return (
      <DraggableMealCard key={meal.id} meal={meal} disabled={isMovingMeal}>
        <div
          className={`relative group bg-white rounded border border-orange-100 shadow-sm hover:shadow-md transition-all ${
            isMovingMeal ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            if (!isMovingMeal) {
              onMealCardClick(meal, e);
            }
          }}
        >
          {/* Photo de la recette si existante */}
          {meal.recipe?.imageUrl && (
            <div className="w-full h-20 mb-2 overflow-hidden rounded-t">
              <img
                src={meal.recipe.imageUrl}
                alt={meal.recipe.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className={`${meal.recipe?.imageUrl ? 'p-2' : 'p-2'}`}>
            {/* Titre de la recette */}
            <div className="font-medium text-gray-900 mb-2 text-xs line-clamp-2">
              {meal.recipe?.title || 'Recette supprimée'}
            </div>

            {/* Type de repas et nombre de personnes */}
            <div className="flex items-center justify-between text-xs">
              
                {meal.recipe.types.slice(0, 2).map((recipeType: any) => (
                  <RecipeTypeBadge
                    key={recipeType.id}
                    type={recipeType.type as keyof typeof RECIPE_TYPES}
                    size="sm"
                  />
                ))}
              
              <span className="bg-green-100 px-2 py-1 rounded text-green-700 flex items-center font-medium">
                <Users className="h-3 w-3 mr-1" />
                {meal.mealUserAssignments?.length || 0}
              </span>
            </div>
          </div>

          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit className="h-3 w-3 text-gray-400" />
          </div>
        </div>
      </DraggableMealCard>
    );
  };

  const renderSlotContent = (meals: any[], dayIndex: number, mealType: MealType) => {
    if (meals.length > 0) {
      return (
        <div className="space-y-2">
          {meals.map((meal) => renderMealCard(meal))}

          <div className="flex items-center justify-center py-1 text-gray-400 hover:text-orange-500 transition-colors border-t border-dashed border-orange-200">
            <div className="text-center">
              <Plus className="h-4 w-4 mx-auto mb-0.5" />
              <div className="text-xs">Ajouter</div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-20 text-gray-400 hover:text-orange-500 transition-colors">
        <div className="text-center">
          <Plus className="h-6 w-6 mx-auto mb-1" />
          <div className="text-xs">Ajouter</div>
        </div>
      </div>
    );
  };

  return (
    <div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-8 gap-4">
          {/* Header Row */}
          <div className="font-medium text-gray-700"></div>
          {daysToDisplay.map((day) => (
            <div key={day.index} className={`text-center font-medium py-2 relative ${
              isToday(day.index)
                ? 'text-orange-600'
                : isPastDay(day.index)
                  ? 'text-gray-400'
                  : 'text-gray-700'
            }`}>
              {isToday(day.index) && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
              )}
              <div className="text-sm">{day.dayName}</div>
              <div className={`text-xs ${
                isToday(day.index)
                  ? 'text-orange-500 font-semibold'
                  : isPastDay(day.index)
                    ? 'text-gray-400'
                    : 'text-gray-500'
              }`}>
                {day.shortDate}
                {isToday(day.index) && (
                  <span className="block text-orange-600 font-medium">Aujourd'hui</span>
                )}
              </div>
            </div>
          ))}

          {/* Meal Rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="contents">
              <div className="flex items-center font-medium text-gray-700 py-4">
                {mealType}
              </div>
              {daysToDisplay.map((day) => {
                const meals = getMealsForSlot(day.index, mealType);
                const slotId = `${day.index}-${mealType}`;
                return (
                  <DroppableSlot
                    key={slotId}
                    slotId={slotId}
                    isPastDay={isPastDay(day.index)}
                  >
                    <Card
                      className={`min-h-32 p-3 transition-all duration-200 ${
                        isPastDay(day.index)
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : 'cursor-pointer hover:shadow-md'
                      } ${
                        meals.length > 0
                          ? 'border-solid border-orange-200 bg-orange-50/50'
                          : 'border-dashed border-gray-300 hover:border-orange-300'
                      } ${
                        isToday(day.index) && meals.length === 0
                          ? 'ring-2 ring-orange-200 bg-orange-25'
                          : ''
                      }`}
                      onClick={() => !isPastDay(day.index) && onSlotClick(day.index, mealType)}
                    >
                      {renderSlotContent(meals, day.index, mealType)}
                    </Card>
                  </DroppableSlot>
                );
              })}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeMeal ? (
            <div className="bg-white rounded border border-orange-200 p-2 shadow-lg transform rotate-1 scale-105">
              <div className="font-medium text-gray-900 text-xs">
                {activeMeal.recipe?.title || 'Recette supprimée'}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {isMovingMeal ? (
                  <>
                    <div className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    Déplacement en cours...
                  </>
                ) : (
                  <>
                    📋 Déplacement...
                  </>
                )}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}