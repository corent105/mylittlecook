'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChefHat, Search, Plus, Download, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES, getCompatibleRecipeTypes } from '@/lib/constants/recipe-types';
import { RecipeCategoryType } from '@prisma/client';

interface RecipeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: any) => void;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  currentRecipeId?: string; // Pour filtrer la recette actuelle en mode edit
  title?: string;
}

export default function RecipeSelectionModal({
  isOpen,
  onClose,
  onSelectRecipe,
  mealType,
  currentRecipeId,
  title = "Sélectionner une recette"
}: RecipeSelectionModalProps) {
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

  const compatibleTypes = getCompatibleRecipeTypes(mealType);

  const handleClose = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    onClose();
  };

  const handleSelectRecipe = (recipe: any) => {
    onSelectRecipe(recipe);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col mx-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Type Filter */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-sm mb-2 text-blue-800">Filtrer par type de recette</h4>
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

          {/* Recipe Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher une recette..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Recipe List */}
          <div className="max-h-96 overflow-y-auto border rounded-md">
            {recipesLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-pulse">Chargement des recettes...</div>
              </div>
            ) : displayedRecipes.length > 0 ? (
              displayedRecipes
                .filter(recipe => recipe.id !== currentRecipeId)
                .map((recipe) => (
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
                        <div className="space-y-1 mt-1">
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
                            {recipe.prepTime && <span className="bg-orange-100 px-2 py-1 rounded">{recipe.prepTime}min</span>}
                            {recipe.servings && <span className="bg-blue-100 px-2 py-1 rounded">{recipe.servings} pers.</span>}
                          </div>
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
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleSelectRecipe(recipe)}
                      >
                        Sélectionner
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

          {/* Quick Actions */}
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
  );
}