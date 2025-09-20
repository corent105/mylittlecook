'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChefHat, Search, Plus, Download, Eye, UserPlus, X, Edit, Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import Link from "next/link";
import RecipeTypeBadge from "@/components/recipe/RecipeTypeBadge";
import { RECIPE_TYPES } from '@/lib/constants/recipe-types';
import { MealType as PrismaMealType } from '@prisma/client';
import { useAlertDialog } from "@/components/ui/alert-dialog-custom";
import RecipeSelectionModal from "./RecipeSelectionModal";

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MEAL_TYPES = ['Petit-déjeuner', 'Déjeuner', 'Dîner'] as const;

type MealType = typeof MEAL_TYPES[number];

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';

  // Pour le mode 'add'
  selectedSlot?: {day: number, mealType: MealType} | null;
  onAddRecipe?: (recipe: any) => Promise<void>;

  // Pour le mode 'edit'
  editingMealPlan?: any;
  editSelectedRecipe?: any;
  setEditSelectedRecipe?: (recipe: any) => void;
  onUpdate?: () => void;
  onDelete?: (mealPlanId: string) => void;
  weekStart?: Date;

  // Communs
  popupSelectedMealUsers: string[];
  setPopupSelectedMealUsers: (users: string[]) => void;
  cookResponsibleId: string;
  setCookResponsibleId: (id: string) => void;
  mealUsers: any[];
  isLoading?: boolean;
}

export default function MealPlanModal({
  isOpen,
  onClose,
  mode,
  selectedSlot,
  onAddRecipe,
  editingMealPlan,
  editSelectedRecipe,
  setEditSelectedRecipe,
  onUpdate,
  onDelete,
  weekStart,
  popupSelectedMealUsers,
  setPopupSelectedMealUsers,
  cookResponsibleId,
  setCookResponsibleId,
  mealUsers,
  isLoading = false
}: MealPlanModalProps) {
  const { showAlert, AlertDialogComponent } = useAlertDialog();
  const [showRecipeSelectionModal, setShowRecipeSelectionModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  // Quick profile addition state
  const [showQuickProfileDialog, setShowQuickProfileDialog] = useState(false);
  const [quickProfileName, setQuickProfileName] = useState('');
  const [quickProfileEmail, setQuickProfileEmail] = useState('');

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

  // Helper functions
  const getMealTypeFromSlot = () => {
    if (mode === 'edit' && editingMealPlan) {
      return editingMealPlan.mealType as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    }
    if (mode === 'add' && selectedSlot) {
      const mealTypeMap: Record<MealType, string> = {
        'Petit-déjeuner': 'BREAKFAST',
        'Déjeuner': 'LUNCH',
        'Dîner': 'DINNER'
      };
      return mealTypeMap[selectedSlot.mealType] as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
    }
    return 'LUNCH';
  };

  const getPrismaMealType = (): PrismaMealType => {
    if (mode === 'edit' && editingMealPlan) {
      return editingMealPlan.mealType;
    }
    if (mode === 'add' && selectedSlot) {
      const mealTypeMap: Record<MealType, PrismaMealType> = {
        'Petit-déjeuner': 'BREAKFAST',
        'Déjeuner': 'LUNCH',
        'Dîner': 'DINNER'
      };
      return mealTypeMap[selectedSlot.mealType];
    }
    return 'LUNCH';
  };

  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'BREAKFAST': return 'Petit-déjeuner';
      case 'LUNCH': return 'Déjeuner';
      case 'DINNER': return 'Dîner';
      default: return mealType;
    }
  };

  // Initialize recipe selection when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'add') {
        // Reset recipe selection for add mode
        setSelectedRecipe(null);
      } else if (mode === 'edit' && editSelectedRecipe) {
        // Initialize selected recipe with current recipe for edit mode
        setSelectedRecipe(editSelectedRecipe);
      }
    }
  }, [isOpen, mode, editSelectedRecipe]);

  const handleClose = () => {
    setSelectedRecipe(null);
    setShowRecipeSelectionModal(false);
    onClose();
  };

  const handleRecipeSelect = (recipe: any) => {
    setSelectedRecipe(recipe);
    if (mode === 'edit' && setEditSelectedRecipe) {
      setEditSelectedRecipe(recipe);
    }
  };

  const handleAddRecipe = async () => {
    if (selectedRecipe && onAddRecipe) {
      await onAddRecipe(selectedRecipe);
    }
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

  const getModalTitle = () => {
    if (mode === 'add') {
      return `Ajouter une recette - ${selectedSlot ? `${DAYS[selectedSlot.day]} ${selectedSlot.mealType}` : ''}`;
    }
    return 'Modifier le repas';
  };

  const getModalSubtitle = () => {
    if (mode === 'edit' && editingMealPlan) {
      const mealDate = new Date(editingMealPlan.mealDate);
      const dayOfWeek = mealDate.getDay() === 0 ? 6 : mealDate.getDay() - 1; // Convert Sunday=0 to Monday=0 format
      return `${DAYS[dayOfWeek]} ${getMealTypeLabel(editingMealPlan.mealType)}`;
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col mx-4">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {mode === 'edit' && <Edit className="h-5 w-5" />}
            {getModalTitle()}
            {getModalSubtitle() && (
              <span className="text-sm text-gray-500 font-normal">
                - {getModalSubtitle()}
              </span>
            )}
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

          {/* Recipe Selection Section */}
          <div className={mode === 'edit' ? "border-t pt-4" : ""}>
            {mode === 'edit' && <h4 className="font-medium text-sm mb-2">Changer de recette</h4>}

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-sm mb-2 text-blue-800">
                {mode === 'add' ? 'Choisir une recette' : 'Recette sélectionnée'}
              </h4>

              {selectedRecipe ? (
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                    {selectedRecipe.imageUrl ? (
                      <img
                        src={selectedRecipe.imageUrl}
                        alt={selectedRecipe.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ChefHat className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-blue-900">{selectedRecipe.title}</div>
                    <div className="space-y-1 mt-1">
                      {/* Recipe Types */}
                      {selectedRecipe.types && selectedRecipe.types.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedRecipe.types.slice(0, 3).map((recipeType: any) => (
                            <RecipeTypeBadge
                              key={recipeType.id}
                              type={recipeType.type as keyof typeof RECIPE_TYPES}
                              size="sm"
                            />
                          ))}
                          {selectedRecipe.types.length > 3 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                              +{selectedRecipe.types.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Recipe Info */}
                      <div className="flex items-center space-x-2 text-xs text-blue-600">
                        {selectedRecipe.prepTime && <span className="bg-blue-100 px-2 py-1 rounded">{selectedRecipe.prepTime}min</span>}
                        {selectedRecipe.servings && <span className="bg-blue-100 px-2 py-1 rounded">{selectedRecipe.servings} pers.</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link href={`/recettes/${selectedRecipe.id}`} target="_blank">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <ChefHat className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Aucune recette sélectionnée</p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRecipeSelectionModal(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                {selectedRecipe ? 'Changer de recette' : 'Choisir une recette'}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t flex justify-between">
            {mode === 'add' ? (
              <div className="flex space-x-2 w-full">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Annuler
                </Button>
                <Button
                  disabled={!selectedRecipe || popupSelectedMealUsers.length === 0 || isLoading}
                  className="bg-orange-600 hover:bg-orange-700 flex-1"
                  onClick={handleAddRecipe}
                >
                  {isLoading ? 'Ajout...' : 'Ajouter le repas'}
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => {
                    showAlert(
                      'Supprimer le repas',
                      'Êtes-vous sûr de vouloir supprimer ce repas du planning ?',
                      'warning',
                      {
                        confirmText: 'Supprimer',
                        cancelText: 'Annuler',
                        onConfirm: () => {
                          if (editingMealPlan && onDelete) {
                            onDelete(editingMealPlan.id);
                          }
                        }
                      }
                    );
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
                    disabled={!selectedRecipe || popupSelectedMealUsers.length === 0}
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={onUpdate}
                  >
                    Modifier
                  </Button>
                </div>
              </>
            )}
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

      {/* Recipe Selection Modal */}
      <RecipeSelectionModal
        isOpen={showRecipeSelectionModal}
        onClose={() => setShowRecipeSelectionModal(false)}
        onSelectRecipe={handleRecipeSelect}
        mealType={getMealTypeFromSlot()}
        currentRecipeId={mode === 'edit' ? editSelectedRecipe?.id : undefined}
        title={mode === 'add' ? 'Choisir une recette' : 'Changer de recette'}
      />

      {mode === 'edit' && <AlertDialogComponent />}
    </Dialog>
  );
}