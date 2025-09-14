'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChefHat, Search, Edit, Trash2, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES, getCompatibleRecipeTypes } from '@/lib/constants/recipe-types';
import { RecipeCategoryType } from '@prisma/client';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

interface EditMealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMealPlan: any;
  editSelectedRecipe: any;
  setEditSelectedRecipe: (recipe: any) => void;
  popupSelectedMealUsers: string[];
  setPopupSelectedMealUsers: (users: string[]) => void;
  cookResponsibleId: string;
  setCookResponsibleId: (id: string) => void;
  mealUsers: any[];
  onUpdate: () => void;
  onDelete: (mealPlanId: string) => void;
  weekStart: Date;
}

export default function EditMealPlanModal({
  isOpen,
  onClose,
  editingMealPlan,
  editSelectedRecipe,
  setEditSelectedRecipe,
  popupSelectedMealUsers,
  setPopupSelectedMealUsers,
  cookResponsibleId,
  setCookResponsibleId,
  mealUsers,
  onUpdate,
  onDelete,
  weekStart
}: EditMealPlanModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<RecipeCategoryType[]>([]);

  const { data: recipes = [], isLoading: recipesLoading } = api.recipe.search.useQuery({
    query: searchQuery,
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
  }, {
    enabled: isOpen && searchQuery.length > 0,
  });

  const { data: allRecipes } = api.recipe.getAll.useQuery({
    limit: 20,
  }, {
    enabled: isOpen && selectedTypes.length === 0 && searchQuery.length === 0
  });

  const { data: filteredRecipes } = api.recipe.getByTypes.useQuery({
    types: selectedTypes,
    limit: 20,
  }, {
    enabled: isOpen && selectedTypes.length > 0 && searchQuery.length === 0
  });

  const displayedRecipes = searchQuery.length > 0
    ? recipes
    : selectedTypes.length > 0
      ? (filteredRecipes?.recipes || [])
      : (allRecipes?.recipes || []);

  // Get compatible types for current meal type
  const getMealTypeFromMealPlan = () => {
    if (!editingMealPlan) return 'LUNCH';
    const mealType = editingMealPlan.mealType;
    return mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  };

  const compatibleTypes = getCompatibleRecipeTypes(getMealTypeFromMealPlan());

  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'BREAKFAST': return 'Petit-déjeuner';
      case 'LUNCH': return 'Déjeuner';
      case 'DINNER': return 'Dîner';
      default: return mealType;
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col mx-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Modifier le repas
            {editingMealPlan && (
              <span className="text-sm text-gray-500 font-normal">
                - {DAYS[editingMealPlan.dayOfWeek]} {getMealTypeLabel(editingMealPlan.mealType)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
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
                  <div className="space-y-1 mt-1">
                    {/* Recipe Types */}
                    {editSelectedRecipe.types && editSelectedRecipe.types.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {editSelectedRecipe.types.slice(0, 3).map((recipeType: any) => (
                          <RecipeTypeBadge
                            key={recipeType.id}
                            type={recipeType.type as keyof typeof RECIPE_TYPES}
                            size="sm"
                          />
                        ))}
                        {editSelectedRecipe.types.length > 3 && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                            +{editSelectedRecipe.types.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Recipe Info */}
                    <div className="flex items-center space-x-2 text-xs text-blue-600">
                      {editSelectedRecipe.prepTime && <span className="bg-blue-100 px-2 py-1 rounded">{editSelectedRecipe.prepTime}min</span>}
                      {editSelectedRecipe.servings && <span className="bg-blue-100 px-2 py-1 rounded">{editSelectedRecipe.servings} pers.</span>}
                    </div>
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
                    const userId = mealUser.id;
                    const isIncluded = popupSelectedMealUsers.includes(userId);
                    const newUsers = isIncluded
                      ? popupSelectedMealUsers.filter(id => id !== userId)
                      : [...popupSelectedMealUsers, userId];
                    setPopupSelectedMealUsers(newUsers);
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

            {/* Type Filter */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
              <h5 className="font-medium text-sm mb-2 text-blue-800">Filtrer par type de recette</h5>
              <div className="flex flex-wrap gap-2">
                {compatibleTypes.map((recipeType) => {
                  const isSelected = selectedTypes.includes(recipeType.value as RecipeCategoryType);
                  return (
                    <Button
                      key={recipeType.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const typeValue = recipeType.value as RecipeCategoryType;
                        const currentType = typeValue;
                        if (isSelected) {
                          const newTypes = selectedTypes.filter(t => t !== currentType);
                          setSelectedTypes(newTypes);
                        } else {
                          const newTypes = [...selectedTypes, currentType];
                          setSelectedTypes(newTypes);
                        }
                      }}
                      className={isSelected ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : 'hover:border-blue-300'}
                    >
                      <span className="mr-1">{recipeType.emoji}</span>
                      {recipeType.label}
                    </Button>
                  );
                })}
              </div>
              {selectedTypes.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTypes([])}
                  className="mt-2 text-blue-600 hover:text-blue-700"
                >
                  Effacer les filtres
                </Button>
              )}
            </div>

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
                          <div className="space-y-1 mt-0.5">
                            {/* Recipe Types */}
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

                            {/* Recipe Info */}
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              {recipe.prepTime && <span className="bg-orange-100 px-1.5 py-0.5 rounded">{recipe.prepTime}min</span>}
                              {recipe.servings && <span className="bg-blue-100 px-1.5 py-0.5 rounded">{recipe.servings} pers.</span>}
                            </div>
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
                    onDelete(editingMealPlan.id);
                  }
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>

            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                disabled={!editSelectedRecipe || popupSelectedMealUsers.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
                onClick={onUpdate}
              >
                Modifier
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}