'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, ChefHat, Clock } from "lucide-react";
import { MealType } from "@prisma/client";
import { DAYS_OF_WEEK, MEAL_TYPES_LABELS } from "@/types/default-slot-settings";

interface DefaultSlotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: {day: number, mealType: MealType} | null;
  mealUsers: any[];
  defaultSetting?: {
    defaultAssignments: Array<{mealUserId: string}>;
    defaultCookResponsibleId?: string | null;
  } | null;
  onSave: (mealUserIds: string[], cookResponsibleId?: string) => Promise<void>;
  isLoading: boolean;
}

export default function DefaultSlotConfigModal({
  isOpen,
  onClose,
  selectedSlot,
  mealUsers,
  defaultSetting,
  onSave,
  isLoading
}: DefaultSlotConfigModalProps) {
  const [selectedMealUsers, setSelectedMealUsers] = useState<string[]>([]);
  const [cookResponsibleId, setCookResponsibleId] = useState<string>('');

  // Initialize with existing settings when modal opens
  useEffect(() => {
    if (isOpen && defaultSetting) {
      const currentMealUsers = defaultSetting.defaultAssignments?.map(a => a.mealUserId) || [];
      setSelectedMealUsers(currentMealUsers);
      setCookResponsibleId(defaultSetting.defaultCookResponsibleId || '');
    } else if (isOpen) {
      // Reset for new settings
      setSelectedMealUsers([]);
      setCookResponsibleId('');
    }
  }, [isOpen, defaultSetting]);

  const handleClose = () => {
    setSelectedMealUsers([]);
    setCookResponsibleId('');
    onClose();
  };

  const handleSave = async () => {
    await onSave(selectedMealUsers, cookResponsibleId || undefined);
    handleClose();
  };

  const handleMealUserToggle = (userId: string) => {
    const isSelected = selectedMealUsers.includes(userId);
    if (isSelected) {
      setSelectedMealUsers(selectedMealUsers.filter(id => id !== userId));
      // If removing the cook responsible, clear it
      if (cookResponsibleId === userId) {
        setCookResponsibleId('');
      }
    } else {
      setSelectedMealUsers([...selectedMealUsers, userId]);
    }
  };

  if (!selectedSlot) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Configuration par défaut - {DAYS_OF_WEEK[selectedSlot.day]} {MEAL_TYPES_LABELS[selectedSlot.mealType]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Participants Selection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">Qui participe par défaut ?</h4>
            </div>
            <p className="text-sm text-gray-600">
              Sélectionnez les profils qui participeront automatiquement à ce créneau.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mealUsers.map(mealUser => {
                const isSelected = selectedMealUsers.includes(mealUser.id);
                return (
                  <div
                    key={mealUser.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white hover:border-orange-200'
                    }`}
                    onClick={() => handleMealUserToggle(mealUser.id)}
                  >
                    <div className="flex items-center justify-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                        isSelected ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {mealUser.pseudo.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-sm font-medium truncate">{mealUser.pseudo}</div>
                      {isSelected && (
                        <div className="text-xs text-orange-600 mt-1">✓ Sélectionné</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedMealUsers.length === 0 && (
              <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun participant sélectionné</p>
                <p className="text-xs text-gray-400 mt-1">Cliquez sur les profils pour les sélectionner</p>
              </div>
            )}
          </div>

          {/* Cook Responsible Selection */}
          {selectedMealUsers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Qui cuisine par défaut ? (optionnel)</h4>
              </div>
              <p className="text-sm text-gray-600">
                Choisissez qui sera automatiquement désigné comme responsable de cuisine.
              </p>

              <div className="space-y-2">
                <label className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="cookResponsible"
                    value=""
                    checked={cookResponsibleId === ''}
                    onChange={() => setCookResponsibleId('')}
                    className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Aucun responsable défini</span>
                </label>

                {mealUsers
                  .filter(mealUser => selectedMealUsers.includes(mealUser.id))
                  .map(mealUser => (
                    <label
                      key={mealUser.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="radio"
                        name="cookResponsible"
                        value={mealUser.id}
                        checked={cookResponsibleId === mealUser.id}
                        onChange={() => setCookResponsibleId(mealUser.id)}
                        className="w-4 h-4 text-orange-600 border-gray-300 focus:ring-orange-500"
                      />
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">👨‍🍳</span>
                        <span className="text-sm font-medium">{mealUser.pseudo}</span>
                      </div>
                    </label>
                  ))
                }
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedMealUsers.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h5 className="font-medium text-blue-800 mb-2">Résumé de la configuration</h5>
              <div className="space-y-1 text-sm text-blue-700">
                <div>
                  <strong>Participants :</strong> {selectedMealUsers.length} personne{selectedMealUsers.length > 1 ? 's' : ''}
                  ({mealUsers.filter(mu => selectedMealUsers.includes(mu.id)).map(mu => mu.pseudo).join(', ')})
                </div>
                {cookResponsibleId && (
                  <div>
                    <strong>Responsable cuisine :</strong> {mealUsers.find(mu => mu.id === cookResponsibleId)?.pseudo}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}