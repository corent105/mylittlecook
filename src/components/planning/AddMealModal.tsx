'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChefHat, Search, Plus, Download, Eye, UserPlus, X } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES, getCompatibleRecipeTypes } from '@/lib/constants/recipe-types';
import { RecipeCategoryType } from '@prisma/client';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];

interface AddMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: {day: number, mealType: MealType} | null;
  popupSelectedMealUsers: string[];
  setPopupSelectedMealUsers: (users: string[]) => void;
  cookResponsibleId: string;
  setCookResponsibleId: (id: string) => void;
  mealUsers: any[];
  onAddRecipe: (recipe: any) => Promise<void>;
  isLoading: boolean;
}

export default function AddMealModal({
  isOpen,
  onClose,
  selectedSlot,
  popupSelectedMealUsers,
  setPopupSelectedMealUsers,
  cookResponsibleId,
  setCookResponsibleId,
  mealUsers,
  onAddRecipe,
  isLoading
}: AddMealModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<RecipeCategoryType[]>([]);

  // Quick profile addition state
  const [showQuickProfileDialog, setShowQuickProfileDialog] = useState(false);
  const [quickProfileName, setQuickProfileName] = useState('');
  const [quickProfileEmail, setQuickProfileEmail] = useState('');

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

  // Mutations for quick profile creation
  const utils = api.useUtils();

  const createMealUserMutation = api.mealUser.create.useMutation({
    onSuccess: (newProfile) => {
      utils.mealUser.getMyHouseholdProfiles.invalidate();
      setQuickProfileName('');
      setQuickProfileEmail('');
      setShowQuickProfileDialog(false);
      // Auto-select the new profile
      setPopupSelectedMealUsers([...popupSelectedMealUsers, newProfile.id]);
    },
  });

  const createInvitationMutation = api.profileInvitation.createInvitation.useMutation();

  const displayedRecipes = searchQuery.length > 0
    ? recipes
    : selectedTypes.length > 0
      ? (filteredRecipes?.recipes || [])
      : (allRecipes?.recipes || []);

  // Get compatible types for current meal type
  const getMealTypeFromSlot = () => {
    if (!selectedSlot) return 'LUNCH';
    const mealTypeMap: Record<MealType, string> = {
      'Petit-déjeuner': 'BREAKFAST',
      'Déjeuner': 'LUNCH',
      'Dîner': 'DINNER'
    };
    return mealTypeMap[selectedSlot.mealType] as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  };

  const compatibleTypes = getCompatibleRecipeTypes(getMealTypeFromSlot());

  const handleClose = () => {
    setSearchQuery('');
    setSelectedTypes([]);
    onClose();
  };

  const handleQuickProfileSubmit = async () => {
    if (!quickProfileName.trim()) return;

    try {
      const newProfile = await createMealUserMutation.mutateAsync({
        pseudo: quickProfileName.trim()
      });

      // Send invitation if email is provided
      if (quickProfileEmail.trim()) {
        await createInvitationMutation.mutateAsync({
          mealUserId: newProfile.id,
          email: quickProfileEmail.trim()
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const resetQuickProfileDialog = () => {
    setQuickProfileName('');
    setQuickProfileEmail('');
    setShowQuickProfileDialog(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col mx-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            Ajouter une recette - {selectedSlot ? `${DAYS[selectedSlot.day]} ${selectedSlot.mealType}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Meal Users Selection */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Pour qui cette recette ?</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowQuickProfileDialog(true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-6 px-2"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </div>
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
              <p className="text-xs text-gray-500 mt-1">
                La personne responsable de cuisiner ce repas
              </p>
            </div>
          )}

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
          <div className="max-h-64 overflow-y-auto border rounded-md">
            {(recipesLoading || (selectedSlot && !allRecipes && searchQuery.length === 0)) ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-pulse">Chargement des recettes...</div>
              </div>
            ) : displayedRecipes.length > 0 ? (
              displayedRecipes.map((recipe) => (
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
                      disabled={isLoading || popupSelectedMealUsers.length === 0}
                      className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRecipe(recipe);
                      }}
                    >
                      {isLoading ? 'Ajout...' : 'Ajouter'}
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

      {/* Quick Profile Creation Dialog */}
      <Dialog open={showQuickProfileDialog} onOpenChange={resetQuickProfileDialog}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un profil</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Prénom *
              </label>
              <Input
                placeholder="Prénom de la personne"
                value={quickProfileName}
                onChange={(e) => setQuickProfileName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && quickProfileName.trim()) {
                    handleQuickProfileSubmit();
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Email (optionnel)
              </label>
              <Input
                type="email"
                placeholder="email@exemple.com"
                value={quickProfileEmail}
                onChange={(e) => setQuickProfileEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && quickProfileName.trim()) {
                    handleQuickProfileSubmit();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Si renseigné, une invitation sera envoyée à cette adresse
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetQuickProfileDialog}
              disabled={createMealUserMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleQuickProfileSubmit}
              disabled={createMealUserMutation.isPending || !quickProfileName.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {createMealUserMutation.isPending ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}